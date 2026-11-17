import { useState } from 'react';
import { Button, Dialog, Icon, TextField } from '../m3/index.jsx';
import { addDays, formatShort } from '../lib/dates.js';
import { stepLabel } from '../lib/schedule.js';
import StepDots from './StepDots.jsx';

const NEW = '__new__';

export default function ChapterDialog({ chapter, defaultSubjectId, subjects, steps, today, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(chapter?.title || '');
  const [subjectId, setSubjectId] = useState(chapter?.subjectId || defaultSubjectId || subjects[0]?.id || NEW);
  const [newSubject, setNewSubject] = useState('');
  const [learnedAt, setLearnedAt] = useState(chapter?.learnedAt || today);
  const [touched, setTouched] = useState(false);
  const started = chapter && (chapter.done > 0 || chapter.history.length > 0);

  const titleError = touched && !title.trim() ? 'Donnez un titre au chapitre.' : undefined;
  const subjectError = touched && subjectId === NEW && !newSubject.trim() ? 'Nommez la nouvelle matière.' : undefined;
  const dateError = learnedAt > today ? "La date d'étude ne peut pas être dans le futur." : !learnedAt ? 'Choisissez une date.' : undefined;
  const preview = steps.slice(0, 4).map((n) => addDays(learnedAt || today, n));

  const submit = (e) => {
    e?.preventDefault();
    setTouched(true);
    if (!title.trim() || (subjectId === NEW && !newSubject.trim()) || dateError) return;
    onSave({ id: chapter?.id, title, subjectId: subjectId === NEW ? null : subjectId, newSubject: subjectId === NEW ? newSubject : null, learnedAt });
  };

  return (
    <Dialog
      open
      headline={chapter ? 'Modifier le chapitre' : 'Nouveau chapitre'}
      onClose={onClose}
      actions={
        <>
          {chapter && <Button variant="text" icon="delete" className="dialog-delete" onClick={() => onDelete(chapter)}>Supprimer</Button>}
          <Button variant="text" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>{chapter ? 'Enregistrer' : 'Ajouter'}</Button>
        </>
      }
    >
      <form className="m3-stack" onSubmit={submit}>
        <TextField label="Titre du chapitre" value={title} onChange={setTitle} error={titleError} autoFocus placeholder="ex. Les jointures SQL" />
        <TextField
          label="Matière"
          value={subjectId}
          onChange={setSubjectId}
          options={[...subjects.map((s) => ({ value: s.id, label: s.name })), { value: NEW, label: '+ Nouvelle matière…' }]}
        />
        {subjectId === NEW && <TextField label="Nom de la nouvelle matière" value={newSubject} onChange={setNewSubject} error={subjectError} />}
        <TextField
          label="Étudié le"
          type="date"
          value={learnedAt}
          onChange={setLearnedAt}
          error={dateError}
          disabled={started}
          supportingText={started ? 'Le chapitre a déjà des passages : sa date de départ est figée.' : 'Le jour où vous avez vu le cours (J0).'}
          inputProps={{ max: today }}
        />
        {chapter && started ? (
          <div className="dialog-info body-medium">
            <StepDots done={chapter.done} total={steps.length} />
            <span>{chapter.due ? `${chapter.done} passage(s) faits · prochain : ${stepLabel(steps, chapter.done)} le ${formatShort(chapter.due)}` : 'Chapitre ancré : tous les passages sont faits.'}</span>
          </div>
        ) : (
          !dateError && (
            <div className="dialog-info body-medium">
              <Icon name="event_repeat" size={20} />
              <span>Passages prévus : {preview.map((d, i) => `${stepLabel(steps, i)} ${formatShort(d)}`).join(' · ')}{steps.length > 4 ? '…' : ''}</span>
            </div>
          )
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
