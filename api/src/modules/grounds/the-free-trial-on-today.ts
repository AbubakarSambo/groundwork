import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { theNoteAboutPaying, TOLD_ABOUT_PAYING } from '../billing/the-trial-grace';

/**
 * THE FREE TRIAL, ONE LINE ON TODAY (Hafsah, 12 October 2026: "Today shows one line for a new admin: the free
 * trial has started and when it ends."). While the trial runs, to an admin: the organisation was given it
 * (`freeTrialStartedAt`) and its free months (`freeUntil`) have not ended. The day is said in the
 * organisation's own time zone.
 *
 * AND ONCE IT HAS ENDED (Hafsah, 2 November 2026): the quiet note about the four weeks, and the pause after them, to the admins
 * and the leads (billing/the-trial-grace.ts, the words and who reads them). Null for anybody else, and otherwise.
 */
export async function theFreeTrialLine(prisma: any, organizationId: string, userId: string, role: string, now: Date = new Date()): Promise<string | null> {
  if (role === 'ADMIN') {
    const org = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { freeTrialStartedAt: true, freeUntil: true } });
    const until = org?.freeTrialStartedAt && org?.freeUntil ? new Date(org.freeUntil) : null;
    if (until && !Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      const zone = (await theOrganisationsZone(prisma, organizationId).catch(() => null)) ?? 'Africa/Lagos';
      const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: zone }).format(until);
      /* Fix list item 6: one free month, WhatsApp included (the light prototype's s74). */
      return `Your free month has started, WhatsApp included. It ends on ${day}.`;
    }
    return theNoteAboutPaying(prisma, organizationId, 'admin', now);
  }
  const told = await Promise.resolve(prisma?.user?.count?.({ where: { id: userId, ...TOLD_ABOUT_PAYING(organizationId) } })).catch(() => 0);
  return told ? theNoteAboutPaying(prisma, organizationId, 'lead', now) : null;
}
