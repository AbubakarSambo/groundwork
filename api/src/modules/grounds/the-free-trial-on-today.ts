import { theOrganisationsZone } from '../../common/the-organisations-own-day';

/**
 * THE FREE TRIAL, ONE LINE ON TODAY (Hafsah, 12 October 2026: "Today shows one line for a new admin: the free
 * trial has started and when it ends."). Only while the trial runs: the organisation was given it
 * (`freeTrialStartedAt`) and its free months (`freeUntil`) have not ended. The day is said in the
 * organisation's own time zone. Null otherwise. Who reads it (an admin) is the caller's rule.
 */
export async function theFreeTrialLine(prisma: any, organizationId: string, now: Date = new Date()): Promise<string | null> {
  const org = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { freeTrialStartedAt: true, freeUntil: true } });
  if (!org?.freeTrialStartedAt || !org?.freeUntil) return null;
  const until = new Date(org.freeUntil);
  if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) return null;
  const zone = (await theOrganisationsZone(prisma, organizationId).catch(() => null)) ?? 'Africa/Lagos';
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: zone }).format(until);
  /* Fix list item 6: one free month, WhatsApp included (the light prototype's s74). */
  return `Your free month has started, WhatsApp included. It ends on ${day}.`;
}
