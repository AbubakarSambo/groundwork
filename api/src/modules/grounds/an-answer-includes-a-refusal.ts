import { CheckInStatus } from '@prisma/client';

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
