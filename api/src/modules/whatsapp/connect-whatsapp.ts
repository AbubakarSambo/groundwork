import { whatsAppIsOnFor } from './only-where-whatsapp-is-turned-on';
import type { ConfigService } from '@nestjs/config';
import { GroundworksOwnNumber } from './groundworks-own-number';
import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';
import { inboundKeysFrom } from './one-number-per-conversation';

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

/** The sentence the invitation email carries, with the number. */
export const youCanAlsoAnswerOnWhatsApp = (number: string) => `You can also answer on WhatsApp: send Hi to ${number}.`;

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
    if (switchedOn?.value !== true) return null;
    const org = await prisma.organization?.findUnique?.({ where: { id: who.organizationId }, select: { whatsappAddOnOn: true, whatsappFreeUntil: true } });
    if (!whatsAppIsOnFor(org)) return null;
    const own = await prisma.whatsAppConnection?.findUnique?.({ where: { organizationId: who.organizationId }, select: { enabled: true } })?.catch?.(() => null);
    if (own?.enabled) return null;
    if (!who.forTheInvitation && (await theyHaveWrittenFromTheirNumber(prisma, who))) return null;
    return { link: aConnectLink(number), number, says: CONNECT_WHATSAPP };
  } catch {
    return null;
  }
}

/** Their saved number (roster first, then their sign-in), and whether anything has ever come from it. */
async function theyHaveWrittenFromTheirNumber(prisma: any, who: { organizationId?: string | null; userId?: string | null; email?: string | null }): Promise<boolean> {
  const person = await prisma.person?.findFirst?.({
    where: { organizationId: who.organizationId, OR: [...(who.userId ? [{ linkedUserId: who.userId }] : []), ...(who.email ? [{ email: who.email.toLowerCase() }] : [])] },
    select: { phone: true, whatsappLastInboundAt: true },
  });
  if (person?.whatsappLastInboundAt) return true;
  const user = who.userId ? await prisma.user?.findUnique?.({ where: { id: who.userId }, select: { phoneNumber: true } }) : null;
  const phone = person?.phone ?? user?.phoneNumber ?? null;
  if (!phone) return false;
  const forms = formsOfTheSameNumber(phone);
  const came = await prisma.whatsAppInboundMessage?.findFirst?.({
    where: { OR: forms.flatMap((f: string) => [{ messageId: { startsWith: inboundKeysFrom('ours', f) } }, { messageId: { startsWith: inboundKeysFrom('theirs', f) } }]) },
    select: { messageId: true },
  });
  return !!came;
}
