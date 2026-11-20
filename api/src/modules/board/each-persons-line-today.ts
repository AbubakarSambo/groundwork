/**
 * "THE TEAM TODAY", EACH PERSON'S LINE FROM THEIR LAST CHECK-IN (Hafsah's point 10, 17 October; board-as-lead.txt: Aisha
 * "Visited John Butchery and Fresh Foods; sent 1 quote", Omar "Hasn't checked in today", "Not in yet").
 *
 * Grace's board read "Joseph Kariuki has not checked in yet." for every rep, on the day each of them had
 * checked in: the next session had opened, and the row was read against it. The kit's row is about today: a person who
 * checked in today reads their line from that check-in; a person who has not reads the kit's "Hasn't checked in today".
 *
 * THEIR LINE, FROM THE RECORD ONLY. One line the person said in that check-in, word for word: what moved on a deal they
 * named first, then anything else that moved, then anything they said. Never a summary nobody said.
 */
export const HAS_NOT_CHECKED_IN_TODAY = 'Hasn’t checked in today.';
/** For a reader who may not read the person's words: that they did, and nothing of what they said. */
export const CHECKED_IN_TODAY = 'Checked in today.';

export interface ALineTheySaid { text: string; type: string | null; createdAt: Date | string }

/* What is not a line about the day's work: a date range, how they would know, their own aim restated. */
const NOT_ABOUT_THE_DAY = new Set(['TIMEFRAME', 'SUCCESS_DEFINITION', 'INTENT', 'TOLERANCE']);

const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();

/** Their line from a check-in: what moved on a deal they named, else anything that moved, else anything they said about the day. */
export function theirLine(lines: readonly ALineTheySaid[], dealNames: readonly string[]): string | null {
  const said = lines.map((l) => ({ ...l, text: String(l.text ?? '').trim() })).filter((l) => l.text);
  const names = dealNames.map(squash).filter((n) => n.length >= 3);
  const namesADeal = (t: string) => names.some((n) => squash(t).includes(n));
  const moved = said.filter((l) => String(l.type ?? '').toUpperCase() === 'PROGRESS');
  const pick = moved.find((l) => namesADeal(l.text))
    ?? moved[0]
    ?? said.find((l) => !NOT_ABOUT_THE_DAY.has(String(l.type ?? '').toUpperCase()));
  if (!pick) return null;
  return /[.!?]$/.test(pick.text) ? pick.text : `${pick.text}.`;
}

const dayIn = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** The check-in this person finished today, in the organisation's day, or null. */
export function theirCheckInToday<T extends { participantId: string | null; status: string; completedAt: Date | string | null; isSetup?: boolean | null }>(
  checkIns: readonly T[], participantId: string, now: Date, zone: string,
): T | null {
  const today = dayIn(now, zone);
  const done = checkIns
    .filter((c) => c.participantId === participantId && String(c.status).toUpperCase() === 'COMPLETED' && !!c.completedAt && !c.isSetup)
    .filter((c) => dayIn(new Date(c.completedAt as any), zone) === today)
    .sort((a, b) => new Date(b.completedAt as any).getTime() - new Date(a.completedAt as any).getTime());
  return done[0] ?? null;
}
