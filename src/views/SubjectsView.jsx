import { useState } from 'react';
import { Button, EmptyState, Icon, IconButton, LinearProgress, SearchBar } from '../m3/index.jsx';
import { formatShort, relative } from '../lib/dates.js';
import { daysUntil, readyBefore, status } from '../lib/schedule.js';
import StepDots from '../components/StepDots.jsx';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ChapterRow({ chapter, steps, today, onEdit }) {
  const st = status(chapter, today);
  const label = st === 'anchored' ? 'Ancré' : st === 'late' ? 'En retard' : st === 'today' ? "Aujourd'hui" : relative(chapter.due, today);
  return (
    <li>
      <button type="button" className="chapter-row" onClick={() => onEdit(chapter)} title="Modifier le chapitre">
        <span className="chapter-row__title body-medium">{chapter.title}</span>
        <StepDots done={chapter.done} total={steps.length} small />
        <span className={`chapter-row__when label-medium is-${st}`}>
          {st === 'anchored' && <Icon name="anchor" size={14} />}
          {label}
        </span>
      </button>
    </li>
  );
}

function SubjectCard({ subject, chapters, steps, today, onEdit, onAddChapter, onEditChapter }) {
  const anchored = chapters.filter((c) => !c.due).length;
  const passes = chapters.reduce((n, c) => n + Math.min(c.done, steps.length), 0);
  const progress = chapters.length ? passes / (chapters.length * steps.length) : 0;
  const exam = subject.examDate && subject.examDate >= today ? daysUntil(subject.examDate, today) : null;
  const ready = exam !== null ? chapters.filter((c) => readyBefore(c, steps, subject.examDate, today)).length : 0;
  const order = { late: 0, today: 1, upcoming: 2, anchored: 3 };
  const sorted = [...chapters].sort((a, b) => order[status(a, today)] - order[status(b, today)] || (a.due || '').localeCompare(b.due || ''));

  return (
    <article className={`subject-card tone-${subject.tone}`}>
      <header className="subject-card__head">
        <span className="subject-card__icon"><Icon name={subject.icon} /></span>
        <div className="subject-card__titles">
          <div className="title-medium subject-card__name">{subject.name}</div>
          <div className="body-small m3-muted">
            {chapters.length} chapitre{chapters.length > 1 ? 's' : ''} · {anchored} ancré{anchored > 1 ? 's' : ''}
          </div>
        </div>
        <IconButton icon="edit" label={`Modifier ${subject.name}`} onClick={() => onEdit(subject)} />
      </header>

      {exam !== null && (
        <div className={`exam-banner${exam <= 7 ? ' is-soon' : ''}`}>
          <Icon name="event" size={20} />
          <span className="body-medium">Examen le {formatShort(subject.examDate)} · <strong>J-{exam}</strong></span>
          <span className="label-medium exam-banner__ready">{ready}/{chapters.length} prêts</span>
        </div>
      )}

      <div className="subject-card__progress">
        <LinearProgress value={progress} />
        <span className="label-small m3-muted">{Math.round(progress * 100)} %</span>
      </div>

      {sorted.length ? (
        <ul className="chapter-list">
          {sorted.map((c) => <ChapterRow key={c.id} chapter={c} steps={steps} today={today} onEdit={onEditChapter} />)}
        </ul>
      ) : (
        <div className="body-medium m3-muted subject-card__empty">Aucun chapitre pour l'instant.</div>
      )}
      <div className="subject-card__foot">
        <Button variant="text" icon="add" onClick={() => onAddChapter(subject.id)}>Ajouter un chapitre</Button>
      </div>
    </article>
  );
}

export default function SubjectsView({ today, subjects, chapters, steps, onAddSubject, onEditSubject, onAddChapter, onEditChapter }) {
  const [query, setQuery] = useState('');
  if (!subjects.length) {
    return (
      <EmptyState icon="menu_book" title="Aucune matière" action={<Button icon="add" onClick={onAddSubject}>Créer une matière</Button>}>
        Regroupez vos chapitres par matière et indiquez la date d'examen : Ancrage vous dira si tout sera revu à temps.
      </EmptyState>
    );
  }
  const q = norm(query.trim());
  const visible = subjects
    .map((s) => ({ s, list: chapters.filter((c) => c.subjectId === s.id && (!q || norm(c.title).includes(q) || norm(s.name).includes(q))) }))
    .filter(({ s, list }) => !q || list.length || norm(s.name).includes(q));

  return (
    <div className="m3-stack">
      <div className="subjects-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Rechercher un chapitre ou une matière" />
        <Button variant="tonal" icon="create_new_folder" onClick={onAddSubject}>Nouvelle matière</Button>
      </div>
      {visible.length ? (
        <div className="subjects-grid">
          {visible.map(({ s, list }) => (
            <SubjectCard key={s.id} subject={s} chapters={list} steps={steps} today={today}
              onEdit={onEditSubject} onAddChapter={onAddChapter} onEditChapter={onEditChapter} />
          ))}
        </div>
      ) : (
        <EmptyState icon="search_off" title="Aucun résultat">Aucun chapitre ne correspond à « {query} ».</EmptyState>
      )}
    </div>
  );
}
