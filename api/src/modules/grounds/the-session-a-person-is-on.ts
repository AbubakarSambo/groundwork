import { theQuietHoursNow } from '../../common/the-clock';
import { theSessionClock } from '../board/one-count-for-the-sessions';
import { whoHoldsTheClock, thePlannedSessionsOf } from './this-sessions-count';

/**
 * A PERSON'S SESSIONS ARE THE TEAM'S SESSIONS (Hafsah, 22 November 2026: "fix if you see something").
 *
 * Somebody added late had their first row written as session 1 while the team was on session 3, so their finished check-in was stored,
 * reported and mailed as session 1 ("check-in 1 is complete ... 7 people took part"). Two owners, used everywhere:
 *
 *   theSessionANewcomerStartsIn   the session number a person's first row is written with: the team's session now, by the one clock
 *                                 (theSessionClock: the latest session that has begun). Before anything has begun, 1. Every later row
 *                                 is that plus one, so their rows are in the team's numbering from the start.
 *   theirOwnSessionNumber         which of THEIR OWN sessions a row is: 1 for their first conversation, whatever the team's number. The
 *                                 first-session introduction, the role question and the first-time coaching read this, so somebody added
 *                                 in session 3 still gets them.
 *
 * Rows written before this (late joiners numbered from 1) are still counted in the team's numbering by inTheTeamsNumbering
 * (board/which-round-is-open.ts); once those rows are numbered again in a one-off re-read, that renumbering does nothing and can go.
 */
export async function theSessionANewcomerStartsIn(db: any, groundId: string, now: Date = theQuietHoursNow()): Promise<number> {
  const ground = await Promise.resolve(db?.ground?.findUnique?.({
    where: { id: groundId },
    select: {
      timelineDays: true, cadence: true, cadenceDays: true, runsUntilEnded: true,
      participants: { where: { leftAt: null }, select: { id: true, userId: true, partyType: true, managingOnly: true, joinedAt: true, user: { select: { awaitingOrgApproval: true } } } },
      checkIns: { where: { isSetup: false }, select: { participantId: true, sessionNumber: true, status: true, availableFrom: true, createdAt: true } },
    },
  })).catch(() => null);
  const rows = (ground?.checkIns ?? []) as any[];
  if (!rows.length) return 1;
  return theSessionClock(rows, whoHoldsTheClock(ground.participants ?? []), thePlannedSessionsOf(ground), now).currentSession || 1;
}

/**
 * Which of their own sessions this row is: 1 when they have no earlier row, otherwise one more than the session numbers of theirs
 * below it. Every row of theirs counts, the lead's optional and set-up rows included, so for everybody numbered from 1 this is
 * exactly their session number, and only somebody added late reads differently.
 */
export async function theirOwnSessionNumber(db: any, c: { participantId: string; sessionNumber: number }): Promise<number> {
  if (!c || c.sessionNumber <= 1) return c?.sessionNumber ?? 1;
  const earlier = await Promise.resolve(db?.checkIn?.findMany?.({
    where: { participantId: c.participantId, sessionNumber: { lt: c.sessionNumber } },
    select: { sessionNumber: true },
    distinct: ['sessionNumber'],
  })).catch(() => null);
  return Array.isArray(earlier) ? new Set(earlier.map((r: any) => r.sessionNumber).filter((n: number) => n < c.sessionNumber)).size + 1 : c.sessionNumber;
}

/** The same, over rows already in hand (the list, Today): which of their own sessions this one is. */
export function theirOwnSessionNumberIn(rows: { participantId: string; sessionNumber: number }[], c: { participantId: string; sessionNumber: number }): number {
  return new Set((rows ?? []).filter((r) => r.participantId === c.participantId && r.sessionNumber < c.sessionNumber).map((r) => r.sessionNumber)).size + 1;
}
