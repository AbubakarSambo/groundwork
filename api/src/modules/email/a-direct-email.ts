import { theDirectMorningIsOn, theDirectMorningIsOnFor } from '../organisation/the-direct-morning-switch';

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

/** Whether the direct morning is on for the organisation this mail is about. Off wherever it cannot be read. */
export async function theDirectMorningForAMail(prisma: any, to: string | null | undefined, context?: Ctx): Promise<boolean> {
  try {
    if (context?.groundId) return await theDirectMorningIsOnFor(prisma, context.groundId);
    if (context?.participantId) {
      const place = await Promise.resolve(prisma?.groundParticipant?.findUnique?.({ where: { id: context.participantId }, select: { groundId: true } })).catch(() => null);
      if (place?.groundId) return await theDirectMorningIsOnFor(prisma, place.groundId);
    }
    const address = String(to ?? '').trim().toLowerCase();
    if (!address) return false;
    const user = await Promise.resolve(prisma?.user?.findFirst?.({ where: { email: { equals: address, mode: 'insensitive' } }, select: { organizationId: true } })).catch(() => null);
    if (user?.organizationId) return await theDirectMorningIsOn(prisma, user.organizationId);
    const person = await Promise.resolve(prisma?.person?.findFirst?.({ where: { email: { equals: address, mode: 'insensitive' } }, select: { organizationId: true } })).catch(() => null);
    return await theDirectMorningIsOn(prisma, person?.organizationId ?? null);
  } catch {
    return false;
  }
}
