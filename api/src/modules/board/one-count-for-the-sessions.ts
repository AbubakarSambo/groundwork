import { whichRoundIsOpen, inTheTeamsNumbering } from './which-round-is-open';
import { theDayZone } from '../../common/the-organisations-own-day';
/**
 * ONE COUNT FOR THE SESSIONS, FROM THE BOARD'S OWN CLOCK (request 107 e, with request 97 a).
 *
 * One board read "Session 1 of 12" in its header beside "Session 2 opened on 30 September". The header
 * was counted from the open round (which-round-is-open: the lowest round somebody has started and not
 * finished), and the screen called each session's first finished check-in the day it "opened". Both
 * were true of something, and together they told two stories.
 *
 * The board serves the open round (`currentSession`, capped at the last planned session) and the planned
 * count (`plannedSessions`), which the header is drawn from with `theHeaderSays` (the prototype's own
 * words: "Session 38 of 65."), and every session's line as a sentence from the same open round:
 *   a session before the open round, or one everybody finished: "Session 1 finished on 16 September."
 *   the open round: "Session 2 opened on 30 September, and it is still open."
 *   a later session somebody has already started: "Session 3 has started for some people, while session 2 is still open."
 *   a later session with a day set: "Session 3 opens on 7 October."
 *   and otherwise: "Session 3 has not opened yet."
 *
 * The day a session opened is the earliest day it was made available that has come, or else the earliest
 * day anybody started it. Never the day somebody finished it. Nothing here names a person or counts them.
 */
export interface ASessionRow {
  sessionNumber: number;
  status: string;
  availableFrom?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export const asDate = (d: Date | string | null | undefined): Date | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
};

/** "30 September", counted in the organisation's own day like every board date (B-094), with the year only when it is not this one. */
export function aDayPeopleRead(d: Date, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: theDayZone(), day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const thisYear = new Intl.DateTimeFormat('en-GB', { timeZone: theDayZone(), year: 'numeric' }).format(now);
  return `${get('day')} ${get('month')}${get('year') === thisYear ? '' : ` ${get('year')}`}`;
}

export function theHeaderSays(openRound: number, planned: number | null, allFinished: boolean): string {
  if (planned && allFinished) return openRound > planned ? `Check-in ${openRound}, finished.` : `Check-in ${planned} of ${planned}, finished.`;
  return planned && planned >= openRound ? `Check-in ${openRound} of ${planned}.` : `Check-in ${openRound}.`;
}

/**
 * EACH SESSION'S LINE, AGAINST THE TEAM'S SESSION (`openRound`, the latest begun: which-round-is-open.ts). Every earlier session is over:
 * finished on the day its last answer came, or, where somebody did not answer it, ended when the next one began, with how many missed
 * it (Hafsah, 22 November 2026: a session nobody finished is said as missed, never as still waiting). Later ones open on their day.
 */
