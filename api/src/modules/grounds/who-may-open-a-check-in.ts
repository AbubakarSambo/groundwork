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

/**
 * ADMIN, LEAD or MEMBER. One field, because that is what an admin already means when they say
 * "my leads".
 *
 * This took a boolean alongside the role for about an hour. Two fields that have to agree is a
 * worse version of one field that says what somebody is, and the People page proved it immediately:
 * it had to collapse them back into three words to be usable, which is a role.
 *
 * A LEAD is safe as a role because no privilege in this product is granted by not being a MEMBER -
 * all forty-two guarded routes and every check in the client name ADMIN.
 */
export interface WhoIsAsking {
  role: string;
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
  /*
   * A GUEST NEVER OPENS ONE, WHATEVER THE ORGANISATION'S SETTING SAYS.
   *
   * Checked before `whoMayOpen`, because the setting cannot speak for this case: "anyone may open
   * a check-in" is written by an admin thinking of their own staff, and a guest is somebody from
   * another company who was added to a single check-in. Letting the setting decide meant a guest
   * could open check-ins here and invite THIS organisation's people, against its billing.
   *
   * They still take part in anything they are added to - that is what the membership is for.
   */
  if (who.role === 'GUEST') return { may: false, because: GUESTS_DO_NOT_OPEN };

  if (how.whoMayOpen === 'NAMED_LEADS' && who.role !== 'LEAD') {
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
export const GUESTS_DO_NOT_OPEN =
  'You are taking part here as a guest. You can check in on anything you are added to. '
  + 'Opening a new check-in is done by somebody here who is not a guest.';

export const CANNOT_OPEN =
  'Opening a check-in here is limited to people your admin has named. You can still take part in '
  + 'any check-in somebody adds you to. Ask an admin if you should be able to open them.';

/** The defaults a new organisation gets, in one place so nothing has to remember them. */
export const HOW_A_NEW_ORG_WORKS: HowThisOrgWorks = {
  whoMayOpen: 'NAMED_LEADS',
  needsApproval: true,
};
