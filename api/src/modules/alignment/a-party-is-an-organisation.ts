/**
 * A PARTY THAT IS AN ORGANISATION, NOT A LIST OF PEOPLE SOMEBODY INVITED.
 *
 * Today organisation A opens a check-in and invites B's chief executive by email,
 * then B's finance lead, then B's account manager — each one a guest of A's, each
 * one added by A. Everything works and one thing is wrong: B is never a party to
 * anything. A decides who from B takes part, A holds the record, and if A stops
 * paying the record stops. An independent layer that one side owns is not
 * independent, and the side with the information advantage is exactly the side
 * that will notice.
 *
 * ==========================================================================
 * WHAT THIS CHANGES, AND WHAT IT DELIBERATELY DOES NOT.
 * ==========================================================================
 *
 * IT CHANGES: who a check-in has as its sides, and who says which of their people
 * take part. B designates B's people. That is B's business and always was.
 *
 * IT DOES NOT CHANGE THE TENANT BOUNDARY, AND MUST NOT. Every read in this product
 * is scoped to an organisation, and that is the property everything else rests on.
 * A party row grants standing on ONE check-in and nothing anywhere else — not B's
 * other grounds, not A's other grounds, not a single row outside the one this
 * party is a party to. `whatThisPartyMayDo` is per-ground by construction: it
 * takes a party, and a party is a row about one check-in.
 *
 * IT DOES NOT MAKE THE RECORD OWNERLESS. That is the honest limit of this step.
 * The check-in still lives in the tenancy of the organisation that opened it, and
 * moving to a record neither side holds is a re-tenanting programme rather than a
 * feature. What is fixed here is the part that can be fixed without touching the
 * boundary: both sides are named as parties, each designates its own people, and
 * a released report stays readable by BOTH of them for good — see
 * `aReleasedReportOutlivesTheSubscription`.
 */

export type Side =
  /** The one that opened it. Not "the owner", and it carries no extra rights here. */
  | 'the side that set it up'
  | 'the other side';

export interface Party {
  id: string;
  groundId: string;
  side: Side;
  /** What they are called, in their own words. */
  name: string;
  /**
   * Their organisation here, where they have one. Null for a party that has no
   * account with us — which is normal and must keep working, because the other
   * side of a contract has not usually bought this product.
   */
  organizationId: string | null;
}

export type WhatAPartyMayDo =
  /** Say which of their own people take part. */
  | 'designate its own people'
  /** Read a report once it has been released to everybody. */
  | 'read a released report'
  /** Say the agreement version is what they signed, and check a term's reading. */
  | 'speak for its side';

/** Everything a party may do, and it is the same list for both sides. */
export function whatThisPartyMayDo(): WhatAPartyMayDo[] {
  /*
   * THE SAME LIST FOR BOTH SIDES, AND THAT IS THE POINT OF THE FILE.
   *
   * The side that opened the check-in is the side paying for it, and a product
   * that quietly gives the payer more standing is one the other side is right not
   * to trust. Anything that ever differs between the two sides belongs in billing,
   * not here.
   */
  return ['designate its own people', 'read a released report', 'speak for its side'];
}

/**
 * WHETHER THIS CALLER MAY ACT FOR THIS PARTY.
 *
 * The single check that stands between "B designates B's people" and "anybody
 * designates anybody's". A caller acts for a party when they are IN the
 * organisation that party is, and for the side that set it up when they are in the
 * organisation the check-in lives in.
 *
 * A party with no organisation of ours cannot be acted for through the API at all
 * — there is nobody to authenticate. Their people are invited by address, which is
 * what already works, and the party row records whose people they are.
 */
export function mayActFor(
  party: Party,
  caller: { organizationId: string },
  theCheckInLivesIn: string,
): { may: true } | { may: false; because: string } {
  if (party.organizationId && caller.organizationId === party.organizationId) return { may: true };

  if (party.side === 'the side that set it up' && caller.organizationId === theCheckInLivesIn) {
    return { may: true };
  }

  if (!party.organizationId) {
    return {
      may: false,
      because: `${party.name} has no account here, so nobody can act for them through the API. Their people are invited by address, and this record says whose people they are.`,
    };
  }

  return { may: false, because: `You are not part of ${party.name}, so you cannot say who takes part for them.` };
}

/**
 * A RELEASED REPORT OUTLIVES THE SUBSCRIPTION.
 *
 * The commercially serious half of the audit's point, and the half that can be
 * settled without re-tenanting. Both sides took part in producing this record; a
 * record one of them loses because the OTHER one stopped paying is not a record
 * either of them can rely on, and knowing that in advance is what would stop a
 * cautious counterparty agreeing to use this at all.
 *
 * So: once a report is released, both parties may read it, for good. Billing may
 * decide whether new rounds happen. It does not decide who may read what already
 * happened.
 */
export function aReleasedReportOutlivesTheSubscription(): string {
  return (
    'A report that has been released stays readable by both sides, whatever happens to either '
    + 'side’s subscription afterwards. Paying decides whether there are new rounds; it does not '
    + 'decide who may read a round that already happened.'
  );
}

/** How the sides read, said plainly, with neither described as owning it. */
export function howTheSidesRead(parties: Party[]): string {
  if (parties.length === 0) return 'Nobody has said who the two sides are yet.';
  const named = parties.map((p) => p.name);
  if (parties.length === 1) return `${named[0]} is named as a side. The other side has not been named yet.`;
  return `${named.join(' and ')} are the sides. Each says which of their own people take part.`;
}
