type Ctx = { groundId?: string; participantId?: string } | undefined | null;

/**
 * THE ORGANISATION A MAIL IS ABOUT, read once here for every rule that depends on it (whether Groundwork is paused there). The
 * check-in the mail is about where it knows one (its context's check-in, or the check-in the person's place is on); otherwise the
 * organisation of the person it is sent to, from their sign-in, else from the roster. Null where none is known.
 */
export async function theOrganisationAMailIsAbout(prisma: any, to: string | null | undefined, context?: Ctx): Promise<string | null> {
  try {
    const groundId = context?.groundId
      ?? (context?.participantId
        ? (await Promise.resolve(prisma?.groundParticipant?.findUnique?.({ where: { id: context.participantId }, select: { groundId: true } })).catch(() => null))?.groundId
        : null);
    if (groundId) {
      const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } })).catch(() => null);
      if (g?.organizationId) return g.organizationId;
    }
    const address = String(to ?? '').trim().toLowerCase();
    if (!address) return null;
    const user = await Promise.resolve(prisma?.user?.findFirst?.({ where: { email: { equals: address, mode: 'insensitive' } }, select: { organizationId: true } })).catch(() => null);
    if (user?.organizationId) return user.organizationId;
    const person = await Promise.resolve(prisma?.person?.findFirst?.({ where: { email: { equals: address, mode: 'insensitive' } }, select: { organizationId: true } })).catch(() => null);
    return person?.organizationId ?? null;
  } catch {
    return null;
  }
}
