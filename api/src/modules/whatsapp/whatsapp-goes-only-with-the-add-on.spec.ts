import { WhatsAppService } from './whatsapp.service';

/**
 * WHATSAPP GOES ONLY WHEN THE ORGANISATION MAY SEND IT (decision 78).
 *
 * Every send for an organisation asks the add-on first: an organisation after its trial without the
 * add-on, or at its monthly limit, sends nothing by WhatsApp, and the send record carries the sentence
 * the person reads in the app. A message that went counts towards the month. A send on our own number
 * finds its organisation from the check-in it is about. The platform switch and the credentials still
 * gate everything after that, as before.
 */
const HELD = 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.';

function service(may: any, opts: { enabled?: boolean; personWroteAt?: Date } = {}) {
  const sends: any[] = [];
  const counted: string[] = [];
  const held: any[] = [];
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ ground: { organizationId: 'org-baridi' } })) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: opts.personWroteAt ?? new Date() })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: opts.enabled ?? true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppSend: {
      create: jest.fn(async (q: any) => { sends.push(q.data); return {}; }),
      /* Whether the person was already told, in the last 24 hours, that WhatsApp is held. */
      findFirst: jest.fn(async (q: any) => (q?.where?.kind === 'held-told' && sends.some((s) => s.kind === 'held-told' && s.sentAt) ? { id: 'told' } : null)),
    },
    notification: { create: jest.fn(async () => ({})) },
  };
  const addOn: any = {
    mayWeSend: jest.fn(async () => may),
    countSent: jest.fn(async (org: string) => { counted.push(org); }),
    countHeld: jest.fn(async (org: string, why: string) => { held.push([org, why]); }),
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '123456' } as any)[k] };
  return { wa: new WhatsAppService(config, prisma, addOn), sends, counted, held, addOn, prisma };
}

const realFetch = (global as any).fetch;
let fetchSpy: jest.Mock;
beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
afterEach(() => { (global as any).fetch = realFetch; });

describe('an organisation that may not send by WhatsApp', () => {
  /* Changed 2 October: the kinds are Hafsah's (decision 83), and somebody who wrote in the last 24 hours
     is now told once why (decision 82, item 4), so this one last wrote three days ago. */
  it('a check-in notice on our own number is not sent, and the record says what the person reads', async () => {
    const { wa, sends, held, prisma } = service({ send: false, why: 'not turned on', saying: HELD }, { personWroteAt: new Date(Date.now() - 3 * 86_400_000) });
    const got = await wa.sendMessage('+254700000001', 'Your next check-in is open.', { checkInId: 'ci-1', kind: 'checkin-open' });
    expect(got).toEqual({ sent: false, error: HELD });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prisma.checkIn.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ci-1' } }));
    expect(sends[0]).toMatchObject({ organizationId: 'org-baridi', kind: 'checkin-open:held', error: HELD, sentAt: null });
    expect(held).toEqual([['org-baridi', 'not turned on']]);
  });

  it('a reply in the conversation is not sent, nor the list of check-ins; the person is told once why instead', async () => {
    /* Changed 2 October (decision 82, item 4): this was total silence. */
    const saying = 'Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026.';
    const { wa } = service({ send: false, why: 'at the limit', saying });
    expect((await wa.sendFor('org-baridi', '+254700000001', 'Thank you. What happened next?')).sent).toBe(false);
    expect(await wa.sendListFor('org-baridi', '+254700000001', 'Which one?', [], '1. Sales')).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchSpy.mock.calls[0] as any[])[1].body).text.body).toBe(`${saying} You can carry on in the Groundwork app.`);
  });
});

describe('an organisation that may send', () => {
  it('the message goes, and counts towards its month', async () => {
    const { wa, counted } = service({ send: true });
    const got = await wa.sendFor('org-baridi', '+254700000001', 'Thank you. What happened next?');
    expect(got.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(counted).toEqual(['org-baridi']);
  });

  it('the platform switch still gates it, and a message that did not go is not counted', async () => {
    const { wa, counted } = service({ send: true }, { enabled: false });
    expect((await wa.sendFor('org-baridi', '+254700000001', 'Hello.')).sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(counted).toEqual([]);
  });
});

describe('a message about finding the person their organisation', () => {
  it('a number on no roster is still told how to be added: there is no organisation to hold it for', async () => {
    const { wa, addOn } = service({ send: false, why: 'not turned on', saying: HELD });
    const got = await wa.sendMessage('+254700000009', "We don't recognize this number yet.", { kind: 'refusal' });
    expect(got.sent).toBe(true);
    expect(addOn.mayWeSend).not.toHaveBeenCalled();
  });
});
