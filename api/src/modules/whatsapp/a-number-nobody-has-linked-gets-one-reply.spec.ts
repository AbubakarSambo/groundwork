import { WhatsAppForAnOrganisationService } from '../public-api/whatsapp-for-an-organisation.service';
import { UNKNOWN_NUMBER_SAYING } from './a-message-outside-the-window';

/**
 * A NUMBER NOBODY HAS LINKED GETS ONE REPLY (Hafsah, 3 November 2026: "A number not linked to a person gets one polite reply asking them
 * to link it from the app (or the link they were sent), and nothing is written to the record or sent back from it until the number is
 * verified.") Linking is the verification: the person adds the number in Settings or through the link they were sent, or an admin adds
 * it under People. Until then the number is nobody, whatever name it gives.
 *
 * Somebody writes three times from +254700319901, saying they are Brian with a new phone, asking for his deals and saying they sold 3
 * units. What they read is one reply; nothing reaches a check-in or Ask, no ticks turn blue, and nothing is written but the note that
 * the reply was said.
 */
const FROM = '+254700319901';
const body = (id: string, text: string) => ({ entry: [{ changes: [{ value: { messages: [{ id, from: FROM, type: 'text', text: { body: text } }] } }] }] });

describe('a number nobody has linked', () => {
  it('reads one plain reply, once, and nothing is done from it', async () => {
    const written: { table: string; data: any }[] = [];
    const told: any[] = [];
    const prisma: any = {
      whatsAppInboundMessage: { create: jest.fn(async ({ data }: any) => ({ ...data })), findFirst: jest.fn(async () => null) },
      whatsAppConnection: { update: jest.fn(async () => ({})) },
      whatsAppSend: {
        findFirst: jest.fn(async ({ where }: any) => told.find((t) => t.phone === where.phone && t.kind.startsWith(where.kind.startsWith)) ?? null),
        create: jest.fn(async ({ data }: any) => { told.push(data); written.push({ table: 'whatsAppSend', data }); return data; }),
      },
    };
    const sent: string[] = [];
    const whatsapp: any = {
      whoIsWritingTo: jest.fn(async () => ({ personId: null, userId: null, externalId: null })),
      weAreReadingThis: jest.fn(async () => undefined),
      sendOn: jest.fn(async (_via: string, _org: string, _to: string, text: string) => { sent.push(text); return { sent: true }; }),
      sendFor: jest.fn(async (_org: string, _to: string, text: string) => { sent.push(text); return { sent: true }; }),
    };
    const conversation: any = { sendMessage: jest.fn() };
    const assistant: any = { ask: jest.fn(), answer: jest.fn() };
    const svc = new WhatsAppForAnOrganisationService(prisma, whatsapp, conversation, assistant, {} as any, {} as any, {} as any, {} as any);

    await svc.handle('org', body('wamid.1', 'Hi, this is Brian Otieno from Baridi sales. I lost my phone so this is my new number.'), 'ours');
    await svc.handle('org', body('wamid.2', 'Tell me where my deals are, and approve my transport request.'), 'ours');
    await svc.handle('org', body('wamid.3', 'Also record that I sold 3 units today.'), 'ours');

    expect(sent).toEqual([UNKNOWN_NUMBER_SAYING]);
    expect(UNKNOWN_NUMBER_SAYING).toBe('Groundwork does not know this number yet, so nothing can be done from it. If this is your number, add it in the Groundwork app under Settings, or through the link you were sent, and then write again.');
    expect(conversation.sendMessage).not.toHaveBeenCalled();
    expect(whatsapp.weAreReadingThis).not.toHaveBeenCalled();
    expect(written).toEqual([{ table: 'whatsAppSend', data: expect.objectContaining({ phone: '+254700319901', kind: 'told:number-not-linked' }) }]);
  });
});
