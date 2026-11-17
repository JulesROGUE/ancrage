// Subjects: a name, a colour tone (CSS classes tone-0..tone-5) and a Material Symbols icon.
export const TONES = [0, 1, 2, 3, 4, 5];

export const SUBJECT_ICONS = [
  'menu_book', 'calculate', 'code', 'database', 'translate', 'science',
  'gavel', 'payments', 'history_edu', 'public', 'psychology', 'lan',
];

export const UNKNOWN_SUBJECT = { id: '', name: 'Sans matière', tone: 2, icon: 'help' };

export function subjectMap(subjects) {
  const map = new Map(subjects.map((s) => [s.id, s]));
  return (id) => map.get(id) || UNKNOWN_SUBJECT;
}
