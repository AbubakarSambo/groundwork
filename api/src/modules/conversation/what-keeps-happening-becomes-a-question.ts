import { whatToAskAbout } from '../patterns/pattern-library';
import { hasBeenSeenInThreePeriods } from '../patterns/who-reads-a-pattern';

/**
 * A PATTERN THAT KEEPS SHOWING UP BECOMES A QUESTION IN THE NEXT CHECK-IN.
 *
 * The pattern library was written with a `probe` on every code - the ordinary question to ask about
 * the work when that thing keeps happening - and `whatToAskAbout` reached exactly one caller: the
 * board, where it renders as a suggestion to a lead. So the person it is actually about was never
 * asked anything, and the one surface in the product that could have asked naturally, in the moment,
 * with their own words still on the screen, was the one surface that never saw it.
 *
 * THE SAME GATES AS THE PRIVATE NOTE, AND FOR THE SAME REASONS.
 *
 * SURFACED, never CANDIDATE: a candidate is the engine's first read, and putting a candidate to
 * somebody as a settled thing about them is the accusation this product refuses to make.
 *
 * THE REAL RECURRENCE FLOOR IS THREE PERIODS, WHETHER OR NOT THEY ARE IN A ROW (decision 8;
 * decision 57, item 8, 30 September 2026). It is not safe to trust `status: SURFACED` alone for
 * that: `observePositive` sets a good-news code SURFACED the moment it is seen ONCE, because a
 * board may say so immediately - but shaping a question in the next check-in is a different use of
 * the same row, and this decision holds it to the same three-period floor as everything else. So
 * `theOneWorthAsking` checks the honest count itself, `hasBeenSeenInThreePeriods` from
 * who-reads-a-pattern.ts, rather than trusting the status column a caller filtered on.
 *
 * The alignment-feed-only codes are excluded by `whatToAskAbout` itself, by construction rather
 * than by anybody remembering - those exist precisely because naming them to the person would do
 * harm.
 *
 * AND THE PATTERN IS NEVER NAMED. The same rule the role probes already hold: ask about the work,
 * never about the shape. "You keep committing to things and not coming back to them" is a verdict
 * delivered by a machine. The probe is a question about a specific piece of work, and how somebody
 * answers it is the signal - ours to read, not theirs to be told.
 */

export interface Recurring {
  code: string;
  periodsObserved: number;
  /** Every period it was really seen in, gaps included - what `hasBeenSeenInThreePeriods` reads. */
  seenInSessions?: number[] | null;
  /** The engine's own plain-language observation. Used to pick, never to quote at anybody. */
  observationText?: string | null;
  /**
   * WHETHER SOMEBODY HAS ALREADY SAID THIS READ WAS WRONG.
   *
   * `false` means a person with the standing to know rated it inaccurate. Asking about it anyway is
   * the product ignoring a correction it asked for - the same fault as a report that keeps counting
   * a line somebody unsaid. `null` is not yet rated and is the ordinary case.
   */
  accuracyRating?: boolean | null;
}

/**
 * At most one. Two questions about two recurring things in one check-in is an interrogation, and
 * the check-in is not for this - it is for what the person did. The longest-running one wins,
 * because that is the one least likely to be noise and most likely to be worth the single ask.
 */
export function theOneWorthAsking(rows: Recurring[]): { code: string; probe: string } | null {
  const eligible = rows
    .filter((r) => hasBeenSeenInThreePeriods(r))
    .filter((r) => r.accuracyRating !== false)
    .map((r) => ({ ...r, probe: whatToAskAbout(r.code) }))
    .filter((r): r is Recurring & { probe: string } => !!r.probe)
    .sort((a, b) => b.periodsObserved - a.periodsObserved || a.code.localeCompare(b.code));
  const top = eligible[0];
  return top ? { code: top.code, probe: top.probe } : null;
}

/**
 * What goes into the prompt, or nothing.
 *
 * "When it genuinely fits" is not politeness. A question asked because a machine had one queued,
 * dropped into a conversation it does not belong in, is how a check-in starts feeling like a form -
 * and the whole reason this is a conversation is that a form was not getting honest answers.
 */
export function askAboutItBlockFor(one: { probe: string } | null): string {
  if (!one) return '';
  /*
   * THIS WAS WRITTEN AS A PERMISSION AND IT BEHAVED LIKE ONE.
   *
   * "Ask this when it genuinely fits... if it does not fit this conversation, leave it." Measured on
   * 18 September 2026 across all 22 situations from both sides, with the block confirmed present in
   * the assembled prompt at 540 characters: it was asked ZERO times. An optional instruction sitting
   * two thirds of the way down a hundred and eighteen thousand characters is a suggestion about a
   * suggestion.
   *
   * It is a question now, and it is owed within the session rather than on any particular turn - the
   * model still picks the moment, which is the part that was right. What is gone is the standing
   * permission to skip it, and the block goes last in the prompt rather than into the middle.
   *
   * WHAT DOES NOT CHANGE, because it is the reason the wording was careful in the first place: it is
   * asked as an ordinary question about the work, the pattern is never named, and nobody is told
   * they have a habit.
   */
  return `THE ONE QUESTION THIS SESSION OWES

Something in this person's record has come up in three separate periods. You are not going to say
that, and you are not going to name it. You are going to ask this, in your own words, as an
ordinary question about the work:

- ${one.probe}

ASK IT WITHIN THE NEXT TWO REPLIES. Pick whichever of them it fits best - straight after they
describe something it touches is ideal - but if you reach a third reply without having asked it,
ask it then, plainly, as your question for that turn.

THE DEADLINE IS TWO REPLIES AND NOT "BEFORE THE SESSION ENDS", and the difference is the whole
reason this is worded again. Measured on 18 September 2026: told to ask before the session ended,
it was asked in six conversations out of twenty-two - because the sessions do not end. One of
forty-four reached a close. A deadline that never arrives is not a deadline.

NEVER say that it keeps happening, never name the pattern, and never tell them they have a habit, a
tendency or a recurring anything. Ask about the work. How they answer is the signal, and it is yours
to read rather than theirs to be told.`;
}
