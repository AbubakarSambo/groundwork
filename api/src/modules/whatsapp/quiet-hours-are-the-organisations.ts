import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { inQuietHours, nextAllowedMoment } from '../email/nothing-lands-at-3am';

/**
 * QUIET HOURS ARE THE ORGANISATION'S, ON WHATSAPP TOO (Hafsah's standing rule, release plan Part 0: "quiet hours end at 7am in the
 * organisation's time zone"; Drop Access run 1, item 12).
 *
 * Joseph's day 5 check-in was closed by the clock at 23:30 UTC, and his report notice went on WhatsApp at midnight UTC: three in the
 * morning in Nairobi, where Drop Access is. Mail was already held for the night (nothing-lands-at-3am.ts); nothing Groundwork wrote
 * first on WhatsApp was. Every message Groundwork starts now asks the same rule, read in the organisation's own zone (its named zone,
 * else where most of its people's numbers are, else the product's own), and one asked to go in the night is held and sent at seven.
 * A reply to something the person just wrote is never held: they are awake.
 */
export const QUIET_HOURS_HELD = (until: Date) => `Quiet hours where the organisation is; held until ${until.toISOString()}`;

export function isHeldForTheNight(error?: string | null): boolean {
  return /^Quiet hours where the organisation is/.test(error ?? '');
}

/** Null when a message may go now; otherwise the moment it may (seven in the morning in the organisation's zone, at the earliest). */
export async function heldUntilTheMorning(prisma: any, organizationId: string | null | undefined, now: Date = new Date()): Promise<Date | null> {
  if (!organizationId) return null;
  const zone = await theOrganisationsZone(prisma, organizationId).catch(() => null);
  if (!inQuietHours(now, zone, null)) return null;
  return nextAllowedMoment(now, zone, null);
}
