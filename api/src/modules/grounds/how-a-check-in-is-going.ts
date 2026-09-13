import { CheckInStatus } from '@prisma/client';
import { atAGlance, type AtAGlance } from './what-a-manager-needs-at-a-glance';
import { totalSessionsFor } from './session-count';
import { sentencesIn } from '../presentation/where-a-sentence-actually-ends';
import { notTheWordParty } from '../reports/not-the-word-party';

/**
 * HOW A CHECK-IN IS GOING, COMPUTED ONCE, BECAUSE THREE SCREENS ASK IT.
 *
 * The check-in list, the boards page and the board's own header all answer the same two questions -
 * how far through is this, and what is in the way - under the same summary of the round. They were
 * answered in one place and the other two simply did not have them: the board, which is the screen
 * somebody opens BECAUSE they want to know how it is going, opened on "where people differ" and
 * said nothing about progress at all.
 *
 * The rule this file exists for is the one this repo keeps paying to learn: a number computed twice
 * is two numbers. Four copies of the card names, five of the groupings, two of the durations. So
 * the arithmetic is here, the list calls it, the board calls it, and they cannot disagree about a
 * week.
 *
 * NOTHING NEW IS DECIDED HERE. Every line below was lifted from `grounds.list`, where it already
 * worked; this is where it now lives.
 */
export interface HowItIsGoing {
  /** The last round's shared picture, cut to three sentences. Null before a round has finished. */
  latestSummary: string | null;
  glance: AtAGlance;
}

export interface WhatItTakes {
  /** Every check-in row for the ground, setup rows included; they are filtered here. */
  checkIns: { sessionNumber: number; status: CheckInStatus; isSetup?: boolean | null }[];
  participants: unknown[];
  dependencies: unknown[];
  timelineDays: number | null;
  cadence: string | null;
  /** The newest round's shared picture, if one has been taken. */
  sharedPicture: string | null;
}

export function howACheckInIsGoing(it: WhatItTakes, now: Date = new Date()): HowItIsGoing {
  const sessions = (it.checkIns ?? []).filter((ci) => !(ci as any).isSetup);

  /*
   * A round is done when EVERY party's check-in for it is COMPLETED, which is the rule the ground
   * page uses. Counting check-in rows instead reads as double on a two-party ground ("24 of 12").
   */
  const numbers = [...new Set(sessions.map((ci) => ci.sessionNumber))];
  const roundsDone = numbers.filter((n) =>
    sessions.filter((ci) => ci.sessionNumber === n).every((ci) => ci.status === CheckInStatus.COMPLETED),
  ).length;

  /*
   * Cut to three sentences here rather than on a screen, because a screen cannot tell where a
   * sentence ends without a second copy of the rule - and a decimal or a closing quote is how
   * splitting on a full stop goes wrong. `sentencesIn` is the one that knows.
   */
  /*
   * AND THROUGH THE RULE, HERE, WHERE BOTH CALLERS GET IT WITHOUT REMEMBERING TO.
   *
   * This is report prose out of the database. Every path that serves it has to run the rewrite, and
   * `every-path-that-serves-report-text.spec.ts` is the guard that says so - it caught the board's
   * header the moment it started selecting sharedPicture, which is exactly the fourth instance that
   * guard was written to stop being a surprise. Applying it in the shared function rather than in
   * each caller means the next screen to ask this question cannot forget.
   */
  const latestSummary = it.sharedPicture
    ? sentencesIn(notTheWordParty(it.sharedPicture)).slice(0, 3).join(' ').trim() || null
    : null;

  const openRound = Math.max(1, ...sessions.map((c) => c.sessionNumber ?? 1));
  const glance = atAGlance(
    {
      roundsDone,
      roundsPlanned: totalSessionsFor(it.timelineDays as any, it.cadence as any) ?? null,
      people: (it.participants ?? []) as any,
      thisRound: sessions.filter((c) => (c.sessionNumber ?? 1) === openRound) as any,
      dependencies: (it.dependencies ?? []) as any,
    },
    now,
  );

  return { latestSummary, glance };
}