export function whatEachSessionSays(n: number, rows: ASessionRow[], openRound: number, now = new Date()): { says: string; openedOn: Date | null } {
  const forSession = rows.filter((r) => r.sessionNumber === n);
  const answered = (r: ASessionRow) => r.status === 'COMPLETED' || r.status === 'DECLINED';
  const allDone = forSession.length > 0 && forSession.every(answered);
  const came = forSession.map((r) => asDate(r.availableFrom)).filter((d): d is Date => !!d && d.getTime() <= now.getTime()).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const firstStart = forSession.map((r) => asDate(r.startedAt)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const opensLater = forSession.map((r) => asDate(r.availableFrom)).filter((d): d is Date => !!d && d.getTime() > now.getTime()).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const openedOn = came ?? firstStart;
  if (n < openRound || allDone) {
    const lastDone = forSession.map((r) => asDate(r.completedAt)).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const missed = forSession.filter((r) => !answered(r)).length;
    if (missed) return { says: `Check-in ${n} is over, and ${missed === 1 ? 'one person' : `${missed} people`} missed it.`, openedOn };
    return { says: lastDone ? `Check-in ${n} finished on ${aDayPeopleRead(lastDone, now)}.` : `Check-in ${n} is finished.`, openedOn };
  }
  if (n === openRound) {
    return { says: openedOn ? `Check-in ${n} opened on ${aDayPeopleRead(openedOn, now)}, and it is still open.` : `Check-in ${n} is open now.`, openedOn };
  }
  if (opensLater) return { says: `Check-in ${n} opens on ${aDayPeopleRead(opensLater, now)}.`, openedOn: null };
  return { says: `Check-in ${n} has not opened yet.`, openedOn: null };
}


/**
 * THE SAME COUNT, FOR THE CHECK-IN'S OWN HEADER (request 101 f). The lead's header read "Session 1 of 12. ...
 * It went back to session 1, because somebody new was added." while the Report tab listed session 2, because
 * the screen worked the header out on its own. The check-in read now serves the board's own clock, from the
 * same rule (the open round among the people who check in, capped at the last planned session):
 *   `says`: "Session 1 of 12." (the prototype's words, theHeaderSays)
 */
export interface TheSessionClock {
  currentSession: number;
  plannedSessions: number | null;
  says: string;
}

/*
 * THE TEAM'S SESSION, CAPPED AT THE LAST PLANNED ONE, UNLESS PEOPLE HAVE ALREADY CHECKED IN PAST IT (item 21, the founder's board). Six
 * sessions ran on a check-in planned for three, and the board read "Session 3" beside six finished sessions. A session somebody has
 * started is a session, so the count never says fewer than have run.
 */
export function theRoundCappedAtThePlan(open: number, planned: number | null, rows: ASessionRow[]): number {
  const ranPastThePlan = !!planned && planned > 0 && rows.some((r) => r.sessionNumber > planned && r.status !== 'NOT_STARTED');
  return planned && planned > 0 && !ranPastThePlan ? Math.min(Math.max(open, 1), planned) : Math.max(open, 1);
}

/**
 * WHO HOLDS THE SESSION CLOCK: somebody who checks in, has been let in (decision 77), and has joined. Somebody invited by email who has
 * not opened the invitation yet (no sign-in, never joined) has a first session waiting, and it read as the check-in's own session: Grace
 * added Sam on the seventh day, and People and setup said "Session 1 of 15. Session 2 finished on 14 October." (browser test, 21 October).
 */
export function holdsTheClock(p: { managingOnly?: boolean | null; userId?: string | null; joinedAt?: Date | string | null } & Record<string, any>, notLetInYet: (p: any) => boolean): boolean {
  if (p.managingOnly) return false;
  if (notLetInYet(p)) return false;
  if ('userId' in p && p.userId == null && !p.joinedAt) return false;
  return true;
}

export function theSessionClock(
  rows: (ASessionRow & { participantId: string })[],
  whoChecksIn: ReadonlySet<string>,
  planned: number | null,
  now = new Date(),
): TheSessionClock {
  const theirs = inTheTeamsNumbering(rows.filter((r) => whoChecksIn.has(r.participantId)));
  const highest = rows.reduce((m, r) => Math.max(m, r.sessionNumber ?? 1), 1);
  const open = theirs.length ? whichRoundIsOpen(theirs as any, now) : highest;
  const current = theRoundCappedAtThePlan(open, planned, theirs);
  /* Finished once the last planned session has begun and everybody in it has answered; earlier sessions are over whoever missed them. */
  const theLast = theirs.filter((r) => !!planned && r.sessionNumber === planned);
  const allFinished = !!planned && current >= planned && theLast.length > 0 && theLast.every((r) => r.status === 'COMPLETED' || r.status === 'DECLINED');
  return { currentSession: current, plannedSessions: planned, says: theHeaderSays(current, planned, allFinished) };
}
