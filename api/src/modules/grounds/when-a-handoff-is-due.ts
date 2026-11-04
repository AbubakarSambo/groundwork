/**
 * WHEN A HANDOFF IS DUE, AND WHERE IT STANDS, READ FROM THE RECORD (request 18, D3).
 *
 * `dueSaid` is the person's own words, kept word for word. Everything else here is written by the
 * product from the record and invents nothing: a day is named only when the words name one, and the
 * standing sentence says only what the handoff already holds.
 */

const DAY = 86_400_000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayOf = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** The calendar day in the organisation's own time (boards are dated in Africa/Lagos). */
export function theDayIn(zone: string, at: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  const [y, m, d] = parts.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * The day a person's words mean, given the day they said it. Null unless the words name a day:
 * "today", "tomorrow", a weekday ("by Friday", "next Monday"), or a date ("30 Sept", "September 30").
 * "Soon" and "after the audit" are not days, so they stay words.
 */
export function theDayTheyMeant(said: string | null | undefined, saidOn: Date): Date | null {
  const t = (said ?? '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const today = dayOf(saidOn);
  if (/\b(today|tonight)\b/.test(t)) return new Date(today);
  if (/\btomorrow\b/.test(t)) return new Date(today + DAY);
  /*
   * "BY END OF DAY TOMORROW" IS TOMORROW, AND "BY END OF DAY WEDNESDAY" IS WEDNESDAY (Drop Access, second night run: Kevin's "I'll call
   * them by end of day tomorrow" on Monday 19 October, and Mercy's "by end of day Wednesday" on Monday 12 October, were both read as the
   * day they were said). "End of day" on its own is the day it was said.
   */
  const endOfTheDay = /\b(end of (the )?day|eod)\b/.test(t);
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b|\\b${WEEKDAY_SHORT[i].toLowerCase()}\\b`).test(t)) {
      const now = new Date(today).getUTCDay();
      let ahead = (i - now + 7) % 7;
      if (ahead === 0) ahead = 7;
      if (/\bnext\b/.test(t) && ahead < 7) ahead += 7;
      return new Date(today + ahead * DAY);
    }
  }
  const monthAt = (name: string) => MONTHS.findIndex((m) => m === name || (name.length >= 3 && m.startsWith(name) && (name === 'sept' || name.length === 3)));
  const dayFirst = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\b/);
  const monthFirst = t.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const hit = dayFirst && monthAt(dayFirst[2]) >= 0
    ? { d: +dayFirst[1], m: monthAt(dayFirst[2]) }
    : monthFirst && monthAt(monthFirst[1]) >= 0 ? { d: +monthFirst[2], m: monthAt(monthFirst[1]) } : null;
  if (!hit || hit.d < 1 || hit.d > 31) return endOfTheDay ? new Date(today) : null;
  const y = new Date(today).getUTCFullYear();
  let candidate = Date.UTC(y, hit.m, hit.d);
  if (new Date(candidate).getUTCMonth() !== hit.m) return null;
  /* A date already gone by more than a fortnight means next year's. */
  if (candidate < today - 14 * DAY) candidate = Date.UTC(y + 1, hit.m, hit.d);
  return new Date(candidate);
}

/** "Overdue", "Today", a short weekday through the week ahead ("Fri"), or a short date ("30 Sept"). Null when no day is known. */
export function theDueWord(dueOn: Date | string | null | undefined, today: Date): string | null {
  if (!dueOn) return null;
  const due = dayOf(new Date(dueOn));
  const now = dayOf(today);
  if (due < now) return 'Overdue';
  if (due === now) return 'Today';
  const d = new Date(due);
  if (due - now < 7 * DAY) return WEEKDAY_SHORT[d.getUTCDay()];
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

/** "references" are due, "count" is due. A plain guess from the last word, which only ever picks between two correct verbs. */
const isPlural = (what: string): boolean => {
  const last = (what.trim().split(/\s+/).pop() ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return /[^su]s$/.test(last) && !/(ss|us|is|ics|ness)$/.test(last) && last !== 'sales' && last !== 'news';
};

export interface WhatTheRecordHolds {
  what: string;
  dueSaid?: string | null;
  blockerKind?: string | null;
}

/**
 * ONE SHORT PLAIN SENTENCE OF WHERE IT STANDS, from what the handoff holds.
 *   "The Mombasa depot's count is due Friday."  (they gave a time)
 *   "Not decided yet."                          (it is a decision nobody has made)
 *   "No date has been given yet."               (otherwise)
 */
export function whereItStands(h: WhatTheRecordHolds): string {
  const due = (h.dueSaid ?? '').trim().replace(/^due\s+/i, '').replace(/[.]+$/, '');
  const what = (h.what ?? '').trim().replace(/[.]+$/, '');
  if (due && what) return `${what.charAt(0).toUpperCase()}${what.slice(1)} ${isPlural(what) ? 'are' : 'is'} due ${due}.`;
  if (h.blockerKind === 'DECISION') return 'Not decided yet.';
  return 'No date has been given yet.';
}

/** What is added to each handoff a reader is served: their own words, the day, the word for it, and where it stands. */
export function theDueFields(
  h: { what: string; dueSaid?: string | null; dueOn?: Date | string | null; blockerKind?: string | null },
  today: Date,
) {
  return {
    dueSaid: (h.dueSaid ?? '').trim() || null,
    dueOn: h.dueOn ? new Date(h.dueOn).toISOString().slice(0, 10) : null,
    dueWord: theDueWord(h.dueOn, today),
    standing: whereItStands(h),
  };
}
