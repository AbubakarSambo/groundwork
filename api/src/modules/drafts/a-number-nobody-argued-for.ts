/**
 * WHY THIS NUMBER, AND HOW IT WILL BE MOVED.
 *
 * The draft already refuses to become an objective while people disagree about
 * it. That is a check on AGREEMENT, and agreement is not the same as the
 * objective being any good — six people can agree on a number none of them can
 * explain, and a draft that sailed through because nobody contested it is the
 * commonest way a bad target becomes official.
 *
 * So two more things have to be there before it seeds:
 *
 *   THE JUSTIFICATION: why this number rather than a different one. Without it
 *   the target cannot be argued with when it is missed, which sounds like a
 *   small loss until the quarter it is missed.
 *
 *   THE APPROACH: what somebody is actually going to do. A number with no
 *   approach behind it is a wish with a deadline.
 *
 * They fail differently, which is why they are two fields rather than one box.
 * A good reason with no plan is a hope. A good plan for the wrong number is
 * worse, because it works.
 */

/** Short enough that a real sentence clears it, long enough that a word does not. */
export const SHORTEST_USEFUL_ANSWER = 25;

export type MissingPiece = 'measure' | 'target' | 'justification' | 'approach';

export interface WhatTheDraftHasSoFar {
  proposedMeasure?: string | null;
  proposedTarget?: string | null;
  proposedJustification?: string | null;
  proposedApproach?: string | null;
}

/**
 * The next thing missing, and the question that asks for it.
 *
 * ONE AT A TIME, in this order. A form can show four empty boxes; a
 * conversation asking four questions at once gets one answer covering the
 * easiest of them. The order is the order somebody can actually answer in:
 * what is being measured, then what the number is, then why that number, then
 * how it moves — the last two are unanswerable before the first two exist.
 */
export function whatToAskForNext(
  draft: WhatTheDraftHasSoFar,
): { piece: MissingPiece; asks: string } | null {
  if (!said(draft.proposedMeasure)) {
    return {
      piece: 'measure',
      asks: 'What is being measured? Not the goal - the thing that will have a number against it.',
    };
  }

  if (!said(draft.proposedTarget)) {
    return { piece: 'target', asks: 'What is the number, and by when?' };
  }

  if (!enough(draft.proposedJustification)) {
    return {
      piece: 'justification',
      asks: 'Why that number rather than a smaller one you would certainly hit, or a larger one? A target nobody argued for is one nobody can argue with when it is missed.',
    };
  }

  if (!enough(draft.proposedApproach)) {
    return {
      piece: 'approach',
      asks: 'How will it be moved? A number with no approach behind it is a wish with a deadline.',
    };
  }

  return null;
}

/**
 * Whether an answer is an answer.
 *
 * Both of these are ways of getting past a question rather than answering it,
 * and both are what a box gets at the end of a long day.
 */
export function whyThatIsNotAnAnswer(
  piece: MissingPiece,
  answer: string,
  context: { measure?: string | null; target?: string | null },
): string | null {
  const said = answer.trim();

  if (piece === 'measure' || piece === 'target') {
    return said.length === 0 ? 'Say what it is.' : null;
  }

  if (said.length < SHORTEST_USEFUL_ANSWER) {
    return piece === 'justification'
      ? 'That is a word, not a reason. Say why this number is the one that matters.'
      : 'That is a word, not a plan. Say what will actually be done.';
  }

  /*
   * THE NUMBER SAID BACK. "Because we need 40 signups" is the target restated
   * with "because" in front of it, and it passes every length check.
   */
  const target = context.target?.trim().toLowerCase();
  if (piece === 'justification' && target && target.length > 2) {
    const stripped = said.toLowerCase().replace(/^(because|since|as)\s+/, '').replace(/[.\s]+$/, '');
    if (stripped === target || stripped === `we need ${target}` || stripped === `it is ${target}`) {
      return 'That is the target again with a "because" in front of it. Say why that number rather than another one.';
    }
  }

  return null;
}

/** Whether a draft may become an objective, as far as these two are concerned. */
export function whyThisIsNotReadyToSeed(draft: WhatTheDraftHasSoFar): string | null {
  const next = whatToAskForNext(draft);
  if (next === null) return null;

  if (next.piece === 'measure' || next.piece === 'target') {
    return `This has no ${next.piece} yet.`;
  }

  return next.piece === 'justification'
    ? 'Nobody has said why this number is the one that matters. An objective agreed by everybody and justified by nobody is still a guess.'
    : 'Nobody has said how this number will be moved. Agreeing on a target is not a plan for hitting it.';
}

const said = (v: string | null | undefined) => (v?.trim().length ?? 0) > 0;
const enough = (v: string | null | undefined) => (v?.trim().length ?? 0) >= SHORTEST_USEFUL_ANSWER;
