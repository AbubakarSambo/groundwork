import { AuthService } from './auth.service';

/** WHETHER WHATSAPP IS SWITCHED ON FOR A PERSON (U.3): in Groundwork, or by their organisation's own number. */
function make(platform: boolean | 'throws', own: { enabled: boolean } | null) {
  const prisma: any = { whatsAppConnection: { findUnique: jest.fn(async () => own) } };
  const whatsapp: any = { isEnabled: jest.fn(async () => { if (platform === 'throws') throw new Error('x'); return platform; }) };
  return new AuthService(prisma, {} as any, {} as any, {} as any, whatsapp, {} as any, { emit: () => undefined } as any);
}

describe('WhatsApp is on', () => {
  it('when it is on in Groundwork', async () => expect(await make(true, null).whatsappIsOn('o1')).toBe(true));
  it('when the organisation\'s own number is connected and on', async () => expect(await make(false, { enabled: true }).whatsappIsOn('o1')).toBe(true));
  it('not when neither', async () => expect(await make(false, { enabled: false }).whatsappIsOn('o1')).toBe(false));
  it('and not when it cannot be told', async () => expect(await make('throws', null).whatsappIsOn('o1')).toBe(false));
});
