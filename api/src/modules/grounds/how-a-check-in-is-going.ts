import { whichRoundIsOpen } from '../board/which-round-is-open';
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
  /** The situation, for the population rule: a managing-only lead answers session one and no more. */
  scenario?: string | null;
  dependencies: unknown[];
  timelineDays: number | null;
  cadence: string | null;
  /** The newest round's shared picture, if one has been taken. */
  sharedPicture: string | null;
  /** The opening, written once as plain sentences. Preferred over slicing the picture. */
  theOpening?: string | null;
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
  /*
   * THE OPENING, NOT THE FIRST THREE SENTENCES OF THE REPORT.
   *
   * This sliced `sharedPicture`, so the board's summary was whatever the report happened to open
   * with - which, across the twenty-four-scenario run, was the glued opening every single time
   * (problem 12 of twelve: "the board copies the report's first paragraph").
   *
   * The opening is now written once as plain sentences and kept in its own column, so this reads
   * the sentence somebody wrote for the job. The slice stays as the fallback, for a report written
   * before the column existed or one whose wording call fell back - flat, but never empty.
   */
  const latestSummary = (it as any).theOpening?.trim()
    ? notTheWordParty(String((it as any).theOpening).trim())
    : it.sharedPicture
      ? sentencesIn(notTheWordParty(it.sharedPicture)).slice(0, 3).join(' ').trim() || null
      : null;

  /*
   * THE HIGHEST SESSION NUMBER IS NEXT WEEK'S ROW, NOT THE OPEN ROUND.
   *
   * Next round's check-ins are written ahead of time, all NOT_STARTED, so taking the highest number
   * picked the untouched one the moment the real round closed. Everything below then counted a round
   * with nothing in it.
   *
   * Read live, on a board opened straight after finishing session 1: "Progress 0 of 1 rounds, 0 of 1
   * answered this round", "0 sessions done". She had just done the whole thing. The whole board read
   * as empty.
   *
   * This is the fourth copy of this rule to get it wrong, and the third today. It is one function
   * now and this asks it. See which-round-is-open.ts.
   */
  const roundsPlanned = totalSessionsFor(it.timelineDays as any, it.cadence as any) ?? null;
  /* There is no round after the last planned one: a stray session-2 row on a one-session run made the board
     read "0 of 2 answered this round" to somebody who had just answered (21 Sep 2026). */
  const openRoundRaw = sessions.length ? whichRoundIsOpen(sessions as any) : 1;
  const openRound = roundsPlanned && roundsPlanned > 0 ? Math.min(openRoundRaw, roundsPlanned) : openRoundRaw;
  const glance = atAGlance(
    {
      roundsDone,
      roundsPlanned,
      people: (it.participants ?? []) as any,
      /* Which round, and the situation, so the population rule can be asked rather than guessed at. */
      sessionNumber: openRound,
      scenario: (it as any).scenario ?? null,
      thisRound: sessions.filter((c) => (c.sessionNumber ?? 1) === openRound) as any,
      dependencies: (it.dependencies ?? []) as any,
    },
    now,
  );

  return { latestSummary, glance };
}
