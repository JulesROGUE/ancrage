import { Button, Card, EmptyState, Icon, IconButton } from '../m3/index.jsx';
import { addDays, diffDays, formatDow, formatShort, relative } from '../lib/dates.js';
import { RATINGS, calendarEvents, daysUntil, status, stepLabel, streak } from '../lib/schedule.js';
import ProgressRing from '../components/ProgressRing.jsx';
import StepDots from '../components/StepDots.jsx';

function ReviewCard({ chapter, subject, steps, today, onRate, onPostpone }) {
  const late = chapter.due < today;
  return (
    <article className={`review-card tone-${subject.tone}`}>
      <span className="review-card__icon"><Icon name={subject.icon} /></span>
      <div className="review-card__body">
        <div className="review-card__title title-medium">{chapter.title}</div>
        <div className="review-card__meta body-medium">
          <span className="subject-tag">{subject.name}</span>
          <span>Passage {Math.min(chapter.done + 1, steps.length)}/{steps.length} · {stepLabel(steps, chapter.done)}</span>
          {late && <span className="late-tag"><Icon name="schedule" size={16} />en retard de {diffDays(chapter.due, today)} j</span>}
        </div>
        <StepDots done={chapter.done} total={steps.length} />
      </div>
      <div className="review-card__actions">
        <IconButton icon="event_upcoming" label="Reporter à demain" onClick={() => onPostpone(chapter)} />
        <Button variant="outlined" onClick={() => onRate(chapter, 'again')} title={RATINGS.again.hint}>{RATINGS.again.label}</Button>
        <Button variant="tonal" onClick={() => onRate(chapter, 'good')} title={RATINGS.good.hint}>{RATINGS.good.label}</Button>
        <Button variant="filled" onClick={() => onRate(chapter, 'easy')} title={RATINGS.easy.hint}>{RATINGS.easy.label}</Button>
      </div>
    </article>
  );
}

