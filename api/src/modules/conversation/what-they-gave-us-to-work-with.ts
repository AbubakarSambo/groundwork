/**
 * WHAT THEY GAVE US TO WORK WITH, SAID BACK TO THEM.
 *
 * Hafsah, 23 September 2026: "specificity should be communicated to each user after their checkin."
 *
 * It has been measured on every message since long before today - `runIntake` reads each answer and
 * `specificityHistory` keeps the last five - and it has only ever been used to pick the model's
 * tone. The prompt that carries it says, in its own words, "behind the curtain - never name these
 * system terms to the person". So the one person who could act on it was the only one never told.
 *
 * WHY NOT A SCORE. Two customers spent this morning telling us what an ungrounded number is worth:
 * "the report did not classify things or assess or recommend well", "too abstract". A person handed
 * "specificity: 0.34" learns nothing and is being graded by a machine on a scale nobody explained.
 * So this says the two things that are actually true and actually useful: what they gave that
 * anybody can check, in their own words, and what is still missing from it.
 *
 * AND IT IS NOT A SCOLDING. Somebody has just given five minutes of their own work to a check-in
 * they did not ask for. The strength line is said first because it is the part they will believe,
 * the gap is stated as a fact about the record rather than a fault in them, and where there is
 * nothing to add it says so and stops. See a-correction-is-not-a-scolding.
 */
import type { Claim, WhatWeHave } from './what-we-have-so-far';
import type { SpecificityLevel } from './how-checkable-a-session-was';

/** The four things that make a claim checkable by somebody who was not in the conversation. */
const WHAT_MAKES_IT_CHECKABLE = ['number', 'date', 'place', 'verification'] as const;

/**
 * THE LEVEL THE PRODUCT ALREADY SCORED, IN WORDS A PERSON WOULD USE ABOUT THEIR OWN ANSWERS.
 *
 * The four levels are the ones already on the check-in - managed, vague, directional, specific -
 * and they are the engine's vocabulary, not anybody's. Nobody has ever been told their check-in was
 * "directional" and understood it, and "managed" said to somebody's face is an accusation.
 *
 * So the level is said as what it means for the person reading the answers, and never as a label
 * attached to the one who gave them.
 */
export const WHAT_THE_LEVEL_MEANS: Record<SpecificityLevel, string> = {
  specific: 'Somebody who was not here could act on this.',
  directional: 'The direction is clear; the figures behind it are not all there yet.',
  vague: 'A reader would not be able to check most of this.',
  managed: 'There is nothing here yet that anybody else could check.',
};

export interface WhatTheyGave {
  /** How many of their claims carry something anybody could check. */
  checkable: number;
  /** How many carry nothing: a statement that cannot be stood on by anybody else. */
  general: number;
  /** Up to three of theirs, in their words, that a reader can use. */
  theStrongest: string[];
  /** Up to two of theirs that would become usable with one more detail, and which detail. */
  worthAdding: { said: string; needs: string }[];
  /** What to say, whole, or empty where there is nothing honest to say. */
  saying: string;
}

/**
 * CHECKABLE MEANS NOTHING IS STILL MISSING FROM IT.
 *
 * The first version asked only whether the claim carried any one of the four, and the output
 * contradicted itself on its own first run: "2 of 2 things you said can be checked", and then
 * underneath, both of those two with a detail they still needed. Told to somebody about their own
 * words that is not a small inconsistency - it is the product not knowing what it thinks.
 *
 * So the two halves are cut from one line. A claim is checkable when it carries something to check
 * AND has no outstanding gap; everything else is in the half that names what it needs. That also
 * makes the count match what the conversation was pushing on live: "increase their incomes by 30%"
 * with no baseline is a number nobody can stand on, and the engine says so while they are still in
 * the room.
 */
const isCheckable = (c: Claim) =>
  WHAT_MAKES_IT_CHECKABLE.some((k) => !!(c as any)[k]) && whatItStillNeeds(c) === null;

