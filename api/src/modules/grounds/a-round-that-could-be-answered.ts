/**
 * WHEN A ROUND COULD HAVE BEEN ANSWERED, SAID ONCE (run 6, 20 November).
 *
 * "A miss" was worked out in four places, each with some of the conditions: the lead's morning, the weekly letter, the Today line and the person's own
 * history. Run 6 showed the gaps. Amani answered every week, yet his lead read "so call Amani" for rounds of 3, 10 and 17 November, which opened before
 * anybody had said anything in the check-in. A round that opened while the organisation was paused was counted as missed by the board and the weekly letter.
 *
 * A round can be missed only if it opened (1) once the person had joined, (2) once the check-in had begun, which is the first time anybody said
 * something in it, and (3) before the organisation paused, because nothing about the work goes out in a pause and nobody can answer.
 * Every reader of "missed" asks this.
 */
import { wasAQuietClose } from './an-answer-includes-a-refusal';

export interface WhatMadeARoundImpossible {
  /** When Groundwork paused for the organisation, if it is paused now (billing/the-trial-grace.ts). */
  pausedFrom?: Date | string | null;
  /** Pauses that are over (billing/the-trial-grace.ts, thePausesThatAreOver): a round that opened inside one could not be answered. */
  pausesOver?: { from: Date | string; until: Date | string }[] | null;
  /** When this person joined the check-in. */
  joinedAt?: Date | string | null;
  /** When anybody first said something in the check-in (whenACheckInBegan). */
  checkInBeganAt?: Date | string | null;
}

const ms = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

export function aRoundCouldHaveBeenAnswered(openedAt: Date | string | null | undefined, o: WhatMadeARoundImpossible = {}): boolean {
  const opened = ms(openedAt);
  if (opened === null) return true;
  const paused = ms(o.pausedFrom);
  if (paused !== null && opened >= paused) return false;
  for (const p of o.pausesOver ?? []) { const from = ms(p.from); const until = ms(p.until); if (from !== null && until !== null && opened >= from && opened < until) return false; }
  const joined = ms(o.joinedAt);
  /* A day's grace: a person joins part-way through the day their first round opened. */
  if (joined !== null && opened < joined - 24 * 3_600_000) return false;
  const began = ms(o.checkInBeganAt);
  if (began !== null && opened < began - 24 * 3_600_000) return false;
  return true;
}

/** When anybody first said something in the check-in: the earliest first answer in any person's round. Null where nobody has said anything yet. */
export function whenACheckInBegan(rows: { isSetup?: boolean | null; turns?: { createdAt?: Date | string | null }[] | null }[]): Date | null {
  let first: number | null = null;
  for (const r of rows) {
    if (r.isSetup) continue;
    const t = ms(r.turns?.[0]?.createdAt ?? null);
    if (t !== null && (first === null || t < first)) first = t;
  }
  return first === null ? null : new Date(first);
}

/**
 * WHETHER A ROW IS A ROUND TO COUNT AT ALL (run 8, 22 November). A round the person finished counts. A round the clock closed with nothing said counts only if it
 * could have been answered. Readers had written "completed, or could have been answered", which let a round that closed in a pause, with nothing said, stand
 * as "the check-in was not done". Every reader of "did N of M" asks this.
 */
export function aRoundIsCounted(
  row: { status?: string | null; closedReason?: string | null; turns?: unknown[] | null; personTurns?: number | null; availableFrom?: Date | string | null; createdAt?: Date | string | null },
  o: WhatMadeARoundImpossible = {},
  /** The person's record has always counted a round the clock closed with nothing said, whenever the person joined, so for it only the pause is asked. */
  aQuietCloseOnlyAsksThePause = false,
): boolean {
  const opened = row.availableFrom ?? row.createdAt ?? null;
  const done = String(row.status ?? '').toUpperCase() === 'COMPLETED';
  if (done && !wasAQuietClose(row)) return true;
  if (done && aQuietCloseOnlyAsksThePause) return aRoundCouldHaveBeenAnswered(opened, { pausedFrom: o.pausedFrom, pausesOver: o.pausesOver });
  return aRoundCouldHaveBeenAnswered(opened, o);
}

/**
 * THE SESSIONS A PAUSE OPENED: every row of the session opened once Groundwork had paused, so nothing was sent and nobody could answer it. The one owner of that
 * for lists of sessions (the Reports list's "N of M checked in", the "Over time" rounds), which must leave such a session out rather than count it as nobody
 * answering (run 9). A session with any row opened before the pause is not one of them.
 */
export function sessionsAPauseOpened(rows: { sessionNumber?: number | null; availableFrom?: Date | string | null; createdAt?: Date | string | null }[], pausedFrom: Date | string | null | undefined): Set<number> {
  const out = new Set<number>();
  if (!pausedFrom) return out;
  const bySession = new Map<number, typeof rows>();
  for (const r of rows ?? []) bySession.set(Number(r.sessionNumber) || 0, [...(bySession.get(Number(r.sessionNumber) || 0) ?? []), r]);
  for (const [n, rs] of bySession) if (n > 0 && rs.every((c) => !aRoundCouldHaveBeenAnswered(c.availableFrom ?? c.createdAt ?? null, { pausedFrom }))) out.add(n);
  return out;
}
