import { whichRoundIsOpen } from './which-round-is-open';
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
  if (planned && allFinished) return openRound > planned ? `Session ${openRound}, finished.` : `Session ${planned} of ${planned}, finished.`;
  return planned && planned >= openRound ? `Session ${openRound} of ${planned}.` : `Session ${openRound}.`;
}

/** `handOn`: Release 1's reading (a finished round hands the count on); false reads as the board did before it (release-one-sales-board). */
export function whatEachSessionSays(n: number, rows: ASessionRow[], openRound: number, now = new Date(), handOn = true): { says: string; openedOn: Date | null } {
  const forSession = rows.filter((r) => r.sessionNumber === n);
  const allDone = forSession.length > 0 && forSession.every((r) => r.status === 'COMPLETED' || r.status === 'DECLINED');
  const came = forSession.map((r) => asDate(r.availableFrom)).filter((d): d is Date => !!d && d.getTime() <= now.getTime()).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const firstStart = forSession.map((r) => asDate(r.startedAt)).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const opensLater = forSession.map((r) => asDate(r.availableFrom)).filter((d): d is Date => !!d && d.getTime() > now.getTime()).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const started = forSession.some((r) => r.status !== 'NOT_STARTED');
  const openedOn = came ?? firstStart;
  if (n < openRound || allDone) {
    const lastDone = forSession.map((r) => asDate(r.completedAt)).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return { says: lastDone ? `Session ${n} finished on ${aDayPeopleRead(lastDone, now)}.` : `Session ${n} is finished.`, openedOn };
  }
  if (n === openRound) {
    return { says: openedOn ? `Session ${n} opened on ${aDayPeopleRead(openedOn, now)}, and it is still open.` : `Session ${n} is open now.`, openedOn };
  }
  /*
   * A SESSION THESE ROWS SAY IS FINISHED IS NEVER "STILL OPEN" (Drop Access short run, item 14). Mercy's board read "Session 3
   * finished on 14 October." and, the next line, "Session 4 opened on 15 October, while session 3 is still open.": the open
   * round was counted across the check-in, and these rows had session 3 done. Where they do, a later session that has come is
   * said as open, on its own.
   */
  const openOne = rows.filter((r) => r.sessionNumber === openRound);
  const theOpenOneIsDone = openOne.length > 0 && openOne.every((r) => r.status === 'COMPLETED' || r.status === 'DECLINED');
  if (handOn && theOpenOneIsDone && (came || started)) return { says: openedOn ? `Session ${n} opened on ${aDayPeopleRead(openedOn, now)}, and it is still open.` : `Session ${n} is open now.`, openedOn };
  if (started) return { says: `Session ${n} has started for some people, while session ${openRound} is still open.`, openedOn };
  if (came) return { says: `Session ${n} opened on ${aDayPeopleRead(came, now)}, while session ${openRound} is still open.`, openedOn };
  if (opensLater) return { says: `Session ${n} opens on ${aDayPeopleRead(opensLater, now)}.`, openedOn: null };
  return { says: `Session ${n} has not opened yet.`, openedOn: null };
}


/**
 * THE SAME COUNT, FOR THE CHECK-IN'S OWN HEADER (request 101 f). The lead's header read "Session 1 of 12. ...
 * It went back to session 1, because somebody new was added." while the Report tab listed session 2, because
 * the screen worked the header out on its own. The check-in read now serves the board's own clock, from the
 * same rule (the open round among the people who check in, capped at the last planned session):
 *   `says`: "Session 1 of 12." (the prototype's words, theHeaderSays)
 *   `whileOpen`: "Session 2 has started for some people, while session 1 is still open." where a later
 *     session has started, and null otherwise. It names nobody and counts nobody.
 */
export interface TheSessionClock {
  currentSession: number;
  plannedSessions: number | null;
  says: string;
  whileOpen: string | null;
}

/*
 * THE OPEN ROUND, CAPPED AT THE LAST PLANNED SESSION, UNLESS PEOPLE HAVE ALREADY CHECKED IN PAST IT (item 21,
 * the founder's board). Six sessions ran on a check-in planned for three, and the board read "Session 3"
 * beside six finished sessions, and "This is session 3 of 3" to the founder. A session somebody has
 * started is a session, so the count never says fewer than have run.
 */
/*
 * A FINISHED ROUND HANDS THE COUNT TO THE NEXT ONE THAT HAS COME (Drop Access short run, 18 October). Mercy's board header read
 * "Daily on weekdays, from 8am. Session 3 of 15." while the line under it read "Session 4 opened on 15 October, and it is still
 * open.": everybody had finished session 3, and session 4 had been made available on 15 October with nobody in it yet. The open
 * round stayed 3, because nobody had started 4. Where every row of the open round is finished, the round is the next one that has
 * come (its day to be available has passed) or that somebody has started, so the header and every session's line read one count.
 */
export function theRoundThatHasCome(open: number, rows: ASessionRow[], now = new Date()): number {
  const done = (r: ASessionRow) => r.status === 'COMPLETED' || r.status === 'DECLINED';
  const theOpenOne = rows.filter((r) => r.sessionNumber === open);
  if (!theOpenOne.length || !theOpenOne.every(done)) return open;
  const hasCome = (r: ASessionRow) => {
    const from = asDate(r.availableFrom);
    return r.status !== 'NOT_STARTED' || (!!from && from.getTime() <= now.getTime());
  };
  const later = rows.filter((r) => r.sessionNumber > open && hasCome(r)).map((r) => r.sessionNumber);
  return later.length ? Math.min(...later) : open;
}

export function theRoundCappedAtThePlan(open: number, planned: number | null, rows: ASessionRow[], now = new Date(), handOn = true): number {
  if (handOn) open = theRoundThatHasCome(open, rows, now);
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
  /* Release 1's reading, where its switch is on for the organisation; false reads as before it (theRoundThatHasCome). */
  handOn = true,
): TheSessionClock {
  const theirs = rows.filter((r) => whoChecksIn.has(r.participantId));
  const highest = rows.reduce((m, r) => Math.max(m, r.sessionNumber ?? 1), 1);
  const open = theirs.length ? whichRoundIsOpen(theirs as any) : highest;
  const current = theRoundCappedAtThePlan(open, planned, theirs, now, handOn);
  const done = (r: ASessionRow) => r.status === 'COMPLETED' || r.status === 'DECLINED';
  const allFinished = !!planned && theirs.length > 0 && theirs.every(done) && theirs.some((r) => r.sessionNumber >= planned);
  const ahead = [...new Set(theirs.filter((r) => r.sessionNumber > current && r.status !== 'NOT_STARTED').map((r) => r.sessionNumber))].sort((a, b) => a - b)[0];
  return {
    currentSession: current,
    plannedSessions: planned,
    says: theHeaderSays(current, planned, allFinished),
    whileOpen: ahead ? whatEachSessionSays(ahead, theirs, current, now, handOn).says : null,
  };
}
