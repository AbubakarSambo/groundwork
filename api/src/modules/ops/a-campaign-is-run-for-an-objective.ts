/**
 * NO CAMPAIGN WITHOUT AN OBJECTIVE, AND NO OBJECTIVE WITHOUT A REASON.
 *
 * The rule is hers, in her words: any marketing improvement, campaign or shift
 * has to be tied to the objective. What that turns into here is two refusals
 * and one thing said rather than refused.
 *
 * REFUSED: a campaign naming no objective. Marketing is the easiest work in the
 * company to start on enthusiasm — a newsletter, a rewrite, a conference — and
 * the hardest to argue with afterwards, because it always produced SOMETHING.
 * The link is what makes it arguable at the start, while stopping is cheap.
 *
 * REFUSED: a campaign naming an objective with a sentence that repeats the
 * campaign's own title. "The newsletter, for the newsletter objective" is a
 * link with nothing behind it.
 *
 * SAID, NOT REFUSED: a campaign pointed at an objective that serves the moat or
 * keeping-it-up rather than sales. That can be exactly right — a campaign about
 * what the product is has always been the moat's work — and refusing it would
 * force whoever is running it to pick a sales objective they do not believe in,
 * which is worse than the mismatch.
 */

/** The shortest sentence that can carry a reason. Matches the objective form. */
const SHORTEST_USEFUL_REASON = 25;

export interface WhatIsBeingRun {
  title: string;
  objectiveId?: string | null;
  /** Why this campaign serves that objective. */
  objective?: string | null;
}

/** Null when the campaign may be created. Otherwise the sentence saying why not. */
export function whyThisCampaignCannotRunYet(input: WhatIsBeingRun): string | null {
  if (!input.objectiveId) {
    return 'Name the objective this campaign is being run for. A campaign with no objective behind it is measured on whether it happened, which every campaign passes.';
  }

  const reason = input.objective?.trim() ?? '';
  if (reason.length < SHORTEST_USEFUL_REASON) {
    return 'Say why this campaign moves that objective. A link with no reason behind it is a dropdown somebody picked.';
  }

  /*
   * The title said back as the reason. Caught because it is what a form gets
   * when somebody wants past it, and because it passes a length check.
   */
  const title = input.title?.trim().toLowerCase() ?? '';
  if (title.length > 0 && reason.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() === title.replace(/[^a-z0-9 ]/g, '').trim()) {
    return 'That is the campaign\'s name again, not a reason. Say what about the objective this moves.';
  }

  return null;
}

/**
 * What to SAY about a campaign whose objective is not aimed at sales.
 *
 * Never a refusal. See the note at the top.
 */
export function whatThisCampaignIsActuallyServing(serves: string | null): string | null {
  if (serves === null) {
    return 'The objective behind this campaign does not say what it serves, so neither does the campaign.';
  }
  if (serves === 'SALES' || serves === 'UNLOCKS_A_CUSTOMER') return null;
  if (serves === 'MOAT') {
    return 'This campaign is running for an objective that serves the moat rather than sales. That can be right — say so where it is questioned.';
  }
  return 'This campaign is running for an objective that serves keeping the company up. Worth checking that is what was meant.';
}
