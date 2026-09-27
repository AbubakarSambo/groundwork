import { GUEST_ROLE } from './joining-a-second-organisation';

/**
 * SOMEBODY FROM ANOTHER ORGANISATION IS A GUEST HERE FROM THE MOMENT THEY ARE ADDED (U.4 review).
 *
 * The guest membership was only written by accept(), when they clicked the invitation. Until then
 * somebody from another company, added to one of this organisation's check-ins, was on no row of
 * the People page, the "Guests" filter showed nobody, and they could not switch to this
 * organisation to find the check-in they had been told about.
 *
 * So when the address belongs to an account that lives elsewhere, the same GUEST membership accept()
 * writes is written when they are added. accept() upserts it without changing it, so a second write
 * never happens and a role an admin gave them later is kept.
 *
 * HOW THE DOOR RULE IS KEPT (nobody-joins-your-company-by-being-invited-to-a-check-in.ts): a guest is
 * not a member. The role is GUEST, never MEMBER and never their role at home. A guest holds no keys
 * here: they cannot open a check-in or invite this organisation's people, they are listed as "Guest"
 * and never as one of the organisation's people, and their colleague list is only the people on their
 * own check-ins (common/colleagues.ts). Nothing here creates an account or links the participant row:
 * somebody with no account is left exactly as before, for accept() to create and, unless an admin
 * here added them, to wait for an admin.
 */
type Db = {
  user: { findUnique: (a: any) => Promise<any> };
  organizationMembership: { findUnique: (a: any) => Promise<any>; create: (a: any) => Promise<any>; update?: (a: any) => Promise<any> };
};

/**
 * `held`: added when the plan had no seat for them (U.4 re-review). A guest with an account takes a
 * seat, as the prototype says, so a guest added with no room is written held: on the People page,
 * holding no seat, and offered nothing until their invitation is sent.
 */
export async function aGuestHereIfTheyAreFromElsewhere(db: Db, groundOrganizationId: string, email: string, held = false): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, organizationId: true, isActive: true, deletedAt: true },
  });
  if (!user || user.deletedAt || !user.isActive) return false;
  /* Their own organisation: a missing membership there is a different fault, never papered over. */
  if (user.organizationId === groundOrganizationId) return false;
  const here = await db.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: groundOrganizationId } },
    select: { id: true, heldForASeat: true },
  });
  if (here) {
    /* Held on one check-in, added to another now there is room: they take their seat. */
    if (here.heldForASeat && !held && db.organizationMembership.update) {
      await db.organizationMembership.update({ where: { id: here.id }, data: { heldForASeat: false } });
    }
    return false;
  }
  await db.organizationMembership.create({
    data: { userId: user.id, organizationId: groundOrganizationId, role: GUEST_ROLE, ...(held ? { heldForASeat: true } : {}) },
  });
  return true;
}
