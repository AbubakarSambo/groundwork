/**
 * A WEBHOOK LEAVES THE BOUNDARY AND DOES NOT COME BACK.
 *
 * It lands in a customer's own systems, gets logged by their gateway, forwarded by their alerting,
 * and read by whoever has access to any of that. Whatever we put in it is out, permanently, and the
 * §12.8 exclusions apply here more strictly than anywhere else in the product - not less, because
 * this is the one surface where "it is only visible to admins" stops being true.
 *
 * So a webhook carries A FACT AND A POINTER: something happened, here is which thing, come and look
 * with credentials. It never carries what anybody said, and never carries a judgement about a
 * person. The permalink is where the content lives, behind the authorisation that governs it.
 *
 * These are built by hand rather than serialised from a row, for the same reason the API serialiser
 * is an allow-list: a spread would let every column added later escape by default, and here it
 * would escape into somebody else's logs.
 */

export interface RoundCompletedPayload {
  groundExternalId: string | null;
  groundId: string;
  roundNumber: number;
  participantCount: number;
  completedAt: string;
  permalink: string;
}

export function roundCompletedPayload(args: {
  groundId: string;
  roundNumber: number;
  participantCount: number;
  completedAt: Date;
  appUrl: string;
}): RoundCompletedPayload {
  return {
    /* Null until grounds carry a customer-side id; present in the shape now so adding it later is
       not a breaking change to something their parser already reads. */
    groundExternalId: null,
    groundId: args.groundId,
    roundNumber: args.roundNumber,
    /*
     * A COUNT, NOT A ROSTER. Who was in the round is a list of names leaving the boundary for no
     * reason - the receiver already knows who they invited, and if they do not, the permalink is
     * where to find out under authorisation.
     */
    participantCount: args.participantCount,
    completedAt: args.completedAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/grounds/${args.groundId}`,
  };
}

export interface CheckInCompletedPayload {
  groundId: string;
  roundNumber: number;
  completedAt: string;
  permalink: string;
}

export function checkInCompletedPayload(args: {
  groundId: string;
  roundNumber: number;
  completedAt: Date;
  appUrl: string;
}): CheckInCompletedPayload {
  return {
    groundId: args.groundId,
    roundNumber: args.roundNumber,
    /*
     * NO PARTICIPANT ID AND NO NAME. "Naomi finished her check-in at 14:12 and Tom has not" is a
     * surveillance feed assembled from timestamps, and it would be assembled by whoever reads their
     * webhook log rather than by anybody who thought about it. The event says a session closed in
     * this round; who it was is not the receiver's business at this layer.
     */
    completedAt: args.completedAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/grounds/${args.groundId}`,
  };
}

/**
 * The words a payload must never contain, checked in the spec that guards these builders. Kept here
 * beside the builders so the rule and the thing it governs are read together.
 */
export const NEVER_IN_A_PAYLOAD = [
  'transcript',
  'content',
  'answer',
  'testimony',
  'quote',
  'specificity',
  'verdict',
  'recommendation',
  'score',
] as const;
