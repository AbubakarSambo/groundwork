/**
 * WHO MAY OPEN A CHECK-IN HERE, AND WHETHER IT WAITS FOR SOMEBODY.
 *
 * Hafsah's call, in her words: named leads can open a check-in and it goes for HR or org-admin
 * approval. People who are not named cannot open one at all - they can be in one. And an
 * organisation that does not want either of those restrictions can switch each of them off.
 *
 * TWO SETTINGS, NOT ONE, because they answer different questions and organisations will want
 * different combinations of them. "Anybody may open one, and it still waits for approval" is a real
 * arrangement, and so is "only my leads may open one, and I trust them to get on with it". Folding
 * both into a single "strictness" control would make three of the four combinations unreachable.
 *
 * WHAT THIS FILE IS FOR. The rule was previously one expression inside `create` - `creatorRole ===
 * 'ADMIN' ? OPEN : AWAITING_APPROVAL` - which is a fine place for a rule with one caller and the
 * wrong place for one with three: the create path enforces it, the People page shows who has it,
 * and the check-in page has to explain a refusal. Three readings of the same rule in three files is
 * how a product ends up refusing somebody for a reason it cannot state.
 */

export interface WhoIsAsking {
  /** ADMIN or MEMBER. An admin's own authority, not a setting. */
  role: string;
  /** Whether this person has been named as somebody who may open check-ins. */
  named: boolean;
}

export interface HowThisOrgWorks {
  /**
   * NAMED_LEADS (the default) or EVERYONE.
   *
   * Defaulting to the stricter of the two is deliberate: an organisation that has thought about it
   * can open the door, and one that has not should not discover the door was open by finding a
   * check-in nobody sanctioned.
   */
  whoMayOpen: 'NAMED_LEADS' | 'EVERYONE';
  /** Whether an opened check-in waits for an admin before anybody is invited. */
  needsApproval: boolean;
}

export type Answer =
  | { may: true; waits: boolean }
  | { may: false; because: string };

/**
 * AN ADMIN IS NOT SUBJECT TO EITHER SETTING.
 *
 * They are the approver. Making them ask themselves for permission is a step that teaches people to
 * click through steps, and it was already the rule before these settings existed - this preserves
 * it rather than inventing it.
 */
export function mayOpen(who: WhoIsAsking, how: HowThisOrgWorks): Answer {
  if (who.role === 'ADMIN') return { may: true, waits: false };

  if (how.whoMayOpen === 'NAMED_LEADS' && !who.named) {
    return { may: false, because: CANNOT_OPEN };
  }
  return { may: true, waits: how.needsApproval };
}

/**
 * WHAT SOMEBODY IS TOLD WHEN THEY CANNOT.
 *
 * It says what is true - this organisation decided it - and who can change it, because a refusal
 * with no next step reads as the product being broken. It does not apologise and it does not imply
 * anything about the person: not being named is a setting, not a judgement.
 */
export const CANNOT_OPEN =
  'Opening a check-in here is limited to people your admin has named. You can still take part in '
  + 'any check-in somebody adds you to. Ask an admin if you should be able to open them.';

/** The defaults a new organisation gets, in one place so nothing has to remember them. */
export const HOW_A_NEW_ORG_WORKS: HowThisOrgWorks = {
  whoMayOpen: 'NAMED_LEADS',
  needsApproval: true,
};
