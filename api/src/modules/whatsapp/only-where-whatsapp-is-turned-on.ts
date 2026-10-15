import type { PrismaService } from '../prisma/prisma.service';

/**
 * NOTHING NEW ON WHATSAPP REACHES AN ORGANISATION THAT NEVER TURNED WHATSAPP ON (decisions 78 and 88).
 *
 * The morning reminder, the reminder before a check-in opens, and the lead's daily summary did not
 * exist before this release. The add-on gate in the sender (billing/whatsapp-add-on.service.ts) holds a
 * message only while the paid-add-on switch is on; while that switch is off it lets every message go.
 * So these three jobs ask this first and write nothing, send nothing and count nothing for an
 * organisation that has not turned WhatsApp on, or while the platform's WhatsApp switch is off.
 *
 * The organisation has turned it on when its add-on is on. Asked once per organisation.
 */
export async function organisationsThatTurnedWhatsAppOn(
  prisma: PrismaService,
  whatsapp: { isEnabled(): Promise<boolean> },
  organizationIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(organizationIds.filter(Boolean))];
  if (!ids.length) return new Set();
  if (!(await whatsapp.isEnabled().catch(() => false))) return new Set();
  /* Added to the subscription, or in the free WhatsApp month every organisation gets (Hafsah, 13 October 2026, evening). */
  const rows: { id: string }[] = await prisma.organization.findMany({ where: { id: { in: ids }, ...WHATSAPP_IS_ON_FOR_THEM() }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

/** The organisations WhatsApp is on for now: added to the subscription, or still in their free WhatsApp month. */
export const WHATSAPP_IS_ON_FOR_THEM = (now: Date = new Date()) => ({ OR: [{ whatsappAddOnOn: true }, { whatsappFreeUntil: { gt: now } }] });

/** The same, for one organisation already read. */
export function whatsAppIsOnFor(org: { whatsappAddOnOn?: boolean | null; whatsappFreeUntil?: Date | string | null } | null | undefined, now: Date = new Date()): boolean {
  return !!org && (!!org.whatsappAddOnOn || (!!org.whatsappFreeUntil && new Date(org.whatsappFreeUntil).getTime() > now.getTime()));
}
