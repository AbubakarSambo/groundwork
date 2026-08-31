/**
 * THE SECOND ORGANISATION SOMEBODY JOINS LEAVES NO TRACE, AND THREE THINGS BREAK BECAUSE OF IT.
 *
 * A membership row is written by a Prisma middleware on `User.create` - the moment an account is
 * made, for the organisation it is made in. That is exactly right and it only ever fires once.
 * Somebody who already has an account and is then added to a ground in another organisation reuses
 * their account: the participant row is linked, and nothing anywhere records that they now belong
 * to a second place.
 *
 * WHAT THAT COSTS:
 *
 *   The switcher cannot list it. `myOrganizations` reads memberships, so the second organisation is
 *     invisible - somebody in two companies is never asked which one they are looking at.
 *   Their role travels with them. The client reads one `role` off the account, so an ADMIN of their
 *     own company reads as an admin everywhere they are a guest. The SERVER refuses them - every
 *     org-scoped read checks `organizationId` - so nothing was ever disclosed. What was wrong is
 *     that they were shown doors that would not open, which is the same defect as the check-in
 *     button, one level up.
 *   And an invite to somebody who already has an account has nothing to attach them to.
 *
 * THE ROLE IS ALWAYS MEMBER, AND NEVER COPIED. Being an admin of your own company says nothing
 * about what you should be able to do in somebody else's, and copying the role across is how a
 * guest ends up holding the keys. If they should be an admin there, an admin there says so.
 */

export const GUEST_ROLE = 'MEMBER' as const;

/**
 * Whether joining this ground means joining a second organisation. False for the ordinary case,
 * where somebody is invited into the company they already belong to and the membership exists.
 */
export function isASecondOrganisation(homeOrganizationId: string, groundOrganizationId: string): boolean {
  return !!groundOrganizationId && homeOrganizationId !== groundOrganizationId;
}
