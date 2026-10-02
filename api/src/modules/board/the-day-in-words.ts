const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "30 September", in Lagos time, with the year only where it is not the year of `now`. */
export function theDayInWords(d: Date, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number);
  const [y, m, day] = parts;
  const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(now));
  return `${day} ${MONTHS[m - 1]}${y === thisYear ? '' : ` ${y}`}`;
}

/** The day a date-only column holds, "2026-10-30", read as that day wherever the reader is. */
export function aDateOnly(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const s = typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00Z`) : null;
}
