import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Icon, IconButton } from '../m3/index.jsx';
import { formatLong, formatMonth, fromKey, monthGrid, relative } from '../lib/dates.js';
import { RATINGS, calendarEvents, stepLabel } from '../lib/schedule.js';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function PlanningView({ today, subjects, chapters, steps, settings, subjectOf, onOpenChapter }) {
  const [month, setMonth] = useState(() => { const d = fromKey(today); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today);
  const limit = settings.dailyLimit || 8;
  const weeks = useMemo(() => monthGrid(month), [month]);
  const from = weeks[0][0].key;
  const to = weeks[weeks.length - 1][6].key;
  const events = useMemo(() => calendarEvents(chapters, steps, from, to < selected ? selected : to, today), [chapters, steps, from, to, selected, today]);
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const dayEvents = events.get(selected) || [];
  const planned = dayEvents.filter((e) => e.kind === 'planned');
  const done = dayEvents.filter((e) => e.kind === 'done');
  const overloaded = [...events.entries()].filter(([d, list]) => d >= today && list.filter((e) => e.kind === 'planned').length > limit).length;

  if (!chapters.length) {
    return <EmptyState icon="calendar_month" title="Le planning est vide">Ajoutez un chapitre : ses passages J+1, J+3, J+7… apparaîtront ici.</EmptyState>;
  }

  return (
    <div className="split">
      <section className="split__main">
        <div className="cal-toolbar">
          <IconButton icon="chevron_left" label="Mois précédent" onClick={() => shift(-1)} />
          <IconButton icon="chevron_right" label="Mois suivant" onClick={() => shift(1)} />
          <span className="title-large cal-toolbar__month">{formatMonth(month)}</span>
          <Button variant="outlined" icon="today" onClick={() => { const d = fromKey(today); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(today); }}>
            Aujourd'hui
          </Button>
        </div>
        <div className="cal" role="grid" aria-label={`Planning ${formatMonth(month)}`}>
          {DOW.map((d) => <div key={d} className="cal__dow label-medium">{d}</div>)}
          {weeks.flat().map((day) => {
            const list = events.get(day.key) || [];
            const plannedHere = list.filter((e) => e.kind === 'planned');
            const doneHere = list.filter((e) => e.kind === 'done');
            const over = day.key >= today && plannedHere.length > limit;
            const cls = ['cal__day', !day.inMonth && 'is-out', day.key === today && 'is-today', day.key === selected && 'is-selected', over && 'is-over', day.key < today && 'is-past']
              .filter(Boolean).join(' ');
            return (
              <button key={day.key} type="button" className={cls} onClick={() => setSelected(day.key)} aria-label={`${formatLong(day.key)} : ${plannedHere.length} passage(s) prévu(s)`}>
                <span className="cal__num label-large">{day.day}</span>
                {day.key < today ? (
                  doneHere.length > 0 && <span className="cal__done label-small"><Icon name="check" size={14} />{doneHere.length} fait{doneHere.length > 1 ? 's' : ''}</span>
                ) : (
                  <span className="cal__events">
                    {plannedHere.slice(0, 2).map((e) => {
                      const s = subjectOf(e.chapter.subjectId);
                      return <span key={e.chapter.id + e.step} className={`cal__chip tone-${s.tone}${e.late ? ' is-late' : ''}`}>{e.chapter.title}</span>;
                    })}
                    {plannedHere.length > 2 && <span className="cal__more label-small">+{plannedHere.length - 2} autre{plannedHere.length > 3 ? 's' : ''}</span>}
                  </span>
                )}
                {over && <Icon name="warning" size={16} className="cal__warn" />}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="split__side m3-stack">
        <Card variant="filled" className="side-card">
          <div className="title-medium">{formatLong(selected)}</div>
          <div className="body-medium m3-muted">
            {selected === today ? "Aujourd'hui" : relative(selected, today).replace(/^./, (c) => c.toUpperCase())} · {planned.length} passage{planned.length > 1 ? 's' : ''} prévu{planned.length > 1 ? 's' : ''}
            {done.length > 0 && ` · ${done.length} fait${done.length > 1 ? 's' : ''}`}
          </div>
          {planned.length > limit && (
            <div className="warn-box body-medium"><Icon name="warning" size={20} />Journée chargée : avancez un chapitre la veille ou reportez-en un.</div>
          )}
          {planned.length + done.length === 0 ? (
            <div className="body-medium m3-muted day-empty">Aucun passage ce jour-là.</div>
          ) : (
            <ul className="day-list">
              {[...planned, ...done].map((e) => {
                const s = subjectOf(e.chapter.subjectId);
                return (
                  <li key={e.kind + e.chapter.id + e.step + (e.rating || '')}>
                    <button type="button" className={`day-item tone-${s.tone}`} onClick={() => onOpenChapter(e.chapter)}>
                      <span className="day-item__icon"><Icon name={e.kind === 'done' ? RATINGS[e.rating].icon : s.icon} size={20} /></span>
                      <span className="day-item__text">
                        <span className="body-medium day-item__title">{e.chapter.title}</span>
                        <span className="body-small m3-muted">
                          {s.name} · {stepLabel(steps, e.step)}{e.kind === 'done' ? ` · ${RATINGS[e.rating].label}` : e.late ? ' · en retard' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card variant="outlined" className="side-card">
          <div className="title-small">Légende</div>
          <div className="legend">
            {subjects.map((s) => (
              <span key={s.id} className={`legend__item tone-${s.tone}`}><span className="legend__dot" />{s.name}</span>
            ))}
          </div>
          <div className="body-small m3-muted">
            {overloaded
              ? `${overloaded} jour${overloaded > 1 ? 's' : ''} dépasse${overloaded > 1 ? 'nt' : ''} ${limit} passages ce mois-ci : ils sont signalés en rouge.`
              : `Aucun jour ne dépasse ${limit} passages : le rythme est tenable.`}
          </div>
        </Card>
      </aside>
    </div>
  );
}
