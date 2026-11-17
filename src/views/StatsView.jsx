import { Button, Card, EmptyState, Icon } from '../m3/index.jsx';
import { addDays, formatShort, fromKey } from '../lib/dates.js';
import { RATINGS, streak } from '../lib/schedule.js';

const WEEKS = 20;

function Heatmap({ counts, today }) {
  const d = fromKey(today);
  const offset = (d.getDay() + 6) % 7;
  const start = addDays(today, -offset - (WEEKS - 1) * 7);
  const max = Math.max(1, ...counts.values());
  const cols = [];
  for (let w = 0; w < WEEKS; w++) {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const key = addDays(start, w * 7 + i);
      const n = counts.get(key) || 0;
      const level = key > today ? -1 : n === 0 ? 0 : Math.ceil((n / max) * 4);
      cells.push(<span key={key} className={`heat__cell lvl-${level}`} title={`${formatShort(key)} : ${n} passage${n > 1 ? 's' : ''}`} />);
    }
    cols.push(<div key={w} className="heat__col">{cells}</div>);
  }
  return (
    <div className="heat">
      <div className="heat__days label-small m3-muted"><span>Lun</span><span /><span>Mer</span><span /><span>Ven</span><span /><span>Dim</span></div>
      <div className="heat__grid">{cols}</div>
    </div>
  );
}

function Tile({ icon, value, label, sub }) {
  return (
    <Card variant="filled" className="tile">
      <div className="tile__top">
        <div className="display-small tile__value">{value}</div>
        <Icon name={icon} className="tile__icon" />
      </div>
      <div className="label-large">{label}</div>
      {sub && <div className="body-small m3-muted">{sub}</div>}
    </Card>
  );
}

export default function StatsView({ today, subjects, chapters, steps, onGo }) {
  const history = chapters.flatMap((c) => c.history.map((h) => ({ ...h, chapter: c })));
  if (!history.length) {
    return (
      <EmptyState icon="insights" title="Pas encore de bilan" action={<Button variant="tonal" onClick={() => onGo('aujourdhui')}>Voir les révisions du jour</Button>}>
        Votre activité s'affichera ici après votre premier passage.
      </EmptyState>
    );
  }
  const counts = new Map();
  for (const h of history) counts.set(h.date, (counts.get(h.date) || 0) + 1);
  const since = addDays(today, -29);
  const last30 = history.filter((h) => h.date >= since);
  const again = last30.filter((h) => h.rating === 'again').length;
  const anchored = chapters.filter((c) => !c.due).length;
  const days = streak(chapters, today);
  const activeDays = [...counts.keys()].filter((d) => d >= since).length;
  const byRating = Object.keys(RATINGS).map((r) => ({ r, n: last30.filter((h) => h.rating === r).length }));
  const maxRating = Math.max(1, ...byRating.map((x) => x.n));

  const againRate = last30.length ? again / last30.length : 0;
  const insight = !last30.length
    ? 'Aucun passage ces 30 derniers jours : reprenez par les chapitres en retard.'
    : againRate > 0.25
      ? 'Beaucoup de « À revoir » : essayez le rythme Intensif ou découpez les chapitres trop longs.'
      : againRate < 0.05
        ? 'Presque tout est acquis : le rythme Long terme vous ferait gagner du temps.'
        : 'Bon équilibre : les passages tombent juste avant l’oubli. Gardez ce rythme.';

  const perSubject = subjects.map((s) => {
    const list = chapters.filter((c) => c.subjectId === s.id);
    const done = list.reduce((n, c) => n + Math.min(c.done, steps.length), 0);
    const total = list.length * steps.length;
    const hard = history.filter((h) => h.chapter.subjectId === s.id && h.rating === 'again').length;
    return { s, list, done, total, hard };
  }).filter((x) => x.list.length);

  return (
    <div className="m3-stack stats">
      <div className="tiles">
        <Tile icon="local_fire_department" value={days} label={days > 1 ? 'jours de série' : 'jour de série'} sub={`${activeDays} jours actifs sur les 30 derniers`} />
        <Tile icon="repeat" value={last30.length} label="passages en 30 jours" sub={`${history.length} depuis le début`} />
        <Tile icon="anchor" value={anchored} label={anchored > 1 ? 'chapitres ancrés' : 'chapitre ancré'} sub={`sur ${chapters.length} au total`} />
        <Tile icon="replay" value={`${Math.round(againRate * 100)} %`} label="de « À revoir »" sub="sur les 30 derniers jours" />
      </div>

      <div className="stats-row">
        <Card variant="outlined" className="side-card heat-card">
          <div className="side-card__head"><span className="title-small">Activité des {WEEKS} dernières semaines</span></div>
          <Heatmap counts={counts} today={today} />
          <div className="heat-legend label-small m3-muted">
            Moins <span className="heat__cell lvl-0" /><span className="heat__cell lvl-1" /><span className="heat__cell lvl-2" /><span className="heat__cell lvl-3" /><span className="heat__cell lvl-4" /> Plus
          </div>
        </Card>
        <Card variant="outlined" className="side-card ratings-card">
          <div className="title-small">Ressenti (30 jours)</div>
          {byRating.map(({ r, n }) => (
            <div key={r} className={`rating-bar rating-${r}`}>
              <Icon name={RATINGS[r].icon} size={20} />
              <span className="body-medium rating-bar__label">{RATINGS[r].label}</span>
              <span className="rating-bar__track"><span style={{ width: `${(n / maxRating) * 100}%` }} /></span>
              <span className="label-large rating-bar__n">{n}</span>
            </div>
          ))}
          <div className="insight body-medium">
            <Icon name="lightbulb" size={20} />
            <span>{insight}</span>
          </div>
        </Card>
      </div>

      <Card variant="outlined" className="side-card">
        <div className="title-small">Avancement par matière</div>
        <div className="subject-bars">
          {perSubject.map(({ s, list, done, total, hard }) => (
            <div key={s.id} className={`subject-bar tone-${s.tone}`}>
              <span className="subject-bar__icon"><Icon name={s.icon} size={20} /></span>
              <span className="subject-bar__name body-medium">{s.name}</span>
              <span className="subject-bar__track"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
              <span className="label-medium subject-bar__value">{done}/{total} passages</span>
              <span className="label-medium m3-muted subject-bar__hard">{hard ? `${hard} à revoir` : `${list.length} chap.`}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
