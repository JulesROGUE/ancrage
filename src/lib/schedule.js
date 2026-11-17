// Spaced revisions ("méthode des J"): each chapter comes back J+1, J+3, J+7... after it was learned.
import { addDays, diffDays, todayKey } from './dates.js';

export const PRESETS = {
  classique: { label: 'Classique', steps: [1, 3, 7, 14, 30], hint: 'Le rythme le plus courant : idéal pour un semestre.' },
  intensif: { label: 'Intensif', steps: [1, 2, 4, 7, 12], hint: 'Examen dans moins de trois semaines : les passages se resserrent.' },
  long: { label: 'Long terme', steps: [1, 4, 10, 21, 45, 90], hint: 'Pour retenir sur plusieurs mois (concours, certification).' },
};

export const DEFAULT_SETTINGS = { preset: 'classique', steps: PRESETS.classique.steps, dailyLimit: 8 };

export const RATINGS = {
  again: { label: 'À revoir', icon: 'replay', hint: 'Le passage est refait demain.' },
  good: { label: 'Correct', icon: 'check', hint: 'Passage suivant, au rythme prévu.' },
  easy: { label: 'Acquis', icon: 'bolt', hint: 'Passage suivant, intervalle allongé de 50 %.' },
};

/** Parse "1, 3, 7, 14" into a clean increasing list of days (or null if invalid). */
export function parseSteps(text) {
  const nums = String(text).split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.length > 10 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) return null;
  for (let i = 1; i < nums.length; i++) if (nums[i] <= nums[i - 1]) return null;
  return nums;
}

export const stepLabel = (steps, i) => `J+${steps[Math.min(i, steps.length - 1)]}`;

export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export function newChapter({ subjectId, title, learnedAt }, steps) {
  return {
    id: uid(),
    subjectId,
    title: title.trim(),
    learnedAt,
    done: 0,
    due: addDays(learnedAt, steps[0]),
    history: [],
  };
}

/** Apply a rating to a chapter reviewed on `today`. */
export function review(chapter, rating, steps, today = todayKey()) {
  const history = [...chapter.history, { date: today, rating, step: chapter.done }];
  if (rating === 'again') return { ...chapter, history, due: addDays(today, 1) };
  const done = chapter.done + 1;
  if (done >= steps.length) return { ...chapter, history, done, due: null };
  let gap = Math.max(1, steps[done] - steps[done - 1]);
  if (rating === 'easy') gap = Math.round(gap * 1.5);
  return { ...chapter, history, done, due: addDays(today, gap) };
}

export const postpone = (chapter, today = todayKey()) => ({ ...chapter, due: addDays(today, 1) });

export function status(chapter, today = todayKey()) {
  if (!chapter.due) return 'anchored';
  if (chapter.due < today) return 'late';
  if (chapter.due === today) return 'today';
  return 'upcoming';
}

export const isAnchored = (c, steps) => !c.due || c.done >= steps.length;

/** Future passages if every review goes "Correct": [{ date, step }]. Late reviews are moved to today. */
export function projection(chapter, steps, today = todayKey()) {
  if (!chapter.due) return [];
  const out = [];
  let date = chapter.due < today ? today : chapter.due;
  for (let s = chapter.done; s < steps.length; s++) {
    out.push({ date, step: s });
    if (s + 1 < steps.length) date = addDays(date, Math.max(1, steps[s + 1] - steps[s]));
  }
  return out;
}

/** Map date -> [{ chapter, step, kind: 'planned' | 'done', rating? }] for a date range. */
export function calendarEvents(chapters, steps, from, to, today = todayKey()) {
  const map = new Map();
  const push = (date, ev) => {
    if (date < from || date > to) return;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(ev);
  };
  for (const c of chapters) {
    for (const h of c.history) if (h.date < today || h.date === today) push(h.date, { chapter: c, step: h.step, kind: 'done', rating: h.rating });
    for (const p of projection(c, steps, today)) push(p.date, { chapter: c, step: p.step, kind: 'planned', late: c.due < today && p.date === today && p.step === c.done });
  }
  return map;
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one review. */
export function streak(chapters, today = todayKey()) {
  const days = new Set(chapters.flatMap((c) => c.history.map((h) => h.date)));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Will every remaining passage of the chapter happen before the exam date? */
export function readyBefore(chapter, steps, examDate, today = todayKey()) {
  if (!chapter.due) return true;
  const p = projection(chapter, steps, today);
  return p.length > 0 && p[p.length - 1].date <= examDate;
}

export const daysUntil = (key, today = todayKey()) => diffDays(today, key);
