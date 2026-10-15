import type { PrismaService } from '../prisma/prisma.service';

/**
 * THE ROSTER ENTRY OF SOMEBODY WHO SIGNS IN, CLAIMED OR MADE (pilots, 13 October 2026, problem 8).
 *
 * Ask Groundwork answers a person through their entry on the organisation's roster. In the app, Ask makes or claims
 * that entry for a signed-in person the first time they ask. On WhatsApp it did not: Wanjiru saved Brian's number on
 * People, which keeps it on his sign-in, and his "ask" was answered "Ask Muchemi & Co (test) needs your number on your
 * organisation's roster. Ask your admin to add it". The number already said who he is. This is the same claim-or-make
 * the app uses, in one place: an entry already linked to the sign-in, else an unclaimed one with the same address, else
 * a new one with the sign-in's name and address and nothing else.
 */
export const MADE_BY_GROUNDWORK = 'groundwork';

export async function theirOwnRosterEntry(prisma: PrismaService | any, organizationId: string, userId: string): Promise<{ id: string; externalId: string } | null> {
  const linked = () => prisma.person.findFirst({ where: { organizationId, active: true, linkedUserId: userId }, select: { id: true, externalId: true } });
  const mine = await linked();
  if (mine) return mine;
  /* One switched off by the organisation stays off: nothing is made in its place. */
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true, phoneNumber: true } });
  if (!user) return null;
  const off = await prisma.person.findFirst({
    where: { organizationId, active: false, OR: [{ linkedUserId: userId }, ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' } }] : [])] },
    select: { id: true },
  });
  if (off) return null;
  if (user.email) {
    const unclaimed = await prisma.person.findFirst({
      where: { organizationId, active: true, linkedUserId: null, email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, externalId: true },
    });
    if (unclaimed) {
      const took = await prisma.person.updateMany({ where: { id: unclaimed.id, linkedUserId: null }, data: { linkedUserId: userId } });
      if (took.count === 1) return unclaimed;
      return linked();
    }
  }
  const givenName = user.firstName?.trim() || null;
  const familyName = user.lastName?.trim() || null;
  try {
    return await prisma.person.create({
      data: {
        organizationId,
        sourceSystem: MADE_BY_GROUNDWORK,
        externalId: userId,
        userName: user.email ?? userId,
        displayName: [givenName, familyName].filter(Boolean).join(' ') || null,
        givenName,
        familyName,
        email: user.email ?? null,
        /* The number on their sign-in is their number on the roster too: one number for a person (reviewer, 14 October). */
        phone: (user as any).phoneNumber ?? null,
        linkedUserId: userId,
        active: true,
      },
      select: { id: true, externalId: true },
    });
  } catch {
    return linked();
  }
}
