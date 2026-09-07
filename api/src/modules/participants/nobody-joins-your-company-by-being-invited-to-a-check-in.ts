/**
 * ADDING AN ADDRESS TO A CHECK-IN MADE IT A MEMBER OF YOUR COMPANY.
 *
 * Traced, not assumed. `participants.service.ts` accept() looked the address up and, finding no
 * account, created a User in the ground's organisation - role MEMBER, email marked verified,
 * inside the same transaction that accepted the invitation. No approval, no queue, nobody asked.
 * `createForLead` did the same for the lead's address at creation.
 *
 * Two consequences nobody chose:
 *
 *   1. A person from outside became a member of your organisation. Not a guest of one check-in: a
 *      member, indistinguishable in the team list from somebody you hired.
 *   2. They went onto your bill at the same moment, because a seat is any active user in the org
 *      (common/seats.ts) and every plan is priced by people.
 *
 * So the fix is a gate, and the gate has to hold in three places or it is decoration:
 *
 *   - THE SEAT. Somebody waiting is not billed for and does not consume a cap. If they held a seat
 *     while pending, the queue would protect nothing.
 *   - THE CHECK-IN. They cannot open one or answer one until they are approved. This is the half
 *     that makes the approval mean something: without it, being "queued" is a label on somebody
 *     already doing the thing.
 *   - THE ACCOUNT. It is still created. They need one to write their own account of things, and
 *     the alternative is holding somebody's words outside the model that protects them.
 *
 * WHAT IS DELIBERATELY NOT GATED: their own existing organisation. Somebody who already has an
 * account somewhere else keeps every bit of access they had there. Being made to wait at your door
 * must not lock them out of their own house.
 *
 * WHO NEVER WAITS: somebody who is already in the organisation, and somebody the organisation's own
 * admin adds through the People page - that is an admin acting, and asking an admin to approve
 * their own action is a queue with one item in it that they put there.
 */

export type WhoIsArriving = {
  /** The organisation the check-in belongs to. */
  groundOrganizationId: string;
  /** Where this person's account already lives, or null when it is being created now. */
  theirHomeOrganizationId: string | null;
  /** True when they already hold a membership of the ground's organisation. */
  alreadyAMemberHere: boolean;
  /** True when the person who added them is an admin of the ground's organisation. */
  addedByAnAdminOfThisOrg: boolean;
};

/**
 * Does this arrival need somebody to say yes?
 *
 * Returns the reason it does NOT, so a caller can log why somebody walked straight in - "it
 * returned false" is not an answer anybody can check later.
 */
export function whyTheyDoNotNeedApproval(who: WhoIsArriving): string | null {
  if (who.alreadyAMemberHere) return 'they are already in this organisation';
  if (who.theirHomeOrganizationId === who.groundOrganizationId) {
    return 'this is their own organisation';
  }
  if (who.addedByAnAdminOfThisOrg) {
    return 'an admin of this organisation added them, which is the approval';
  }
  return null;
}

export function needsApproval(who: WhoIsArriving): boolean {
  return whyTheyDoNotNeedApproval(who) === null;
}

/** What the person themselves is told, on the screen where they expected a check-in. */
export const WAITING_TO_BE_LET_IN =
  'Your account is ready, and one thing has to happen before you can start: an admin at the ' +
  'organisation that invited you has to approve you joining it. They have been asked. Nothing ' +
  'you do here is lost in the meantime, and you will be able to check in as soon as they answer.';

/** And the sentence the gate throws, which is the same fact in one line. */
export const CANNOT_CHECK_IN_YET =
  'This check-in cannot start until an admin at the organisation that invited you approves you joining it.';
