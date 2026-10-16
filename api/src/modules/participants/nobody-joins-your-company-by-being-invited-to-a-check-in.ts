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
 * AND THAT SENTENCE WAS NOT TRUE OF THE CODE UNDER IT. `awaitingOrgApproval` is one flag on the
 * account, not one per organisation, and the check-in door reads it without asking which
 * organisation the check-in belongs to. So somebody in good standing at their own company who
 * opened another company's link was marked waiting - and refused on their own company's check-ins
 * until a stranger's admin got round to them. Locked out of their own house, exactly.
 *
 * So an existing account from elsewhere does not wait. It arrives as a GUEST (see
 * joining-a-second-organisation.ts), and the guest role IS the gate: neither of the two
 * consequences above applies to it. A guest is not indistinguishable from staff - they hold no
 * keys here, cannot open a check-in or invite this organisation's people. And a guest is not on
 * the bill - a seat is an active user OF the organisation, and their account lives elsewhere. What
 * the queue protects against, the role already prevents; the only thing the queue added was the
 * lock-out. Decided 10 September 2026.
 *
 * WHO NEVER WAITS: somebody who is already in the organisation; somebody with an account elsewhere,
 * who is a guest; and somebody the organisation's own admin adds through the People page - that is
 * an admin acting, and asking an admin to approve their own action is a queue with one item in it
 * that they put there. Which leaves exactly one person who does: somebody with no account
 * anywhere, whose account is being created in this organisation right now by opening a link or an
 * invitation an admin did not send. That is the case the gate was built for.
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
  if (who.theirHomeOrganizationId !== null) {
    return 'they have an account elsewhere and arrive here as a guest, with no seat and no keys';
  }
  if (who.addedByAnAdminOfThisOrg) {
    return 'an admin of this organisation added them, which is the approval';
  }
  return null;
}

/**
 * WHOSE ACTION ADDED THIS PERSON (U.4).
 *
 * The rule above says somebody an admin adds does not wait. The code asked the person who RUNS the
 * check-in, and an admin who sets a check-in up for a lead is not the person who runs it: she named
 * the lead, added four people, and all four were held for her own approval. So the question is asked
 * of whoever added this person, recorded on their row; only where nothing recorded it (older rows)
 * does it fall back to the person who runs the check-in, which is what it always did.
 */
export type WhoAddedThem = { role: string; organizationId: string } | null;

export function whoToAsk(addedByUserId: string | null | undefined, initiatorId: string): string {
  return addedByUserId || initiatorId;
}

export function isAnAdminOf(groundOrganizationId: string, adder: WhoAddedThem): boolean {
  return adder?.role === 'ADMIN' && adder.organizationId === groundOrganizationId;
}

/**
 * HOW SOMEBODY STANDS IN ONE ORGANISATION, NOT IN THE ONE THEY HAVE OPEN (local test of staging, 15 October).
 *
 * A user's own `role` and `organizationId` are the organisation they have open right now: switching
 * organisation rewrites both. Hafsah, an admin of Drop Access and of Muchemi & Co, invited Kevin to a Drop
 * Access check-in and his invitation said "you go straight in". By the time he opened it she had Muchemi
 * open, so her row read "admin of Muchemi", the rule read "not an admin of Drop Access", and Kevin waited
 * for her to let him in. Her standing in the check-in's organisation is her membership there.
 */
export async function howTheyStandIn(db: any, userId: string | null | undefined, organizationId: string): Promise<WhoAddedThem> {
  if (!userId) return null;
  const user = await Promise.resolve(db.user?.findUnique?.({ where: { id: userId }, select: { role: true, organizationId: true } })).catch(() => null);
  if (user?.organizationId === organizationId) return user;
  const membership = await Promise.resolve(db.organizationMembership?.findUnique?.({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  })).catch(() => null);
  if (membership?.role) return { role: String(membership.role), organizationId };
  return user ?? null;
}

export function needsApproval(who: WhoIsArriving): boolean {
  return whyTheyDoNotNeedApproval(who) === null;
}

/** What the person themselves is told, on the screen where they expected a check-in. */
export const WAITING_TO_BE_LET_IN =
  'Your sign-in is ready, and one thing has to happen before you can start: an admin at the ' +
  'organisation that invited you has to approve you joining it. They have been asked. Nothing ' +
  'you do here is lost in the meantime, and you will be able to check in as soon as they answer.';

/** And the sentence the gate throws, which is the same fact in one line. */
export const CANNOT_CHECK_IN_YET =
  'This check-in cannot start until an admin at the organisation that invited you approves you joining it.';

/**
 * AND THE REPORT WAITS AT THE SAME DOOR (request 49, 29 September 2026).
 *
 * The check-in refused somebody still waiting to be let in, and the report did not: Faraji, held
 * for a seat, opened `GET /grounds/:id/report` and was served the released team report with every
 * name in it. The decision: somebody held for a seat reads no report of a check-in - not the team
 * report, not any session's, not the rounds, not the board, not a name - until an admin lets them
 * into the organisation. Not "until they have answered": they cannot answer while held.
 */
export const CANNOT_READ_THE_REPORT_YET =
  "You can read this check-in's report once an admin at the organisation that invited you approves you joining it.";

export const CANNOT_OPEN_THE_BOARD_YET =
  "You can open this check-in's board once an admin at the organisation that invited you approves you joining it.";
