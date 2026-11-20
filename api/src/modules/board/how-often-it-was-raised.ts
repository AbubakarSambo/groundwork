import { aDayPeopleRead, asDate } from './one-count-for-the-sessions';
import { theDayZone } from '../../common/the-organisations-own-day';

/**
 * HOW OFTEN A BLOCKER WAS RAISED (request 107 c; the prototype's "Raised: 3 times, 1 Sep to 23 Sep").
 * Counted in the check-ins it was said in, so saying it twice in one check-in is once; where a row
 * does not say which check-in, each row is a time. Said as a sentence:
 *   "This was raised once, on 3 September."
 *   "This has been raised 3 times, from 1 September to 23 September."
 *   "This has been raised 2 times, both on 3 September."
 */
export function howOftenItWasRaised(raisedAt: { at: Date | string | null; checkInId: string | null }[] | null | undefined, now = new Date()): { times: number; firstRaisedAt: string | null; lastRaisedAt: string | null; says: string } | null {
  const rows = (raisedAt ?? []).filter(Boolean);
  if (!rows.length) return null;
  const keys = new Set(rows.map((r, i) => r.checkInId ?? `row-${i}`));
  const times = keys.size;
  const days = rows.map((r) => asDate(r.at)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  const first = days[0] ?? null;
  const last = days[days.length - 1] ?? null;
  const iso = (d: Date | null) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) : null);
  const firstRaisedAt = iso(first);
  const lastRaisedAt = iso(last);
  let says: string;
  if (times === 1) says = first ? `This was raised once, on ${aDayPeopleRead(first, now)}.` : 'This was raised once.';
  else if (first && last && firstRaisedAt !== lastRaisedAt) says = `This has been raised ${times} times, from ${aDayPeopleRead(first, now)} to ${aDayPeopleRead(last, now)}.`;
  else if (first) says = `This has been raised ${times} times, ${times === 2 ? 'both' : 'all'} on ${aDayPeopleRead(first, now)}.`;
  else says = `This has been raised ${times} times.`;
  return { times, firstRaisedAt, lastRaisedAt, says };
}
