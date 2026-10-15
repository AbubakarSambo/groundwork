import { WhatsAppService } from './whatsapp.service';

/**
 * A PERSON IS TOLD WHEN WHATSAPP IS HELD, NEVER LEFT IN SILENCE (decision 82, item 4; morning report
 * item 71). When the add-on is off or the month's messages are used, nothing went by WhatsApp: a person
 * who wrote heard nothing. Now, if they wrote in the last 24 hours, they get one free message saying
 * why and that the check-in carries on in the app. Once in 24 hours, and never counted.
 */
const HELD = 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.';

function aHeldOrganisation(opts: { toldInTheLastDay?: boolean; personWroteAt?: Date | null } = {}) {
  const rows: any[] = [];
  const counted: string[] = [];
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ ground: { organizationId: 'org-1' } })) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: opts.personWroteAt === undefined ? new Date() : opts.personWroteAt })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }), findFirst: jest.fn(async () => (opts.toldInTheLastDay ? { id: 'told' } : null)) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const addOn: any = { mayWeSend: jest.fn(async () => ({ send: false, why: 'not turned on', saying: HELD })), countSent: jest.fn(async (o: string) => { counted.push(o); }), countHeld: jest.fn(async () => undefined) };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111' } as any)[k] };
  return { wa: new WhatsAppService(config, prisma, addOn), rows, counted };
}

const realFetch = (global as any).fetch;
let fetchSpy: jest.Mock;
const bodies = () => fetchSpy.mock.calls.map((c) => JSON.parse(c[1].body).text?.body);
beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
afterEach(() => { (global as any).fetch = realFetch; });

describe('somebody who wrote, while WhatsApp is held', () => {
  it('is told once, in plain words, why, and that the check-in carries on in the app', async () => {
    const { wa, rows, counted } = aHeldOrganisation();
    const got = await wa.sendOn('ours', 'org-1', '+254712345678', 'Thank you. What happened next?');
    expect(got).toEqual({ sent: false, error: HELD });
    expect(bodies()).toEqual(['Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the Groundwork app.']);
    expect(rows.map((r) => r.kind)).toEqual(['held', 'held-told']);
    expect(counted).toEqual([]);
  });

  it('is not told again within the same 24 hours', async () => {
    const { wa } = aHeldOrganisation({ toldInTheLastDay: true });
    await wa.sendOn('ours', 'org-1', '+254712345678', 'Thank you. What happened next?');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a reminder held for somebody who has not written in 24 hours sends nothing at all; the app says it from the record', async () => {
    const { wa, rows } = aHeldOrganisation({ personWroteAt: new Date(Date.now() - 3 * 86_400_000) });
    await wa.sendFor('org-1', '+254712345678', 'Hi Miriam, your check-in for the sales team is overdue.', { checkInId: 'ci-1', kind: 'overdue' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows).toEqual([expect.objectContaining({ kind: 'overdue:held', error: HELD, sentAt: null })]);
  });
});
