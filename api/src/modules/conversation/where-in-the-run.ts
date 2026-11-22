import { GroundMoment } from '@prisma/client';

/**
 * WHERE THIS CHECK-IN SITS, AND WHERE THE GROUND JOINED THE ARC. TWO DIFFERENT FACTS.
 *
 * The engine received `sessionNumber`, `totalSessions` and `moment`, and was told the meaning of none
 * of them. `SESSION: 3 of 6` is arithmetic; it does not say that this is a middle session, that three
 * remain, or that a middle session reads work against an objective rather than going looking for one.
 *
 * WHY TWO AND NOT ONE. `moment` is write-once - nothing updates it - so a 90-day ground opened at the
 * start still says STARTING in its final session. The moment can therefore never tell the engine it is
 * closing. What it says is what session ONE was for. Position is what changes, and position is what
 * decides whether a session opens, tracks or closes.
 *
 * The distinction matters most at the two ends. A first session on a ground opened at the start has no
 * evidence to ask for, because nothing has happened yet. A first session on a ground opened mid-way has
 * plenty, and going looking for an objective is the job. Collapsing the two is how a plan came out
 * telling the engine to drive to a decision using a value that can never say the end has arrived.
 */
export type RunPosition = 'first' | 'middle' | 'last';

export function positionInRun(sessionNumber: number, totalSessions: number | undefined, runsUntilEnded = false): RunPosition {
  /* A check-in that runs until the lead ends it has no planned last session. Every session after the
     first is a middle one, however many there have been. Only the lead ending it closes it. */
  if (runsUntilEnded) return sessionNumber <= 1 ? 'first' : 'middle';
  const total = totalSessions && totalSessions > 0 ? totalSessions : 1;
  if (sessionNumber <= 1) return 'first';
  /**
   * A session beyond the planned total is still the last one, not a middle one.
   *
   * Grounds get extended, and sessions can be added. Treating session 7 of a planned 6 as "middle"
   * would mean the run never reaches a close, which is the failure this whole distinction exists to
   * prevent.
   */
  if (sessionNumber >= total) return 'last';
  return 'middle';
}

export function sessionsRemaining(sessionNumber: number, totalSessions: number | undefined): number {
  const total = totalSessions && totalSessions > 0 ? totalSessions : 1;
  return Math.max(0, total - sessionNumber);
}

/** What the engine should understand this position to mean, in one line it can act on. */
const POSITION_MEANING: Record<RunPosition, string> = {
  first:
    'this is the FIRST check-in of the run. Nothing has been tracked yet. What this session must produce is a checkable, dated statement of what is being worked to.',
  middle:
    'this is a MIDDLE check-in. An objective already exists: open from what this person said they own, read the work against it, and ask whether the target itself has changed and who agreed that. Do not invent a new objective because you cannot find the old one - not finding one is itself the finding.',
  last:
    'this is the LAST planned check-in. Drive to a decision against what was agreed. Do not set a new long-range target on a run that is ending, and do not accept a changed target now - changing it here turns a miss into a success.',
};

/**
 * What the ground joining at this moment implies for session one only.
 *
 * RECOGNITION IS THE MIDDLE, not the recognition scenario. The enum value predates this and rows hold
 * it, so it stays and the words people read say "mid-way".
 */
const MOMENT_MEANING: Record<GroundMoment, string> = {
  STARTING:
    'this ground opened AT THE START of the situation. Session one is where the objective gets set, so there is genuinely no delivery to ask about yet and "nothing yet" is a legitimate answer.',
  RECOGNITION:
    'this ground opened MID-WAY through a situation that was already running. An objective probably exists somewhere already: session one goes and finds what this person believes they are working to, rather than inventing one. If nobody can name one, that is the finding.',
  RESOLUTION:
    'this ground opened AS THE SITUATION IS ENDING. It is short, and it is only ever closing: establish what was agreed, what actually exists now, and what the decision is.',
};

export function whereInTheRun(input: {
  sessionNumber: number;
  /**
   * Which of this person's own conversations it is (theirOwnSessionNumber). Their first is a first check-in, wherever the team's run
   * is: Sade, added in session 3, was told "since our last check-in" in her first (re-test, 22 November evening, R-13), because the
   * position was read from the team's session and said MIDDLE ("open from what this person said they own"). What is left of the run
   * stays the team's.
   */
  theirOwnSession?: number;
  /** Runs until the lead ends it: no total, no "further check-ins planned", no run length. */
  runsUntilEnded?: boolean;
  totalSessions?: number;
  moment?: GroundMoment | null;
  timelineDays?: number | null;
}): string[] {
  const theirFirst = input.theirOwnSession === 1;
  if (input.runsUntilEnded) {
    const position = theirFirst ? 'first' : positionInRun(input.sessionNumber, undefined, true);
    const lines = [
      `WHERE_IN_THE_RUN: ${position} - ${POSITION_MEANING[position]} This check-in runs until the lead ends it. There is no planned last check-in, so never say how far through it is, never say it is halfway or nearly over, and never wrap up as if this were the last one.`,
    ];
    if (input.moment) lines.push(`MOMENT: ${input.moment} - ${MOMENT_MEANING[input.moment]}`);
    return lines;
  }
  const position = theirFirst ? 'first' : positionInRun(input.sessionNumber, input.totalSessions);
  const remaining = sessionsRemaining(input.sessionNumber, input.totalSessions);
  const lines = [
    `WHERE_IN_THE_RUN: ${position} - ${POSITION_MEANING[position]} ${
      remaining === 0 ? 'No further check-ins are planned.' : `${remaining} further check-in(s) planned after this one.`
    }`,
  ];
  if (input.moment) lines.push(`MOMENT: ${input.moment} - ${MOMENT_MEANING[input.moment]}`);
  if (input.timelineDays != null) lines.push(`RUN_LENGTH: ${input.timelineDays} day(s) in total.`);
  return lines;
}
