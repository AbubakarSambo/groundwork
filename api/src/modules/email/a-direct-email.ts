import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';

/**
 * EVERY EMAIL, DIRECT, BEHIND THE DIRECT MORNING'S SWITCH (Hafsah, 20 October 2026, part 4).
 *
 * With `Organization.directMorningOn` on for the organisation an email is about, the email says what happened, with names, numbers,
 * customers and days, and nothing else: no paragraph explaining Groundwork, no note about who can see what, and nothing that hedges.
 * With it off, every word is what it was. Who can see what never changes with it: a note is deleted, a rule never is.
 *
 * WHICH ORGANISATION. The check-in the mail is about where it knows one (its context's check-in, or the check-in the person's place
 * is on); otherwise the organisation of the person it is sent to, from their sign-in, else from the roster.
 *
 * READ ONCE PER EMAIL. A sender that has already read the switch to write its words marks the mail with what it read, and the one
 * door every mail goes through (EmailService.deliverNow) reads that mark rather than asking again. The mark is taken off before the
 * mail goes. A mail with no mark asks once, there, and only where the footer would be added at all.
 */
const ON = '<span data-gw-direct="on"></span>';
const OFF = '<span data-gw-direct="off"></span>';

export const markedAsDirect = (direct: boolean): string => (direct ? ON : OFF);

/** What a sender read, or null where it did not read the switch. */
export function theDirectMarkOn(html: string): boolean | null {
  if (html.includes(ON)) return true;
  if (html.includes(OFF)) return false;
  return null;
}

export const withoutTheDirectMark = (html: string): string => html.split(ON).join('').split(OFF).join('');

type Ctx = { groundId?: string; participantId?: string } | undefined | null;

/**
 * THE ORGANISATION A MAIL IS ABOUT, read once here for every rule that depends on it (the direct morning, and whether Groundwork is
 * paused there). The check-in the mail is about where it knows one (its context's check-in, or the check-in the person's place is
 * on); otherwise the organisation of the person it is sent to, from their sign-in, else from the roster. Null where none is known.
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

/** Whether the direct morning is on for the organisation this mail is about. Off wherever it cannot be read. */
export async function theDirectMorningForAMail(prisma: any, to: string | null | undefined, context?: Ctx): Promise<boolean> {
  return theDirectMorningIsOn(prisma, await theOrganisationAMailIsAbout(prisma, to, context));
}
