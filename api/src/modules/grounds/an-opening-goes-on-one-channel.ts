import { whatsAppIsOnFor } from '../whatsapp/only-where-whatsapp-is-turned-on';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';

/**
 * EACH OPENING GOES ON ONE CHANNEL ONLY: WHATSAPP IF THEY CAN BE REACHED THERE, OTHERWISE EMAIL (Hafsah's standing rule, release plan
 * Part 0; Drop Access run 1, item 10).
 *
 * In the run every opening went twice. At 05:00 UTC each morning Kevin, Mercy and Joseph were sent `checkin_open` on WhatsApp, and a
 * twentieth of a second later the email "Your next check-in is open: Sales team, Q4". The email was skipped only for somebody who had
 * already written from their number, and none of them had: they checked in on the screen. Now the email asks what became of the
 * WhatsApp opening for the same check-in, from the send record:
 *   - it went, or it is held for the night and goes at seven: WhatsApp was the channel, and no email goes;
 *   - it was tried and did not go (no approved template, STOP, the month's limit): the email goes;
 *   - nothing is recorded yet, and they can be reached on WhatsApp (a number, WhatsApp on for the organisation, the check-in not kept
 *     in the app): the WhatsApp opening is still on its way, so the email waits for the next sweep, half an hour at the most;
 *   - they cannot be reached on WhatsApp: the email goes.
 */
export type WhatBecameOfTheOpening = 'went' | 'did-not-go' | 'not-yet';

/** A WhatsApp opening the send record says went, or is held for the night (it goes at seven). */
export function whatBecameOfIt(rows: { kind: string | null; sentAt: Date | string | null }[]): WhatBecameOfTheOpening {
  const openings = rows.filter((r) => /^checkin-open(?::|$)/.test(r.kind ?? ''));
  if (!openings.length) return 'not-yet';
  if (openings.some((r) => r.sentAt || /:quiet-hours$/.test(r.kind ?? ''))) return 'went';
  return 'did-not-go';
}

export const THE_WHATSAPP_OPENING_MAY_TAKE_MS = 30 * 60 * 1000;

export async function theEmailOpeningShould(
  prisma: any,
  ci: { id: string; availableFrom?: Date | string | null; participant: { email: string | null; userId: string | null; user?: { phoneNumber?: string | null } | null; ground: { organizationId: string; overWhatsApp?: boolean | null } } },
  now: Date = new Date(),
): Promise<'send' | 'skip' | 'wait'> {
  const rows: any[] = await Promise.resolve(prisma.whatsAppSend?.findMany?.({ where: { checkInId: ci.id, kind: { startsWith: 'checkin-open' } }, select: { kind: true, sentAt: true } }) ?? []).catch(() => []);
  const became = whatBecameOfIt(Array.isArray(rows) ? rows : []);
  if (became === 'went') return 'skip';
  if (became === 'did-not-go') return 'send';
  const g = ci.participant.ground;
  if (keptOffThePhone(g)) return 'send';
  const org = await Promise.resolve(prisma.organization?.findUnique?.({ where: { id: g.organizationId }, select: { whatsappAddOnOn: true, whatsappFreeUntil: true } })).catch(() => null);
  if (!whatsAppIsOnFor(org)) return 'send';
  const person = ci.participant.email
    ? await Promise.resolve(prisma.person?.findFirst?.({ where: { organizationId: g.organizationId, email: { equals: ci.participant.email, mode: 'insensitive' }, active: true }, select: { phone: true, whatsappStoppedAt: true } })).catch(() => null)
    : null;
  if (person?.whatsappStoppedAt) return 'send';
  const phone = person?.phone ?? ci.participant.user?.phoneNumber ?? null;
  if (!phone) return 'send';
  const since = ci.availableFrom ? new Date(ci.availableFrom).getTime() : now.getTime();
  return now.getTime() - since < THE_WHATSAPP_OPENING_MAY_TAKE_MS ? 'wait' : 'send';
}
