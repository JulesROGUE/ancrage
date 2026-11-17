import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAB, IconButton, NavigationRail, Snackbar, TopAppBar } from './m3/index.jsx';
import { usePersistentState } from './lib/storage.js';
import { getThemeMode, setThemeMode } from './lib/theme.js';
import { formatLong, formatShort, relative, todayKey } from './lib/dates.js';
import { DEFAULT_SETTINGS, newChapter, postpone, review, status, uid } from './lib/schedule.js';
import { subjectMap } from './lib/subjects.js';
import TodayView from './views/TodayView.jsx';
import PlanningView from './views/PlanningView.jsx';
import SubjectsView from './views/SubjectsView.jsx';
import StatsView from './views/StatsView.jsx';
import SettingsView from './views/SettingsView.jsx';
import ChapterDialog from './components/ChapterDialog.jsx';
import SubjectDialog from './components/SubjectDialog.jsx';
import './app.css';

const VIEWS = [
  { value: 'aujourdhui', label: "Aujourd'hui", icon: 'today', title: 'Révisions du jour' },
  { value: 'planning', label: 'Planning', icon: 'calendar_month', title: 'Planning des passages' },
  { value: 'matieres', label: 'Matières', icon: 'menu_book', title: 'Matières et chapitres' },
  { value: 'bilan', label: 'Bilan', icon: 'insights', title: 'Bilan' },
  { value: 'reglages', label: 'Réglages', icon: 'tune', title: 'Réglages' },
];

function readHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  return VIEWS.some((v) => v.value === h) ? h : 'aujourdhui';
}

function useHashView() {
  const [view, setView] = useState(readHash);
  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((v) => {
    if (location.hash !== `#${v}`) location.hash = v;
    setView(v);
  }, []);
  return [view, go];
}

/** Today's date, refreshed when the app stays open past midnight. */
function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const t = setInterval(() => setToday(todayKey()), 60000);
    return () => clearInterval(t);
  }, []);
  return today;
}

