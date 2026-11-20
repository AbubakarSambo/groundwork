import { WhatsAppService } from './whatsapp.service';
import { CHECK_INS_ARE_PAUSED } from '../billing/the-trial-grace';

jest.mock('../billing/the-trial-grace', () => ({ ...jest.requireActual('../billing/the-trial-grace'), thisOrganisationIsPaused: jest.fn(async () => true) }));

/* Run 6, 20 November: in a pause WhatsApp told people "Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the
   Groundwork app." when no check-in was open in the app either. */
describe('somebody who writes on WhatsApp while Groundwork is paused for their organisation', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });

  it('is told plainly that check-ins are paused, with nowhere to carry on', async () => {
    const rows: any[] = [];
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ ground: { organizationId: 'org-1' } })) },
      person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date() })), findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      whatsAppSend: { create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }), findFirst: jest.fn(async () => null) },
      notification: { create: jest.fn(async () => ({})) },
    };
    const addOn: any = { mayWeSend: jest.fn(async () => ({ send: false, why: 'not turned on', saying: 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.' })), countSent: jest.fn(), countHeld: jest.fn() };
    const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111' } as any)[k] };
    const wa = new WhatsAppService(config, prisma, addOn);
    await wa.sendOn('ours', 'org-1', '+254712345678', 'Thank you. What happened next?');
    const said = fetchSpy.mock.calls.map((c) => JSON.parse(c[1].body).text?.body);
    expect(said).toEqual(['Check-ins are paused until your organisation chooses a plan, so no check-in is open here or in the app.']);
    expect(said[0]).toBe(CHECK_INS_ARE_PAUSED);
    expect(said[0]).not.toMatch(/carry on in the Groundwork app/i);
    expect(addOn.mayWeSend).not.toHaveBeenCalled();
  });
});
