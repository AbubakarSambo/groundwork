import { OpsServes } from '@prisma/client';

/**
 * A PRODUCT CONTRIBUTION COUNTS ONLY IF IT IMPROVES SALES OR THE MOAT.
 *
 * That rule was a sentence in a plan. This is the sentence turned into a field,
 * asked when a piece of work is proposed — which is the only moment the answer
 * is cheap. Afterwards it is a justification for something already built, and
 * nobody has ever failed to produce one of those.
 *
 * NOTHING HERE BLOCKS. Work naming nothing is listed, not refused. A refusal
 * would be answered by typing anything into the box, and then the field is
 * worse than absent because it looks like a decision.
 */

export const WHAT_WORK_CAN_SERVE: Array<{ serves: OpsServes; label: string; points: 'use case' | 'moat component' | null; needsApproval: boolean }> = [
  { serves: 'SALES', label: 'It unblocks a customer', points: 'use case', needsApproval: false },
  { serves: 'MOAT', label: 'It adds to the moat', points: 'moat component', needsApproval: false },
  {
    serves: 'UNLOCKS_A_CUSTOMER',
    label: 'It unlocks a customer we could not have taken',
    points: 'use case',
    needsApproval: false,
  },
  {
    /*
     * THE CATEGORY THAT STOPS THE MEASURE PUNISHING NECESSARY WORK.
     *
     * A security fix, a migration, a broken build unblocks no use case and adds
     * no moat entry, so without this it reads as zero contribution — and the
     * measure teaches the product team to stop doing it, inside one quarter.
     *
     * It needs an approval so it is not the drawer everything is filed in.
     * Somebody agreeing it was necessary is the whole difference between a
     * third category and a loophole.
     */
    serves: 'KEEPING_IT_UP',
    label: 'It keeps what exists working',
    points: null,
    needsApproval: true,
  },
  {
    /*
     * THE FIFTH CATEGORY, AND THE ONLY ONE WITH A TIME LIMIT.
     *
     * A company of six has real work that unblocks no customer and adds no moat
     * entry — hiring, onboarding somebody, writing down how the company
     * operates. Counting it as zero contribution teaches people to stop doing
     * it, which is the same failure `KEEPING_IT_UP` exists to prevent for
     * technical work.
     *
     * The difference is the boundary. Keeping it up is permanent, because
     * something always needs fixing. This is bounded by the phase the company
     * agreed it for: outside that window the work is still worth doing and is
     * not claimed under this heading, because a category with no boundary is
     * the drawer every measure eventually grows.
     *
     * The window is checked in the service — see
     * `whyThisIsNotOperabilityWork`. It cannot be checked here, because a rule
     * about today needs to know what day it is.
     */
    serves: 'MAKES_THE_COMPANY_OPERABLE',
    label: 'It makes the company able to operate',
    points: null,
    needsApproval: true,
  },
];

export function pointsAt(serves: OpsServes): 'use case' | 'moat component' | null {
  return WHAT_WORK_CAN_SERVE.find((w) => w.serves === serves)?.points ?? null;
}

export function needsSomebodyToAgree(serves: OpsServes): boolean {
  return WHAT_WORK_CAN_SERVE.find((w) => w.serves === serves)?.needsApproval ?? false;
}

/** The kinds of work this can be said about. A typo here would be a silent orphan. */
export const KINDS_OF_WORK = ['OpsRoadmapItem', 'OpsTechItem', 'OpsUXItem'] as const;
export type KindOfWork = (typeof KINDS_OF_WORK)[number];

export function isAKindOfWork(recordType: string): recordType is KindOfWork {
  return (KINDS_OF_WORK as readonly string[]).includes(recordType);
}

/**
 * Why this declaration is not usable yet, or null.
 *
 * The justification is required and short-checked on purpose: "important" is
 * not a justification, and a field that accepts it produces a table of the word
 * "important" that reads as evidence.
 */
export const SHORTEST_USEFUL_JUSTIFICATION = 20;

export function whyThisIsNotSaidYet(input: {
  recordType: string;
  serves: OpsServes;
  servesRecordId?: string | null;
  justification?: string | null;
  dependsOn?: string | null;
  dependsOnOwnedBy?: string | null;
}): string | null {
  if (!isAKindOfWork(input.recordType)) {
    return `${input.recordType} is not a kind of work this can be said about.`;
  }

  const said = input.justification?.trim() ?? '';
  if (said.length < SHORTEST_USEFUL_JUSTIFICATION) {
    return 'Say why in a sentence. "Important" is not a justification, and a column full of it reads as evidence.';
  }

  const needs = pointsAt(input.serves);
  if (needs && !input.servesRecordId) {
    return `Name the ${needs} it serves. Saying it serves sales without naming who is the claim this field exists to stop.`;
  }

  /*
   * A DEPENDENCY WITH NO OWNER IS THE ANSWER THE THREAT IS ABOUT.
   *
   * The risk is not the dependency; it is a dependency on something belonging to
   * the person who added it. "Who owns it" is the whole question, and leaving it
   * blank while naming the dependency is the shape of not answering.
   */
  if (input.dependsOn?.trim() && !input.dependsOnOwnedBy?.trim()) {
    return 'Say who owns it. A new dependency is fine; a new dependency on something belonging to whoever added it is the thing being asked about.';
  }

  return null;
}