export default function App() {
  const [view, go] = useHashView();
  const today = useToday();
  const [subjects, setSubjects] = usePersistentState('ancrage.subjects', []);
  const [chapters, setChapters] = usePersistentState('ancrage.chapters', []);
  const [settings, setSettings] = usePersistentState('ancrage.settings', DEFAULT_SETTINGS);
  const [chapterDialog, setChapterDialog] = useState(null);
  const [subjectDialog, setSubjectDialog] = useState(null);
  const [snack, setSnack] = useState(null);
  const [theme, setTheme] = useState(getThemeMode);

  const steps = settings.steps?.length ? settings.steps : DEFAULT_SETTINGS.steps;
  const subjectOf = useMemo(() => subjectMap(subjects), [subjects]);
  const dueCount = chapters.filter((c) => ['late', 'today'].includes(status(c, today))).length;
  const current = VIEWS.find((v) => v.value === view);

  const notify = (message, undo) => setSnack({ message, undo, key: uid() });
  const closeSnack = useCallback(() => setSnack(null), []);

  const snapshot = () => {
    const prev = { subjects, chapters };
    return () => {
      setSubjects(prev.subjects);
      setChapters(prev.chapters);
    };
  };

  const updateChapter = (id, fn) => setChapters((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  const rate = (chapter, rating) => {
    const undo = snapshot();
    const next = review(chapter, rating, steps, today);
    updateChapter(chapter.id, () => next);
    if (!next.due) notify(`« ${chapter.title} » est ancré : tous les passages sont faits.`, undo);
    else notify(`« ${chapter.title} » revient ${relative(next.due, today)} (${formatShort(next.due)}).`, undo);
  };

  const delay = (chapter) => {
    const undo = snapshot();
    updateChapter(chapter.id, (c) => postpone(c, today));
    notify(`« ${chapter.title} » est reporté à demain.`, undo);
  };

  const saveChapter = ({ id, title, subjectId, newSubject, learnedAt }) => {
    let sid = subjectId;
    if (newSubject) {
      sid = uid();
      setSubjects((list) => [...list, { id: sid, name: newSubject.trim(), tone: list.length % 6, icon: 'menu_book', examDate: '' }]);
    }
    if (id) {
      updateChapter(id, (c) => {
        const base = { ...c, title: title.trim(), subjectId: sid };
        if (c.done === 0 && c.history.length === 0 && learnedAt !== c.learnedAt) {
          return { ...newChapter({ subjectId: sid, title, learnedAt }, steps), id: c.id };
        }
        return base;
      });
      notify('Chapitre modifié.');
    } else {
      const c = newChapter({ subjectId: sid, title, learnedAt }, steps);
      setChapters((list) => [...list, c]);
      notify(`Chapitre ajouté : premier passage ${relative(c.due, today)} (${formatShort(c.due)}).`);
    }
    setChapterDialog(null);
  };

  const deleteChapter = (chapter) => {
    const undo = snapshot();
    setChapters((list) => list.filter((c) => c.id !== chapter.id));
    setChapterDialog(null);
    notify(`« ${chapter.title} » supprimé.`, undo);
  };

  const saveSubject = (data) => {
    if (data.id) setSubjects((list) => list.map((s) => (s.id === data.id ? { ...s, ...data } : s)));
    else setSubjects((list) => [...list, { ...data, id: uid() }]);
    setSubjectDialog(null);
    notify(data.id ? 'Matière modifiée.' : `Matière « ${data.name} » créée.`);
  };

  const deleteSubject = (subject) => {
    const undo = snapshot();
    setSubjects((list) => list.filter((s) => s.id !== subject.id));
    setChapters((list) => list.filter((c) => c.subjectId !== subject.id));
    setSubjectDialog(null);
    notify(`Matière « ${subject.name} » et ses chapitres supprimés.`, undo);
  };

  const replaceAll = (data) => {
    const undo = snapshot();
    setSubjects(data.subjects);
    setChapters(data.chapters);
    if (data.settings) setSettings(data.settings);
    notify(`${data.chapters.length} chapitre(s) importé(s).`, undo);
  };

  const resetAll = () => {
    const undo = snapshot();
    setSubjects([]);
    setChapters([]);
    notify('Toutes les données ont été effacées.', undo);
  };

  const changeTheme = (mode) => {
    setThemeMode(mode);
    setTheme(mode);
  };

  const openNewChapter = (subjectId) => setChapterDialog({ chapter: null, subjectId });
  const isDark = theme === 'dark' || document.documentElement.dataset.theme === 'dark';
  const shared = { today, subjects, chapters, steps, settings, subjectOf };

  return (
    <div className="m3-app">
      <NavigationRail
        items={VIEWS.map((v) => ({ ...v, badge: v.value === 'aujourdhui' && dueCount ? dueCount : undefined }))}
        value={view}
        onChange={go}
        fab={<FAB icon="add" label="Nouveau chapitre" onClick={() => openNewChapter()} />}
        footer={
          <IconButton
            icon={isDark ? 'light_mode' : 'dark_mode'}
            label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
            onClick={() => changeTheme(isDark ? 'light' : 'dark')}
          />
        }
      />
      <main className="m3-main">
        <TopAppBar
          title={
            <span className="topbar-title">
              {current.title}
              {view === 'aujourdhui' && <span className="topbar-sub">{formatLong(today)}</span>}
            </span>
          }
        />
        <div className="m3-content">
          {view === 'aujourdhui' && <TodayView {...shared} onRate={rate} onPostpone={delay} onAdd={() => openNewChapter()} onGo={go} />}
          {view === 'planning' && <PlanningView {...shared} onOpenChapter={(c) => setChapterDialog({ chapter: c })} />}
          {view === 'matieres' && (
            <SubjectsView
              {...shared}
              onAddSubject={() => setSubjectDialog({ subject: null })}
              onEditSubject={(s) => setSubjectDialog({ subject: s })}
              onAddChapter={openNewChapter}
              onEditChapter={(c) => setChapterDialog({ chapter: c })}
            />
          )}
          {view === 'bilan' && <StatsView {...shared} onGo={go} />}
          {view === 'reglages' && (
            <SettingsView
              {...shared}
              theme={theme}
              onTheme={changeTheme}
              onSettings={setSettings}
              onImport={replaceAll}
              onReset={resetAll}
              notify={notify}
            />
          )}
        </div>
      </main>

      {chapterDialog && (
        <ChapterDialog
          chapter={chapterDialog.chapter}
          defaultSubjectId={chapterDialog.subjectId}
          subjects={subjects}
          steps={steps}
          today={today}
          onSave={saveChapter}
          onDelete={deleteChapter}
          onClose={() => setChapterDialog(null)}
        />
      )}
      {subjectDialog && (
        <SubjectDialog
          subject={subjectDialog.subject}
          count={subjectDialog.subject ? chapters.filter((c) => c.subjectId === subjectDialog.subject.id).length : 0}
          nextTone={subjects.length % 6}
          onSave={saveSubject}
          onDelete={deleteSubject}
          onClose={() => setSubjectDialog(null)}
        />
      )}
      <Snackbar
        key={snack?.key}
        open={!!snack}
        message={snack?.message}
        actionLabel={snack?.undo ? 'Annuler' : undefined}
        onAction={() => {
          snack?.undo?.();
          setSnack(null);
        }}
        onClose={closeSnack}
        duration={5000}
      />
    </div>
  );
}
