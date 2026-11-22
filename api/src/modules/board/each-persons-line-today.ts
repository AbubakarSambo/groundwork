import { whenTheyAnswered, type ASessionAsItHappened } from './a-day-they-checked-in';

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

/** A check-in row as the board reads it, with their first answer in it where it was read (`turns`: their first turn). */
export type ACheckInTheyMayHaveAnswered = { participantId: string | null; status: string; completedAt: Date | string | null; isSetup?: boolean | null; closedReason?: string | null; turns?: { createdAt?: Date | string | null }[] | null } & ASessionAsItHappened;

/**
 * THE LAST CHECK-IN THEY ANSWERED, AND WHEN (re-test, 22 November evening, R-11). The board read "Chidi last checked in on Monday 23
 * November" from the session the clock closed that morning with nothing from him (COMPLETED, with a `completedAt`), while the same
 * morning's summary said he had not checked in the last two times. Both now read the one rule of answering (a-day-they-checked-in's
 * `whenTheyAnswered`): a session the clock closed with nothing of theirs is not a check-in, and one they answered is on the day they answered.
 */
export function theirLastAnswer<T extends ACheckInTheyMayHaveAnswered>(checkIns: readonly T[], participantId: string): { checkIn: T; at: Date } | null {
  let best: { checkIn: T; at: Date } | null = null;
  for (const c of checkIns) {
    if (c.participantId !== participantId || c.isSetup) continue;
    const turns = Array.isArray(c.turns) ? c.turns : null;
    const at = whenTheyAnswered({ ...c, answers: turns ? turns.length : c.answers, firstAnsweredAt: turns ? turns[0]?.createdAt ?? null : c.firstAnsweredAt });
    if (at && (!best || at > best.at)) best = { checkIn: c, at };
  }
  return best;
}

/** The check-in this person answered today, in the organisation's day, or null. */
export function theirCheckInToday<T extends ACheckInTheyMayHaveAnswered>(
  checkIns: readonly T[], participantId: string, now: Date, zone: string,
): T | null {
  const last = theirLastAnswer(checkIns, participantId);
  return last && dayIn(last.at, zone) === dayIn(now, zone) ? last.checkIn : null;
}
