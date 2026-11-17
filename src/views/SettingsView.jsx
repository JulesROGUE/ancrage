import { useState } from 'react';
import { Button, Card, Chip, ChipSet, Dialog, Icon, SegmentedButton, Slider, TextField } from '../m3/index.jsx';
import { saveTextFile, openTextFile } from '../lib/files.js';
import { todayKey } from '../lib/dates.js';
import { PRESETS, RATINGS, parseSteps } from '../lib/schedule.js';

const FORMAT = 'ancrage/1';

function validImport(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.subjects) || !Array.isArray(data.chapters)) return false;
  const okSubject = (s) => s && typeof s.id === 'string' && typeof s.name === 'string';
  const okChapter = (c) => c && typeof c.id === 'string' && typeof c.title === 'string' && typeof c.learnedAt === 'string' && Array.isArray(c.history);
  return data.subjects.every(okSubject) && data.chapters.every(okChapter);
}

export default function SettingsView({ subjects, chapters, settings, steps, theme, onTheme, onSettings, onImport, onReset, notify }) {
  const [custom, setCustom] = useState(steps.join(', '));
  const [confirm, setConfirm] = useState(false);
  const parsed = parseSteps(custom);
  const preset = settings.preset || 'classique';

  const choosePreset = (p) => {
    if (p === 'perso') {
      onSettings((s) => ({ ...s, preset: 'perso' }));
      return;
    }
    onSettings((s) => ({ ...s, preset: p, steps: PRESETS[p].steps }));
    setCustom(PRESETS[p].steps.join(', '));
  };

  const exportData = async () => {
    const content = JSON.stringify({ format: FORMAT, exportedAt: new Date().toISOString(), subjects, chapters, settings }, null, 2);
    const res = await saveTextFile(`ancrage-sauvegarde-${todayKey()}.json`, content, [{ name: 'Sauvegarde Ancrage', extensions: ['json'] }]);
    if (res?.saved) notify('Sauvegarde exportée.');
  };

  const importData = async () => {
    try {
      const file = await openTextFile([{ name: 'Sauvegarde Ancrage', extensions: ['json'] }]);
      if (!file?.content) return;
      const data = JSON.parse(file.content);
      if (!validImport(data)) throw new Error('format');
      onImport(data);
    } catch {
      notify("Ce fichier n'est pas une sauvegarde Ancrage valide.");
    }
  };

  return (
    <div className="settings">
      <Card variant="outlined" className="side-card">
        <div className="settings__head"><Icon name="event_repeat" /><span className="title-medium">Rythme des passages</span></div>
        <SegmentedButton
          value={preset}
          onChange={choosePreset}
          options={[...Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })), { value: 'perso', label: 'Personnalisé' }]}
        />
        <ChipSet>
          {steps.map((n, i) => <Chip key={n} icon={i === steps.length - 1 ? 'anchor' : 'schedule'}>J+{n}</Chip>)}
        </ChipSet>
        <div className="body-medium m3-muted">
          {preset === 'perso' ? 'Vos propres intervalles, en jours après la première étude du chapitre.' : PRESETS[preset]?.hint}
        </div>
        {preset === 'perso' && (
          <div className="settings__custom">
            <TextField
              label="Intervalles (jours)"
              value={custom}
              onChange={setCustom}
              error={parsed ? undefined : 'Entre 1 et 10 nombres croissants, de 1 à 365, séparés par des virgules.'}
              supportingText="Exemple : 1, 3, 7, 14, 30"
            />
            <Button disabled={!parsed} onClick={() => { onSettings((s) => ({ ...s, steps: parsed })); notify('Rythme personnalisé enregistré.'); }}>Appliquer</Button>
          </div>
        )}
        <div className="body-small m3-muted">Un changement de rythme s'applique aux prochains passages ; les dates déjà prévues restent en place.</div>
      </Card>

      <Card variant="filled" className="side-card settings__method">
        <div className="settings__head"><Icon name="anchor" /><span className="title-medium">Comment ça marche</span></div>
        <div className="body-medium m3-muted">
          J0 : vous étudiez le chapitre. Ensuite, chaque passage est une relecture active (fiche, exercice, récitation)
          au rythme {steps.map((n) => `J+${n}`).join(', ')}. Après le dernier passage, le chapitre est ancré.
        </div>
        <ul className="method body-medium">
          {Object.entries(RATINGS).map(([key, r]) => (
            <li key={key}><span className={`method__badge is-${key}`}>{r.label}</span><span>{r.hint}</span></li>
          ))}
        </ul>
      </Card>

      <Card variant="outlined" className="side-card">
        <div className="settings__head"><Icon name="speed" /><span className="title-medium">Charge quotidienne</span></div>
        <div className="settings__slider">
          <Slider value={settings.dailyLimit || 8} min={3} max={20} label="Passages par jour" onChange={(v) => onSettings((s) => ({ ...s, dailyLimit: v }))} />
          <span className="title-medium">{settings.dailyLimit || 8}</span>
        </div>
        <div className="body-medium m3-muted">Au-delà de ce nombre de passages, le planning signale la journée pour vous aider à lisser l'effort.</div>
      </Card>

      <Card variant="outlined" className="side-card">
        <div className="settings__head"><Icon name="palette" /><span className="title-medium">Apparence</span></div>
        <SegmentedButton
          value={theme}
          onChange={onTheme}
          options={[{ value: 'system', label: 'Système' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]}
        />
      </Card>

      <Card variant="outlined" className="side-card">
        <div className="settings__head"><Icon name="shield_lock" /><span className="title-medium">Vos données</span></div>
        <div className="body-medium m3-muted">
          Tout est enregistré sur cet ordinateur : pas de compte, pas de serveur, aucune donnée envoyée.
          Exportez une sauvegarde pour changer de poste ou garder une copie.
        </div>
        <div className="m3-row">
          <Button variant="tonal" icon="download" onClick={exportData}>Exporter (.json)</Button>
          <Button variant="outlined" icon="upload" onClick={importData}>Importer</Button>
          <Button variant="text" icon="delete_forever" onClick={() => setConfirm(true)} disabled={!subjects.length && !chapters.length}>Tout effacer</Button>
        </div>
      </Card>

      <Dialog
        open={confirm}
        icon="delete_forever"
        headline="Effacer toutes les données ?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Button variant="text" onClick={() => setConfirm(false)}>Annuler</Button>
            <Button variant="danger" onClick={() => { onReset(); setConfirm(false); }}>Effacer</Button>
          </>
        }
      >
        {subjects.length} matière(s) et {chapters.length} chapitre(s) seront supprimés de cet ordinateur. Pensez à exporter une sauvegarde avant.
      </Dialog>
    </div>
  );
}
