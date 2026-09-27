import { GUEST_ROLE } from './joining-a-second-organisation';

/**
 * A GUEST'S WORDS ARE NEVER CREDITED TO SOMEBODY ON THE HOST'S LIST (decisions 27 and 36).
 *
 * The product knows a participant and an entry on the host organisation's list are one person by
 * their address. That is right for the organisation's own people and wrong for a guest: a guest is
 * from another organisation and is never on the host's list. When an entry on the list carries the
 * same address - an unclaimed entry an import made, a stale row, a typo that happens to match - the
 * address join handed the guest's check-in words, their commitments, their detections and their
 * report to that entry. Found in the test data: Kofi, a guest, shares his address with an unclaimed
 * entry on the host's list, and his words were read as that entry's.
 *
 * So every place that ties check-in content to an entry on the list asks this first, and a guest is
 * tied to nobody. What decides it is the membership, not the address: a GUEST membership here,
 * written when they are added (a-guest-is-a-guest-from-the-moment-they-are-added.ts) and again when
 * they accept. Somebody an admin here has since made a member is a member and is matched as before.
 *
 * FAILS CLOSED. If the memberships cannot be read, everybody is treated as a guest for that one
 * read: a detector that says nothing tonight is better than a guest's words filed against the wrong
 * person. A client with no memberships table at all (a test's stand-in for the database, never the
 * real one) has no guests to read, and is treated as having none.
 */
type Db = {
  organizationMembership?: { findMany?: (a: any) => Promise<any[]> };
};

export interface TheGuestsHere {
  userIds: Set<string>;
  emails: Set<string>;
  /** The memberships could not be read, so nobody is matched. */
  unknown: boolean;
}

const tidy = (e: string | null | undefined): string => (e ?? '').trim().toLowerCase();

export async function theGuestsHere(db: Db, organizationId: string): Promise<TheGuestsHere> {
  if (typeof db.organizationMembership?.findMany !== 'function') {
    return { userIds: new Set(), emails: new Set(), unknown: false };
  }
  try {
    const rows = await db.organizationMembership.findMany({
      where: { organizationId, role: GUEST_ROLE },
      select: { userId: true, user: { select: { email: true } } },
    });
    const userIds = new Set<string>();
    const emails = new Set<string>();
    for (const r of rows ?? []) {
      if (r?.userId) userIds.add(r.userId);
      const e = tidy(r?.user?.email);
      if (e) emails.add(e);
    }
    return { userIds, emails, unknown: false };
  } catch {
    return { userIds: new Set(), emails: new Set(), unknown: true };
  }
}

/**
 * Whether this participant is a guest here: by their sign-in, by the address on the check-in, or by
 * the address on their sign-in. Any one of the three is enough.
 */
export function isAGuestHere(
  guests: TheGuestsHere,
  who: { userId?: string | null; email?: string | null; userEmail?: string | null },
): boolean {
  if (guests.unknown) return true;
  if (who.userId && guests.userIds.has(who.userId)) return true;
  const email = tidy(who.email);
  if (email && guests.emails.has(email)) return true;
  const userEmail = tidy(who.userEmail);
  return !!userEmail && guests.emails.has(userEmail);
}

/** The same question for one participant, for the places that resolve one at a time. */
export async function isAGuestIn(
  db: Db,
  organizationId: string,
  who: { userId?: string | null; email?: string | null; userEmail?: string | null },
): Promise<boolean> {
  return isAGuestHere(await theGuestsHere(db, organizationId), who);
}
