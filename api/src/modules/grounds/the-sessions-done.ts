import { CheckInStatus } from '@prisma/client';
import { awayUntilOn, type Stretch } from '../suites/who-is-away';
import { wasAQuietClose } from './an-answer-includes-a-refusal';
import { isNotLetInYet } from './who-an-admin-did-not-let-in';
import { inTheTeamsNumbering } from '../board/which-round-is-open';

/**
 * HOW MANY SESSIONS ARE DONE, COUNTED ONCE (pilot, 12 November: People and setup said "0 of 12" and "1 of 12" while the board said
 * one was done, because three places each counted). The board, People and setup and a person's own page all read these two functions.
 */

/**
 * THE ROWS THAT ARE A PERSON'S SESSIONS, as a query: not the set-up, a correction, a clarification, a line after sign-off or an optional
 * extra. My work, the person's record, the lead's morning and a person's own "on time" all read this, so none of them counts a
 * clarification on Sunday as a check-in missed on Sunday (release test, 21 November 2026).
 */
export const A_SESSION_OF_THEIRS = { isSetup: false, isSelfCorrection: false, isClarification: false, isPostSignOff: false, optional: false } as const;

/** The session rows that count: set-up rows are not sessions, and a row still to answer for somebody not let in yet is not waited on. */
export function theSessionRowsOf<T extends { participantId?: string | null; status: any; isSetup?: boolean | null }>(checkIns: T[], participants: unknown[]): T[] {
  const heldOut = new Set((participants as any[]).filter(isNotLetInYet).map((p: any) => p.id));
  /* In the team's numbering: somebody added late does their first session in the team's session (inTheTeamsNumbering). */
  return (inTheTeamsNumbering((checkIns ?? []).filter((ci) => !ci.isSetup) as any[]) as T[])
    .filter((ci) => !(ci.participantId && heldOut.has(ci.participantId) && ci.status !== CheckInStatus.COMPLETED && ci.status !== CheckInStatus.DECLINED));
}

/**
 * A round is done when EVERY party's check-in for it is COMPLETED (or the person was away), and somebody did it, or when the check-in's
 * clock has moved past it (`theClocksSession`, theSessionClock): its time is over, whoever missed it (release test, 21 November 2026:
 * People and setup said "1 of 12 sessions done" on session 3, and the board "Check-in 3 of 12" beside "One of the 12 check-ins is done").
 * Counting rows reads as double on a two-party check-in ("24 of 12").
 */
export function theRoundsDone(sessions: { sessionNumber: number; status: any; participantId?: string | null; availableFrom?: Date | null; createdAt?: Date | null }[], leave: Map<string, Stretch[]> | undefined, now: Date, theClocksSession?: number | null): number {
  const excused = (ci: any): boolean => {
    if (ci.status === CheckInStatus.COMPLETED || !leave || !ci.participantId) return false;
    const mine = leave.get(ci.participantId);
    if (!mine) return false;
    const opened = ci.availableFrom ?? ci.createdAt;
    return !!awayUntilOn(mine, now) || (!!opened && !!awayUntilOn(mine, new Date(opened)));
  };
  const numbers = [...new Set(sessions.map((ci) => ci.sessionNumber))];
  return numbers.filter((n) => {
    const row = sessions.filter((ci) => ci.sessionNumber === n);
    if (theClocksSession != null && n < theClocksSession) return true;
    return row.every((ci) => ci.status === CheckInStatus.COMPLETED || excused(ci)) && row.some((ci) => ci.status === CheckInStatus.COMPLETED);
  }).length;
}

/** One person's own sessions done: distinct session numbers, so a session answered and then corrected counts once. */
export function theSessionsDoneBy(checkIns: { participantId?: string | null; status: any; isSetup?: boolean | null; sessionNumber?: number | null; closedReason?: string | null; turns?: unknown[] | null }[], participantId: string): number {
  return new Set(
    (checkIns ?? [])
      .filter((c) => c.participantId === participantId && c.status === 'COMPLETED' && !c.isSetup && !wasAQuietClose(c))
      .map((c) => c.sessionNumber ?? 0),
  ).size;
}
