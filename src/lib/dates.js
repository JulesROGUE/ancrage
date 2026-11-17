// Local dates as 'YYYY-MM-DD' strings: no time zone surprises, easy to compare and store.
const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => toKey(new Date());

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fmtDow = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const formatLong = (key) => cap(fmtLong.format(fromKey(key)));
export const formatShort = (key) => fmtShort.format(fromKey(key)).replace('.', '');
export const formatMonth = (d) => cap(fmtMonth.format(d));
export const formatDow = (key) => cap(fmtDow.format(fromKey(key)).replace('.', ''));

/** "aujourd'hui", "demain", "dans 3 j", "hier", "il y a 4 j". */
export function relative(key, from = todayKey()) {
  const n = diffDays(from, key);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}

/** Monday-first weeks covering the month of `date`. */
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      days.push({ key: toKey(d), inMonth: d.getMonth() === date.getMonth(), day: d.getDate() });
    }
    if (w >= 4 && !days.some((d) => d.inMonth)) break;
    weeks.push(days);
  }
  return weeks;
}
