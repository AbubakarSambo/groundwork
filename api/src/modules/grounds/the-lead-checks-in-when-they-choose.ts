import { PartyType } from '@prisma/client';

/**
 * THE LEAD CHECKS IN WHEN THEY CHOOSE (decision 133, change 5).
 *
 * The lead does their first check-in straight after setup, in the same conversation. After that
 * their check-ins are optional: they get no participant reminders (only the daily nudge, which
 * never asks them to check in), no session is made for them on the schedule, and they count in a
 * session's numbers only when they check in that session. A session they skip is never counted as
 * missed, late or overdue, on any board, count or message.
 *
 * The same holds for a lead who chose "only the team" before (`managingOnly`): they have the same
 * way back in ("Check in yourself") and are optional like any lead.
 *
 * This is the one rule every count reads. A lead's check-in rows also carry `optional: true`
 * (CheckIn.optional) so a later count, such as the missed check-ins pattern (change 8), can leave
 * them out from the data alone.
 */
export type SomebodyOnTheCheckIn = { partyType?: string | null; managingOnly?: boolean | null };

/** True for the lead (and any managing-only row): nobody waits on them, and a skipped session is never missed. */
export function checksInOnlyWhenTheyChoose(p: SomebodyOnTheCheckIn | null | undefined): boolean {
  return !!p && (p.partyType === PartyType.INITIATOR || p.managingOnly === true);
}

/** Whether a session waits on this person. The lead never; everybody else as before. */
export function owesThisSession(p: SomebodyOnTheCheckIn | null | undefined): boolean {
  return !!p && !checksInOnlyWhenTheyChoose(p);
}

/**
 * The Prisma filter for "the people a session counts": everybody who owes it, and the lead only
 * when they answered that session.
 */
export function whoASessionCounts(sessionNumber: number, anAnswer: readonly string[]) {
  return {
    OR: [
      { managingOnly: false, partyType: PartyType.PARTICIPANT },
      /* A set-up conversation is never an answer (the anchor's own rule). */
      { checkIns: { some: { sessionNumber, status: { in: [...anAnswer] as any }, isSetup: false } } },
    ],
  };
}