/**
 * THE ONE THING MISSING THAT WOULD MAKE THIS CLAIM USABLE, in the words a person would use.
 *
 * BY KIND, because the first version asked every claim for a baseline and told somebody that "I plan
 * to run interventions to impact 30,000 women farmers" needed "what it is a change from". It does
 * not. A baseline is a target's question - a change in a measure is meaningless without the number
 * it changed from - and a plan's questions are when, who and where. Read off the real notes of a
 * real check-in, which is the only way this kind of wrongness shows up.
 *
 * ONE THING, NOT A LIST. The person is about to close the tab. The most valuable missing detail is
 * worth saying; the second one turns a useful note into homework.
 */
export function whatItStillNeeds(c: Claim): string | null {
  /* Never given fields and never challenged - see the extractor. Asking an opinion for a figure is
     how a conversation starts arguing with somebody about what they think. */
  if (c.kind === 'OPINION') return null;
  if (!c.number && !c.measure) return 'a number, or what would go up or down';
  if (c.kind === 'TARGET') {
    if (!c.baseline) return 'what it is a change from';
    if (!c.verification) return 'where that figure would come from';
    if (!c.date) return 'by when';
    return null;
  }
  if (c.kind === 'PLAN') {
    if (!c.date) return 'by when';
    if (!c.place) return 'where';
    if (!c.owner) return 'who does it';
    return null;
  }
  /* A FACT with a figure and no way to check it is the one a reader cannot use. */
  if (!c.verification && !c.date && !c.place) return 'where that comes from';
  return null;
}

/**
 * HOW IT READS OVERALL, in one plain clause and never as a grade.
 *
 * The bands are wide on purpose. A person cannot act on the difference between 0.41 and 0.48, and
 * pretending the measurement is finer than it is would be the same overclaiming the report was
 * thrown out for.
 */
export function howItReads(checkable: number, general: number): string {
  const all = checkable + general;
  if (!all) return '';
  if (checkable === all) return 'Everything you said can be checked by somebody who was not here.';
  /* Not "carries no number": they may have given one and left out what it is a change from, and
     being told they gave no numbers when they gave one is the product contradicting them. */
  if (checkable === 0) return 'Nothing you said yet is complete enough for somebody else to check.';
  if (checkable >= general) return `Most of what you said can be checked: ${checkable} of ${all}.`;
  return `Some of what you said can be checked: ${checkable} of ${all}.`;
}

export function whatTheyGaveUs(
  notes: WhatWeHave | null | undefined,
  level?: SpecificityLevel | null,
): WhatTheyGave {
  const claims = (notes?.claims ?? []).filter((c) => c?.said?.trim());
  const checkable = claims.filter(isCheckable);
  const general = claims.filter((c) => !isCheckable(c));
  const theStrongest = checkable
    /* The ones carrying the most that can be checked come first: those are the ones a reader uses. */
    .map((c) => ({ c, weight: WHAT_MAKES_IT_CHECKABLE.filter((k) => !!(c as any)[k]).length }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((x) => x.c.said.trim());
  /* Only from the half that is actually missing something - see isCheckable. */
  const worthAdding = general
    .map((c) => ({ said: c.said.trim(), needs: whatItStillNeeds(c) }))
    .filter((x): x is { said: string; needs: string } => !!x.needs)
    .slice(0, 2);

  const lines: string[] = [];
  const reads = howItReads(checkable.length, general.length);
  if (reads) lines.push(reads);
  /*
   * THE SCORED LEVEL SECOND, AND ONLY AS WHAT IT MEANS.
   *
   * After the count, because the count is the part they can verify for themselves by looking at
   * their own answers - and a judgement that arrives before its evidence is the thing that got the
   * report thrown out this morning.
   */
  if (level && WHAT_THE_LEVEL_MEANS[level]) lines.push(WHAT_THE_LEVEL_MEANS[level]);
  if (theStrongest.length) {
    lines.push(`What a reader can stand on: ${theStrongest.map((s) => `"${s}"`).join(', ')}.`);
  }
  if (worthAdding.length) {
    lines.push(
      `Worth adding next time: ${worthAdding.map((w) => `"${w.said}" needs ${w.needs}`).join('; ')}.`,
    );
  }
  return {
    checkable: checkable.length,
    general: general.length,
    theStrongest,
    worthAdding,
    /* Nothing to say beats a sentence with nothing in it: somebody who gave one answer and left
       does not need a paragraph about it. */
    saying: claims.length ? lines.join(' ') : '',
  };
}
