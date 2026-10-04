import { notToldYet } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { theWorkPlan, whoIs, type ACommitment, type ASession, type WhoIsReading } from './the-switchboards-own-sections';

/**
 * WHAT WAS AGREED AT THE START (request 123, the onboarding board: a new hire, a new manager, a new advisor).
 *
 * The prototype's "What was agreed at the start" (B6-ending-a-check-in/day-30-and-60.txt) lists what both
 * sides agreed on day 1, and what is due by day 30, day 60 and day 90. The record holds it already:
 *  - the goals set for each person (PersonObjective), each with the date or the words it was due by; and
 *  - what each person committed to in the first session (GroundCommitment, stated in session 1).
 * Nothing here is asked of a model, and nothing is written: opening the board changes nothing (decision 7).
 *
 * WHAT IS NOT IN IT. A goal the lead has not told the person yet is the lead's own note (decision 56), so it
 * is not "agreed" and is left out for every reader. The role the lead described the person by is left out too:
 * it is the lead's description of somebody (decision 30), and the person's own role is on the board already.
 *
 * WHO READS IT. The lead, the person it is about (their own goals and commitments, and the lead's goals for
 * them), and an admin the check-in is open to. Each row goes through the same rule as every other row of the
 * board (`personMayBeRead` and `commitmentMayBeRead`), so a reader who may not read a person reads nothing of
 * them here, and an admin with no access to this evaluation check-in is sent nothing at all.
 */

export const NOTHING_WAS_AGREED_YET = null;

export interface AnAgreedGoal {
  id: string;
  participantId: string;
  text: string;
  kind?: string | null;
  dueSaid?: string | null;
  dueDate?: Date | string | null;
  status?: string | null;
  statusChangedAt?: Date | string | null;
  awareness?: string | null;
  authoredBy?: string | null;
  createdAt?: Date | string | null;
}

export interface AStartingRow {
  /** The step it belongs to: "Day 1", "By day 30", "By day 60", "By day 90" or "After day 90". */
  when: string;
  /** Whose it is: 'You' to the person it is about, otherwise their name. */
  whose: string;
  /** One full sentence. */
  says: string;
  /** The goal, as it was written down, or null for a commitment (its words are in `says`). */
  what: string | null;
  kind: 'goal' | 'commitment';
}

export interface AStartingState {
  heading: 'What was agreed at the start';
  rows: AStartingRow[];
}

const DAY = 24 * 60 * 60 * 1000;

/** The calendar day, on Africa/Lagos' clock like every date on a board, as a number of days. */
export function theDayNumber(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
  const [y, m, dd] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, dd) / DAY);
}

/** Day 1 is the day the check-in starts: its start date, else the day the first session was finished, else the day it was made. */
export function dayOneOf(a: { startsAt?: Date | string | null; sessions: ASession[]; createdAt?: Date | string | null }): number | null {
  const first = a.sessions
    .filter((s) => !s.isSetup && String(s.status).toUpperCase() === 'COMPLETED' && s.completedAt)
    .map((s) => theDayNumber(s.completedAt))
    .filter((n): n is number => n !== null)
    .sort((x, y) => x - y)[0] ?? null;
  return theDayNumber(a.startsAt) ?? first ?? theDayNumber(a.createdAt);
}

export const STEPS = [30, 60, 90] as const;

/** The step a day number falls in: by day 30, by day 60, by day 90, or after it. Day 1 for anything on or before the first day. */
export function stepOfDay(dayNumber: number): string {
  if (dayNumber <= 1) return 'Day 1';
  for (const s of STEPS) if (dayNumber <= s) return `By day ${s}`;
  return 'After day 90';
}

/** "by day 60" in what somebody said the time was, where they said it so. */
function stepSaid(dueSaid: string | null | undefined): string | null {
  const m = /\bday\s*(30|60|90)\b/i.exec(dueSaid ?? '');
  return m ? `By day ${m[1]}` : null;
}

const ORDER = ['Day 1', 'By day 30', 'By day 60', 'By day 90', 'After day 90'];

