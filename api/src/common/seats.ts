import type { Prisma } from '@prisma/client';
/**
 * WHAT COUNTS AS A PERSON ON AN ACCOUNT. ONE DEFINITION, USED EVERYWHERE.
 *
 * Every plan is priced by team size ("Up to 20 people"), so this number decides whether somebody
 * can be invited and it is printed on the billing page they read afterwards. Those were two
 * different queries:
 *
 *   the gate      billing.service.ts  `_count: { select: { users: true } }`   every User row
 *   the display   billing.service.ts  `user.count({ isActive: true })`        active rows only
 *
 * Each was defensible alone. Together, an organisation with two deactivated members was refused an
 * invitation it had room for by its own billing page - a support ticket nobody can resolve, because
 * both screens are telling the truth about different questions.
 *
 * A seat is a person who can currently use the product. Deactivated and soft-deleted people are
 * not billed for and do not hold a seat. Anything that asks a DIFFERENT question must not use this:
 *
 *   - the team list total (users.service.ts) counts `deletedAt: null` INCLUDING deactivated people,
 *     because the list renders them with an "inactive" flag and the total has to match the rows.
 *   - the org-delete predicate (unverified-sweep.ts) counts every row including deleted ones,
 *     because destroying an org destroys a deactivated person's data too.
 *
 * AND SOMEBODY WAITING AT THE DOOR IS NOT A PERSON ON THE ACCOUNT.
 *
 * Accepting a check-in invitation to an organisation you were not already in creates your account
 * there and queues you for an admin to approve - see
 * participants/nobody-joins-your-company-by-being-invited-to-a-check-in.ts. Until that answer
 * comes you cannot open a check-in and you cannot use the product, so charging for you would be
 * charging for a person who cannot do anything. It would also make the queue pointless: the whole
 * reason it exists is that adding an address to a check-in was quietly adding a person to a bill.
 */
export const SEAT_WHERE = { isActive: true, deletedAt: null, awaitingOrgApproval: false } as const;

/** The same predicate as a filtered relation count, for queries that read many organisations. */
export const SEAT_RELATION_COUNT = { users: { where: SEAT_WHERE } } as const;

/**
 * WHO HOLDS A SEAT IN ONE ORGANISATION (U.19). The People page and Plan and billing must say the same
 * number, and it must be the number the invite gate refuses by.
 *
 * Seats were counted by `User.organizationId`, which is only the organisation a person last switched
 * to. So somebody who belongs here but was looking at another company fell off this count, and a
 * guest who had switched in to look was counted as one of this organisation's people. The People list
 * already reads the memberships (U.4), and it lists guests, so the two numbers parted.
 *
 * A seat here is a person with a Groundwork account who can use the product (SEAT_WHERE) and
 * belongs here, as an admin, a lead or somebody who takes part. A GUEST HOLDS NO SEAT IN THE ORGANISATION THAT HAS
 * THEM AS A GUEST (6 October 2026, as docs/existing-users.md has always said: "a seat count that leaves guests out").
 * On 27 September this counted guests in, the prototype's way ("Every person with a Groundwork account at Baridi
 * Appliances", F2); the screens then found a plan reading "all 5 are taken" with one person on the check-in and four
 * guests (request 174 item 10), so a lead was refused people she was entitled to add. A guest still holds a seat
 * where they belong. Somebody answering by link with no account holds none, because they have no row here at all.
 *
 * Except a guest HELD FOR A SEAT: added when there was no seat for them, so they hold none, are not
 * offered the check-in, and read "No seat on your plan" until a seat is freed and their invitation
 * goes (`heldForASeat`, cleared by grounds.service releaseAnyoneWaitingForASeat).
 *
 * One older shape is counted too: an account whose organisation is this one but which has no
 * membership row here at all, which some roster imports left behind. Without it those people would
 * drop out of the count and the gate would let an organisation past its plan.
 */
export function seatsIn(organizationId: string) {
  return {
    ...SEAT_WHERE,
    OR: [
      { memberships: { some: { organizationId, heldForASeat: false, role: { not: 'GUEST' as const } } } },
      { organizationId, memberships: { none: { organizationId } } },
    ],
  };
}

/**
 * SOMEBODY ADDED TO A CHECK-IN HERE WHO IS ALREADY HERE: holds a seat, or is a guest here. Adding either to another check-in costs
 * no seat, which is the question `addParticipant` asks before it decides whether there is room for one more.
 */
export function alreadyHere(organizationId: string): { OR: Prisma.UserWhereInput[] } {
  return { OR: [seatsIn(organizationId), { ...SEAT_WHERE, memberships: { some: { organizationId, role: 'GUEST' as const, heldForASeat: false } } }] };
}

/**
 * HOW MANY SEATS EACH ORGANISATION HAS, BY THE SAME RULE AS `seatsIn`, FOR A LIST OF EVERY
 * ORGANISATION (item 19). The platform console's organisation list counted people by
 * `User.organizationId` (SEAT_RELATION_COUNT), so an admin who belongs to an organisation but was last
 * looking at another one fell off its count, and the console read one person fewer than the
 * organisation's own People page. Read once for every organisation, rather than once per organisation.
 */
export async function seatsByOrganisation(prisma: { user: { findMany: (args: any) => Promise<unknown> } }): Promise<Map<string, number>> {
  const people = (await prisma.user.findMany({
    where: SEAT_WHERE,
    select: { organizationId: true, memberships: { select: { organizationId: true, heldForASeat: true, role: true } } },
  })) as { organizationId: string | null; memberships: { organizationId: string; heldForASeat: boolean; role?: string }[] }[];
  const seats = new Map<string, number>();
  for (const p of people) {
    /* A guest holds no seat in the organisation that has them as a guest; they hold one where they belong. */
    const here = new Set(p.memberships.filter((m) => !m.heldForASeat && m.role !== 'GUEST').map((m) => m.organizationId));
    /* The older shape: their organisation, with no membership row there at all. */
    if (p.organizationId && !p.memberships.some((m) => m.organizationId === p.organizationId)) here.add(p.organizationId);
    for (const org of here) seats.set(org, (seats.get(org) ?? 0) + 1);
  }
  return seats;
}
