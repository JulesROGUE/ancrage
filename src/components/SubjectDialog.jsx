import { useState } from 'react';
import { Button, Dialog, Icon, TextField } from '../m3/index.jsx';
import { SUBJECT_ICONS, TONES } from '../lib/subjects.js';

export default function SubjectDialog({ subject, count, nextTone, onSave, onDelete, onClose }) {
  const [name, setName] = useState(subject?.name || '');
  const [icon, setIcon] = useState(subject?.icon || 'menu_book');
  const [tone, setTone] = useState(subject?.tone ?? nextTone);
  const [examDate, setExamDate] = useState(subject?.examDate || '');
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = (e) => {
    e?.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSave({ ...(subject || {}), name: name.trim(), icon, tone, examDate });
  };

  return (
    <Dialog
      open
      headline={subject ? 'Modifier la matière' : 'Nouvelle matière'}
      onClose={onClose}
      actions={
        confirmDelete ? (
          <>
            <Button variant="text" onClick={() => setConfirmDelete(false)}>Garder</Button>
            <Button variant="danger" onClick={() => onDelete(subject)}>Supprimer</Button>
          </>
        ) : (
          <>
            {subject && <Button variant="text" icon="delete" className="dialog-delete" onClick={() => setConfirmDelete(true)}>Supprimer</Button>}
            <Button variant="text" onClick={onClose}>Annuler</Button>
            <Button onClick={submit}>{subject ? 'Enregistrer' : 'Créer'}</Button>
          </>
        )
      }
    >
      {confirmDelete ? (
        <div className="body-medium">
          Supprimer « {subject.name} » et {count ? `ses ${count} chapitre(s)` : 'la matière'} ? Vous pourrez annuler juste après.
        </div>
      ) : (
        <form className="m3-stack" onSubmit={submit}>
          <TextField label="Nom de la matière" value={name} onChange={setName} autoFocus error={touched && !name.trim() ? 'Donnez un nom à la matière.' : undefined} />
          <TextField label="Date d'examen (facultatif)" type="date" value={examDate} onChange={setExamDate}
            supportingText="Ancrage vous dira combien de chapitres seront revus à temps." />
          <div className="m3-stack picker">
            <span className="label-large">Couleur</span>
            <div className="tone-picker" role="radiogroup" aria-label="Couleur">
              {TONES.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={tone === t} aria-label={`Couleur ${t + 1}`}
                  className={`tone-swatch tone-${t}${tone === t ? ' is-selected' : ''}`} onClick={() => setTone(t)}>
                  {tone === t && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
            <span className="label-large">Icône</span>
            <div className="icon-picker" role="radiogroup" aria-label="Icône">
              {SUBJECT_ICONS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={icon === n} aria-label={n}
                  className={`icon-choice tone-${tone}${icon === n ? ' is-selected' : ''}`} onClick={() => setIcon(n)}>
                  <Icon name={n} size={20} />
                </button>
              ))}
            </div>
          </div>
          <button type="submit" hidden />
        </form>
      )}
    </Dialog>
  );
}
