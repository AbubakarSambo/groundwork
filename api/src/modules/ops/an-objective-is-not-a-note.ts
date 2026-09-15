import { OpsServes } from '@prisma/client';

/**
 * AN OBJECTIVE IS NOT A NOTE.
 *
 * The form asked for a title, an area and a sentence. That is a note. Four
 * things were missing, and the fourth is the one that makes this a conveyor
 * belt rather than a list.
 *
 *   An owner, chosen. Both the objective's and each key result's owner already
 *   existed as fields and neither was asked for, so both silently took whoever
 *   opened the form. An objective owned by the person who happened to type it
 *   is owned by nobody.
 *
 *   What it buys, and it differs by kind. Product work serves sales, the moat,
 *   or unlocking a customer. Sales work serves revenue, and revenue has
 *   arithmetic behind it.
 *
 *   Why this rather than something else — the justification.
 *
 *   WHAT IT IS INSTEAD OF. "Why is this the best use of time on scale" is
 *   unanswerable in the abstract; it is only answerable against the
 *   alternative. Nobody writes it unless the form makes them, and read back at
 *   quarter end it is the most useful line on the record.
 */

export const SHORTEST_USEFUL_JUSTIFICATION = 20;
/** Shorter, because "the pipeline review" is a real answer and only sixteen characters. */
export const SHORTEST_USEFUL_INSTEAD = 12;

export interface WhatIsBeingSet {
  title?: string | null;
  ownerKey?: string | null;
  serves?: OpsServes | null;
  justification?: string | null;
  instead?: string | null;
  companiesExpected?: number | null;
  valuePerCompanyCents?: number | null;
}

/** Why this is not an objective yet, or null. The sentence is the point; a boolean would say nothing. */
export function whyThisIsNotAnObjective(input: WhatIsBeingSet): string | null {
  if (!input.title?.trim()) return 'An objective needs to say what we are trying to achieve.';

  if (!input.ownerKey?.trim()) {
    return 'Name who owns it. It used to take whoever opened the form, which meant it was owned by nobody.';
  }

  if (!input.serves) {
    return 'Say what it buys: sales, the moat, unlocking a customer, or keeping what exists working.';
  }

  if ((input.justification?.trim().length ?? 0) < SHORTEST_USEFUL_JUSTIFICATION) {
    return 'Say why in a sentence. An objective nobody justified is one nobody can argue with in November.';
  }

  if ((input.instead?.trim().length ?? 0) < SHORTEST_USEFUL_INSTEAD) {
    return 'Say what this is instead of. "Why is this the best use of time" cannot be answered in the abstract - only against the thing not being done.';
  }

  /*
   * SALES WORK CARRIES ITS ARITHMETIC.
   *
   * Revenue is the only thing sales work serves, and a revenue objective with
   * no companies and no value behind it is a number somebody picked. Both parts
   * or neither, because one without the other cannot be multiplied and cannot
   * be checked.
   */
  const half =
    (input.companiesExpected != null) !== (input.valuePerCompanyCents != null);
  if (half) {
    return 'Give both the number of companies and what each is worth, or neither. One without the other cannot be checked against the pipeline.';
  }

  return null;
}

/** What the objective claims, in money. Null when it made no claim. */
export function whatItClaims(input: WhatIsBeingSet): number | null {
  if (input.companiesExpected == null || input.valuePerCompanyCents == null) return null;
  return input.companiesExpected * input.valuePerCompanyCents;
}

/**
 * WHETHER THE PIPELINE AGREES, SAID RATHER THAN REFUSED.
 *
 * Eight companies named against three in the pipeline at a fifth of the value
 * is either an ambitious target or a fiction, and which one it is belongs to
 * the person who set it. It should not be possible to hold both quietly.
 */
export function doesThePipelineAgree(input: {
  claimedCents: number | null;
  claimedCompanies: number | null;
  pipelineCents: number;
  pipelineCompanies: number;
}): string | null {
  if (input.claimedCents == null || input.claimedCompanies == null) return null;

  const parts: string[] = [];
  if (input.claimedCompanies > input.pipelineCompanies) {
    parts.push(
      `${input.claimedCompanies} companies against ${input.pipelineCompanies} in the pipeline`,
    );
  }
  if (input.claimedCents > input.pipelineCents) {
    const money = (c: number) => `$${Math.round(c / 100).toLocaleString()}`;
    parts.push(`${money(input.claimedCents)} against ${money(input.pipelineCents)} of qualified value`);
  }
  if (parts.length === 0) return null;

  return `The pipeline does not hold this yet: ${parts.join(', ')}. That may be the target rather than a mistake - it should be said out loud either way.`;
}

/**
 * How much of a quarter is aimed at scale.
 *
 * A split, never a score. A quarter that is mostly something else may be
 * exactly right — after a bad month it usually is — and the point is that it
 * was decided rather than that it happened.
 */
export function howMuchIsAimedAtScale(objectives: Array<{ serves: OpsServes | null }>) {
  const atScale = objectives.filter((o) => o.serves === 'SALES' || o.serves === 'MOAT').length;
  const saidNothing = objectives.filter((o) => !o.serves).length;
  return {
    atScale,
    somethingElse: objectives.length - atScale - saidNothing,
    saidNothing,
    of: objectives.length,
    says:
      objectives.length === 0
        ? 'Nothing is set for this period.'
        : `${atScale} of ${objectives.length} aimed at revenue or the moat.` +
          (saidNothing > 0 ? ` ${saidNothing} said nothing.` : ''),
  };
}

/**
 * WHY THIS NUMBER, AND HOW IT WILL BE MOVED.
 *
 * A key result carried a target and a source — what to reach, and where the
 * figure comes from. Neither says whether the target is the right one, or
 * whether anybody has thought about how to hit it.
 *
 * Two fields rather than one because they fail differently. A good reason with
 * no plan is a hope with a deadline on it. A good plan aimed at the wrong
 * number is worse than either, because it produces work and evidence and moves
 * nothing that matters.
 */
export interface WhatIsBeingMeasured {
  justification?: string | null;
  approach?: string | null;
}

export function whyThisKeyResultIsNotSetYet(input: WhatIsBeingMeasured): string | null {
  if ((input.justification?.trim().length ?? 0) < SHORTEST_USEFUL_JUSTIFICATION) {
    return 'Say why this number is the one that matters. A target nobody justified is one nobody can argue with when it is missed.';
  }
  if ((input.approach?.trim().length ?? 0) < SHORTEST_USEFUL_JUSTIFICATION) {
    return 'Say how it will be moved. A number with no approach behind it is a wish with a deadline.';
  }
  return null;
}
