import { formsOfTheSameNumber } from './a-number-whatsapp-can-reach';
import { inboundKeysFrom } from './one-number-per-conversation';

/**
 * WHERE SOMEBODY IS ON WHATSAPP, FROM THE RECORD (pilots on WhatsApp, 14 October). People showed nowhere whether a team member
 * could check in on WhatsApp. Three states, each read from what happened, never set by hand:
 *   - no number:                  nothing saved for them;
 *   - not connected:              a number is saved, and nothing has been sent there or come from it;
 *   - waiting: an opening (or another message) went there, and they have not written back;
 *   - connected:                  they have written to Groundwork from that number.
 */
export type WhereOnWhatsApp = 'no-number' | 'not-connected' | 'waiting' | 'connected';

export const WHERE_ON_WHATSAPP_SAYS: Record<WhereOnWhatsApp, string> = {
  'no-number': 'No WhatsApp number yet.',
  'not-connected': 'Not connected yet. Nothing has been sent to this number.',
  waiting: 'They have not written on WhatsApp yet.',
  connected: 'Connected. They can check in on WhatsApp.',
};

export async function whereTheyAreOnWhatsApp(prisma: any, phone: string | null | undefined): Promise<WhereOnWhatsApp> {
  if (!phone) return 'no-number';
  const forms = formsOfTheSameNumber(phone);
  const came = await Promise.resolve(prisma.whatsAppInboundMessage?.findFirst?.({
    where: { OR: forms.flatMap((f: string) => [{ messageId: { startsWith: inboundKeysFrom('ours', f) } }, { messageId: { startsWith: inboundKeysFrom('theirs', f) } }]) },
    select: { messageId: true },
  })).catch(() => null);
  if (came) return 'connected';
  const went = await Promise.resolve(prisma.whatsAppSend?.findFirst?.({ where: { phone: { in: forms }, sentAt: { not: null } }, select: { id: true } })).catch(() => null);
  return went ? 'waiting' : 'not-connected';
}
