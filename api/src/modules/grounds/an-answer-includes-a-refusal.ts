import { CheckInStatus } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * AN ANSWER INCLUDES A REFUSAL.
 *
 * Three functions each decided "is this session done", and they disagreed about what a DECLINED party
 * is. getSessionProgress treated a decline as an answer - its own comment says not handling it made
 * check-ins permanently stuck - while isSessionReadyForReport and recordRoundCompletion counted only
 * COMPLETED. So the admin screen said the round was complete while the report never left "forming",
 * for that session and every later one, and no cron repaired it. A frozen round, from one person
 * saying no.
 *
 * Her decision: "Round completes, report names the decline." A decline is final for that session
 * and it is an answer to it. So one list, read by all three: somebody has answered a session when
 * their check-in is COMPLETED or DECLINED. The report never claims an account it does not hold -
 * getSessionProgress already keeps `completed` and `declinedParticipantIds` apart - and a round
 * where EVERYBODY declined has no account in it and does not release a shared report from nothing:
 * every reader of this list also asks for at least one COMPLETED.
 */
export const AN_ANSWER: CheckInStatus[] = [CheckInStatus.COMPLETED, CheckInStatus.DECLINED];

/** What a shared report is built from. A round of refusals has answered, and has nothing to report. */
export const AT_LEAST_ONE_ACCOUNT = 1;

/**
 * A SESSION THE CLOCK CLOSED, WHERE THE PERSON SAID NOTHING, IS NOT AN ANSWER.
 *
 * The auto-close marks such a session COMPLETED so the round can close and a next session can open
 * (the record the clock writes is unchanged). But it was then counted as answered everywhere: "All
 * three people have answered", the picture unlocking for that person and the shared-picture mail.
 * Nothing was said, so nothing counts. The round still closes without waiting on them; they are only
 * not counted as having answered or having given an account.
 *
 * Old rows have the same shape (closedReason set, no word of the person's), so they are read the
 * same way and need no migration.
 */
export const aQuietCloseWhere = { closedReason: CLOSED_BY_THE_CLOCK, turns: { none: { role: 'PERSON' as any } } };

/** Prisma: everything except a session the clock closed with nothing said. Add it under `AND`. A null reason is kept explicitly, since `not` drops nulls. */
export const NOT_A_QUIET_CLOSE = {
  OR: [
    { closedReason: null },
    { closedReason: { not: CLOSED_BY_THE_CLOCK } },
    { turns: { some: { role: 'PERSON' as any } } },
  ],
};

/**
 * WHETHER THEY HAVE STARTED IT: THEY HAVE REPLIED (Hafsah, 3 November 2026: "the check-in only counts as started when the person first
 * replies, so the counts stay right"). The first question may be written before they ever read it (when the invitation goes out, or
 * when they open it), and a session holding only Groundwork's question is not started. Over a row read with its person turns (or a
 * count of them); a row read without them is taken at its status, as before.
 */
export function theyHaveReplied(c: { status?: string | null; turns?: unknown[] | null; personTurns?: number | null }): boolean {
  if (typeof c.personTurns === 'number') return c.personTurns > 0;
  if (Array.isArray(c.turns)) return c.turns.length > 0;
  return c.status === 'IN_PROGRESS';
}

/** The same, over a row already read with `closedReason` and a person-turn count (or the first person turn). */
export function wasAQuietClose(c: { closedReason?: string | null; turns?: unknown[] | null; personTurns?: number | null }): boolean {
  if (c.closedReason !== CLOSED_BY_THE_CLOCK) return false;
  if (typeof c.personTurns === 'number') return c.personTurns === 0;
  return Array.isArray(c.turns) ? c.turns.length === 0 : false;
}
