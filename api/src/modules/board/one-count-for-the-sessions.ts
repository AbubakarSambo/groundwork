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

const asDate = (d: Date | string | null | undefined): Date | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t;
};

/** "30 September", counted in Lagos time like every board date, with the year only when it is not this one. */
export function aDayPeopleRead(d: Date, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const thisYear = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(now);
  return `${get('day')} ${get('month')}${get('year') === thisYear ? '' : ` ${get('year')}`}`;
}

export function theHeaderSays(openRound: number, planned: number | null, allFinished: boolean): string {
  if (planned && allFinished) return `Session ${planned} of ${planned}, finished.`;
  return planned && planned >= openRound ? `Session ${openRound} of ${planned}.` : `Session ${openRound}.`;
}

export function whatEachSessionSays(n: number, rows: ASessionRow[], openRound: number, now = new Date()): { says: string; openedOn: Date | null } {
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
  if (started) return { says: `Session ${n} has started for some people, while session ${openRound} is still open.`, openedOn };
  if (came) return { says: `Session ${n} opened on ${aDayPeopleRead(came, now)}, while session ${openRound} is still open.`, openedOn };
  if (opensLater) return { says: `Session ${n} opens on ${aDayPeopleRead(opensLater, now)}.`, openedOn: null };
  return { says: `Session ${n} has not opened yet.`, openedOn: null };
}