/** A goal somebody has not been told about, or has not been asked about, was not agreed. */
function wasAgreed(g: AnAgreedGoal): boolean {
  if (notToldYet(g)) return false;
  const a = String(g.awareness ?? '').toUpperCase();
  if ((a === 'UNSURE' || a === 'NOT_ASKED') && g.authoredBy !== 'self') return false;
  return true;
}

/**
 * A PROMISE IS NOT A GOAL (request 128 item 2). "If the information is incomplete, I will follow up with her for the missing
 * details." was stored as a goal and read "A goal was agreed for Tobi Adewale." A first-person promise is what the person
 * committed to, and is said as that.
 */
export const aPromiseNotAGoal = (text: string | null | undefined): boolean =>
  /^(?:(?:if|when|once|after)\b[^,]{0,80},\s*)?(?:i|we)(?:['\u2019]ll|\s+will|\s+shall|\s+am going to|['\u2019]m going to|\s+promise to)\b/i.test(String(text ?? '').trim());

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

export function whatWasAgreedAtTheStart(a: {
  goals: AnAgreedGoal[];
  commitments: ACommitment[];
  sessions: ASession[];
  people: { id: string; managingOnly: boolean }[];
  startsAt?: Date | string | null;
  createdAt?: Date | string | null;
  reader: WhoIsReading;
}): AStartingState | null {
  const r = a.reader;
  const subjects = new Set(a.people.filter((p) => !p.managingOnly).map((p) => p.id));
  const dayOne = dayOneOf({ startsAt: a.startsAt, sessions: a.sessions, createdAt: a.createdAt });
  const rows: AStartingRow[] = [];

  for (const g of a.goals) {
    if (!subjects.has(g.participantId) || !r.personMayBeRead(g.participantId) || !wasAgreed(g)) continue;
    const what = clean(g.text ?? '');
    if (!what) continue;
    const kind = String(g.kind ?? '').toUpperCase();
    if (kind === 'REFERENCE' || kind === 'COMMITMENT') continue;
    const whose = whoIs(r, g.participantId);
    const due = theDayNumber(g.dueDate);
    const when = due !== null && dayOne !== null ? stepOfDay(due - dayOne + 1) : stepSaid(g.dueSaid) ?? 'Day 1';
    if (aPromiseNotAGoal(what)) {
      rows.push({ when, whose, says: `${whose === 'You' ? 'You' : whose} said, "${what.replace(/[.!?]+$/, '')}."`, what: null, kind: 'commitment' });
      continue;
    }
    const time = when === 'Day 1'
      ? (g.dueSaid?.trim() ? `, and the time given for it was "${g.dueSaid.trim().replace(/[.!?]+$/, '')}"` : '')
      : `, to be met ${when.charAt(0).toLowerCase()}${when.slice(1)}`;
    rows.push({ when, whose, says: `A goal was agreed for ${whose === 'You' ? 'you' : whose}${time}.`, what, kind: 'goal' });
  }

  /* What each person committed to in the first session: said on day 1, in the sentence the work plan writes for it. */
  const first = a.commitments.filter((c) => c.statedInSession === 1 && c.participantId && subjects.has(c.participantId));
  for (const row of theWorkPlan(first, a.sessions, r)) {
    rows.push({ when: 'Day 1', whose: row.who ?? 'Somebody', says: row.says, what: null, kind: 'commitment' });
  }

  if (!rows.length) return NOTHING_WAS_AGREED_YET;
  rows.sort((x, y) => ORDER.indexOf(x.when) - ORDER.indexOf(y.when));
  return { heading: 'What was agreed at the start', rows };
}

/** Reads the goals of a check-in, as stored. Nothing is written. */
export async function theGoalsSetForAnyone(prisma: any, groundId: string): Promise<AnAgreedGoal[]> {
  const rows = await (prisma.personObjective?.findMany?.({
    where: { groundId },
    select: { id: true, participantId: true, text: true, kind: true, dueSaid: true, dueDate: true, status: true, statusChangedAt: true, awareness: true, authoredBy: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  }) ?? Promise.resolve([])).catch(() => []);
  return rows as AnAgreedGoal[];
}
