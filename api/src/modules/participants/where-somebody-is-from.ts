/**
 * WHERE SOMEBODY IS FROM (U.4 third review).
 *
 * Adding a person from another organisation replies "guestFrom", for the lead's line saying they are
 * a guest. It took `User.organizationId`, which is only the organisation they last switched to: a
 * person whose home is Pembe Test Co, who had looked at Mto Test Supplies, was said to be from Mto.
 *
 * Their home is read from their memberships instead: the organisation they own, or else the first one
 * they joined as anything but a guest. A guest membership is never anybody's home.
 */
export interface AMembership {
  organizationId: string;
  role: string;
  createdAt: Date;
  organization: { name: string; ownerUserId: string | null };
}

export function theirHome(userId: string, memberships: AMembership[]): { id: string; name: string } | null {
  const notAGuest = memberships.filter((m) => m.role !== 'GUEST');
  const owned = notAGuest.find((m) => m.organization.ownerUserId === userId);
  const first = [...notAGuest].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  const home = owned ?? first;
  return home ? { id: home.organizationId, name: home.organization.name } : null;
}
