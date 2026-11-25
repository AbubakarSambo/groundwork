import { whatsAppIsOnFor } from './only-where-whatsapp-is-turned-on';
import type { ConfigService } from '@nestjs/config';
import { GroundworksOwnNumber } from './groundworks-own-number';
import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';
import { inboundKeysFrom } from './one-number-per-conversation';
import { itSendsFromTheirNumber, WHAT_SAYS_IT_WORKS } from './a-connection-that-works';
import { theNumberOnRecord } from './one-number-for-a-person';

/**
 * "CONNECT WHATSAPP": ONE TAP THAT OPENS WHATSAPP WITH "Hi" ALREADY TYPED TO GROUNDWORK'S NUMBER
 * (decision 106 item 4, and Hafsah's addition the same night).
 *
 * An optional extra. It is offered while:
 *  - WhatsApp is on: the platform switch (/admin/whatsapp) and the organisation's add-on, and the
 *    organisation has no number of its own connected (then the link would point at the wrong number);
 *  - a display number is saved for Groundwork's number (on /admin/whatsapp, or WHATSAPP_DISPLAY_NUMBER);
 *  - the check-in it is shown on is not kept in the app;
 *  - and, on the screens, the person has never written to Groundwork from their number, or has no number
 *    saved. Once they write, it disappears. The invitation email leaves this last one out: it says the
 *    number is there to use, which is true whoever has written before.
 * Null otherwise. It is served only on the person's own reads.
 */
export const CONNECT_WHATSAPP = 'Connect WhatsApp';

export type ConnectWhatsApp = { link: string; number: string; says: typeof CONNECT_WHATSAPP } | null;

/** "https://wa.me/447700900123?text=Hi": digits only, no plus. */
export function aConnectLink(displayNumber: string): string {
  return `https://wa.me/${displayNumber.replace(/\D/g, '')}?text=Hi`;
}

/**
 * "YOU CAN ALSO CHECK IN ON WHATSAPP" (Hafsah's fix list, item 5, 14 October 2026: "People can't easily tell they can check
 * in on WhatsApp. Make it clearly visible wherever someone is about to check in or is reminded to ... One short line and
 * a clear way to connect"). The same line on the invitation, the reminders, the check-in page, the end of a session and
 * Today, always with "Connect WhatsApp", and only where it is offered (connectWhatsAppFor).
 */
export const YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP = 'You can also check in on WhatsApp.';

/** The sentence an email carries, with the number: two full sentences, never joined with a colon. */
export const youCanAlsoAnswerOnWhatsApp = (number: string) => `${YOU_CAN_ALSO_CHECK_IN_ON_WHATSAPP} Send Hi to ${number}.`;

export async function connectWhatsAppFor(
  prisma: any,
  config: Pick<ConfigService, 'get'>,
  who: { organizationId: string | null | undefined; userId?: string | null; email?: string | null; keptInTheApp?: boolean; forTheInvitation?: boolean },
): Promise<ConnectWhatsApp> {
  try {
    if (!who.organizationId || who.keptInTheApp) return null;
    const ours = await new GroundworksOwnNumber(config, prisma).inUse();
    const number = ours.displayNumber?.trim();
    if (!ours.enabled || !number || !/\d{7,}/.test(number.replace(/\D/g, ''))) return null;
    const switchedOn = await prisma.platformSetting?.findUnique?.({ where: { key: 'whatsapp_enabled' } });
    if (switchedOn?.value === false) return null;
    const org = await prisma.organization?.findUnique?.({ where: { id: who.organizationId }, select: { whatsappAddOnOn: true, whatsappFreeUntil: true } });
    if (!whatsAppIsOnFor(org)) return null;
    /* Only an organisation number that really works points elsewhere; a half-set-up row is no connection (a-connection-that-works.ts). */
    const own = await prisma.whatsAppConnection?.findUnique?.({ where: { organizationId: who.organizationId }, select: WHAT_SAYS_IT_WORKS })?.catch?.(() => null);
    if (itSendsFromTheirNumber(own)) return null;
    if (!who.forTheInvitation && (await theyHaveWrittenFromTheirNumber(prisma, who))) return null;
    return { link: aConnectLink(number), number, says: CONNECT_WHATSAPP };
  } catch {
    return null;
  }
}

/**
 * CONNECTED ON WHATSAPP (Hafsah, 14 October: "each opening message goes on one channel only"): WhatsApp is on for the
 * organisation and the person has written to Groundwork from their number (they have joined there). Then a session's
 * opening goes on WhatsApp alone; otherwise by email alone.
 */
export async function theyAreConnectedOnWhatsApp(prisma: any, who: { organizationId: string | null | undefined; userId?: string | null; email?: string | null }): Promise<boolean> {
  try {
    if (!who.organizationId) return false;
    const org = await prisma.organization?.findUnique?.({ where: { id: who.organizationId }, select: { whatsappAddOnOn: true, whatsappFreeUntil: true } });
    if (!whatsAppIsOnFor(org)) return false;
    return await theyHaveWrittenFromTheirNumber(prisma, who);
  } catch {
    return false;
  }
}

/**
 * Their saved number (every roster entry that is them, then their sign-in), and whether anything has ever come from THAT number.
 *
 * ABOUT THE NUMBER THEY HAVE NOW (Drop Access, 21 October; findings 1.4 D). This trusted the roster's "last wrote" stamp whatever
 * number it came from, so somebody whose number was changed still read as connected: the opening email was skipped and the WhatsApp
 * opening to the new number was refused. The stamp counts only where Groundwork has already written to the number they have now; a
 * message that came from that number always counts.
 */
async function theyHaveWrittenFromTheirNumber(prisma: any, who: { organizationId?: string | null; userId?: string | null; email?: string | null }): Promise<boolean> {
  if (!who.organizationId) return false;
  const phone = await theNumberOnRecord(prisma, who.organizationId, who);
  if (!phone) return false;
  const forms = formsOfTheSameNumber(phone);
  const came = await prisma.whatsAppInboundMessage?.findFirst?.({
    where: { OR: forms.flatMap((f: string) => [{ messageId: { startsWith: inboundKeysFrom('ours', f) } }, { messageId: { startsWith: inboundKeysFrom('theirs', f) } }]) },
    select: { messageId: true },
  });
  if (came) return true;
  const stamped = await prisma.person?.findFirst?.({ where: { organizationId: who.organizationId, phone: { in: forms }, whatsappLastInboundAt: { not: null } }, select: { id: true } });
  if (!stamped) return false;
  const went = await prisma.whatsAppSend?.findFirst?.({ where: { phone: { in: forms }, sentAt: { not: null } }, select: { id: true } });
  return !!went;
}