function WeekStrip({ chapters, steps, today, limit }) {
  const end = addDays(today, 6);
  const events = calendarEvents(chapters, steps, today, end, today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const counts = days.map((d) => (events.get(d) || []).filter((e) => e.kind === 'planned').length);
  const max = Math.max(limit, ...counts, 1);
  return (
    <div className="week-strip" aria-label="Révisions prévues sur 7 jours">
      {days.map((d, i) => (
        <div key={d} className={`week-strip__day${counts[i] > limit ? ' is-over' : ''}${i === 0 ? ' is-today' : ''}`}>
          <span className="label-medium week-strip__count">{counts[i] || ''}</span>
          <span className="week-strip__bar"><span style={{ height: `${(counts[i] / max) * 100}%` }} /></span>
          <span className="label-small m3-muted">{i === 0 ? 'Auj.' : formatDow(d)}</span>
        </div>
      ))}
    </div>
  );
}

export default function TodayView({ today, subjects, chapters, steps, settings, subjectOf, onRate, onPostpone, onAdd, onGo }) {
  if (!chapters.length) {
    return (
      <div className="empty-wrap">
        <EmptyState
          icon="anchor"
          title="Ancrez votre premier chapitre"
          action={<Button icon="add" onClick={onAdd}>Ajouter un chapitre</Button>}
        >
          Notez le cours que vous venez d'étudier : Ancrage vous le rappellera à J+1, J+3, J+7… juste avant de l'oublier.
          Tout reste sur cet ordinateur.
        </EmptyState>
      </div>
    );
  }

  const sortDue = (a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title);
  const late = chapters.filter((c) => status(c, today) === 'late').sort(sortDue);
  const due = chapters.filter((c) => status(c, today) === 'today').sort(sortDue);
  const doneToday = chapters.filter((c) => c.history.some((h) => h.date === today));
  const total = late.length + due.length + doneToday.length;
  const next = chapters.filter((c) => c.due && c.due > today).sort(sortDue)[0];
  const exams = subjects
    .filter((s) => s.examDate && s.examDate >= today)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
    .slice(0, 3);
  const days = streak(chapters, today);
  const card = (c) => (
    <ReviewCard key={c.id} chapter={c} subject={subjectOf(c.subjectId)} steps={steps} today={today} onRate={onRate} onPostpone={onPostpone} />
  );

  return (
    <div className="split">
      <section className="split__main m3-stack">
        {late.length > 0 && (
          <div className="m3-stack queue">
            <h2 className="section-title title-small is-late"><Icon name="history" size={20} />En retard · {late.length}</h2>
            {late.map(card)}
          </div>
        )}
        {due.length > 0 && (
          <div className="m3-stack queue">
            <h2 className="section-title title-small"><Icon name="event_available" size={20} />À réviser aujourd'hui · {due.length}</h2>
            {due.map(card)}
          </div>
        )}
        {!late.length && !due.length && (
          <Card variant="outlined" className="all-clear">
            <EmptyState icon="task_alt" title={doneToday.length ? 'Tout est fait pour aujourd’hui' : 'Rien à réviser aujourd’hui'}>
              {next
                ? `Prochain passage ${relative(next.due, today)} : « ${next.title} » (${formatShort(next.due)}).`
                : 'Tous vos chapitres sont ancrés. Ajoutez le prochain cours dès que vous l’avez vu.'}
            </EmptyState>
          </Card>
        )}
        {doneToday.length > 0 && (
          <div className="m3-stack queue">
            <h2 className="section-title title-small is-done"><Icon name="done_all" size={20} />Déjà fait aujourd'hui · {doneToday.length}</h2>
            <div className="done-list">
              {doneToday.map((c) => {
                const h = [...c.history].reverse().find((x) => x.date === today);
                const s = subjectOf(c.subjectId);
                return (
                  <div key={c.id} className={`done-row tone-${s.tone}`}>
                    <Icon name={RATINGS[h.rating].icon} size={20} />
                    <span className="done-row__title body-medium">{c.title}</span>
                    <span className="label-medium m3-muted">{RATINGS[h.rating].label}</span>
                    <span className="label-medium done-row__next">{c.due ? `revient ${relative(c.due, today)}` : 'ancré'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <aside className="split__side m3-stack">
        <Card variant="filled" className="side-card">
          <div className="ring-row">
            <ProgressRing value={total ? doneToday.length / total : 1} size={96}>
              <span className="headline-small">{doneToday.length}</span>
              <span className="label-small m3-muted">sur {total}</span>
            </ProgressRing>
            <div className="m3-stack ring-text">
              <div className="title-medium">{late.length + due.length ? `${late.length + due.length} passage${late.length + due.length > 1 ? 's' : ''} à faire` : 'Journée bouclée'}</div>
              <div className="body-medium m3-muted streak">
                <Icon name="local_fire_department" size={20} filled />
                {days ? `Série de ${days} jour${days > 1 ? 's' : ''}` : 'Pas encore de série'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="outlined" className="side-card">
          <div className="side-card__head">
            <span className="title-small">7 prochains jours</span>
            <Button variant="text" onClick={() => onGo('planning')}>Planning</Button>
          </div>
          <WeekStrip chapters={chapters} steps={steps} today={today} limit={settings.dailyLimit || 8} />
          <div className="body-small m3-muted">Les barres rouges dépassent votre limite de {settings.dailyLimit || 8} passages par jour.</div>
        </Card>

        <Card variant="outlined" className="side-card">
          <div className="side-card__head">
            <span className="title-small">Prochains examens</span>
            <Button variant="text" onClick={() => onGo('matieres')}>Matières</Button>
          </div>
          {exams.length ? (
            <ul className="exam-list">
              {exams.map((s) => {
                const n = daysUntil(s.examDate, today);
                return (
                  <li key={s.id} className={`tone-${s.tone}`}>
                    <span className="exam-list__icon"><Icon name={s.icon} size={20} /></span>
                    <span className="exam-list__name body-medium">{s.name}</span>
                    <span className={`exam-list__days label-large${n <= 7 ? ' is-soon' : ''}`}>{n === 0 ? "aujourd'hui" : `J-${n}`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="body-medium m3-muted">Ajoutez une date d'examen à une matière pour voir le compte à rebours.</div>
          )}
        </Card>
      </aside>
    </div>
  );
}
