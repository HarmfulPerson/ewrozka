export const PAGE_SIZES = [10, 20, 50, 100];
export const VALID_FILTERS = ['', 'upcoming', 'past'];
export const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
export const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

export function fmtDate(d: Date) {
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function fmtTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
