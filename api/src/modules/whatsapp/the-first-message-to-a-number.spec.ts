import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT } from './a-message-outside-the-window';
import { FIRST_CONTACT_NOT_APPROVED } from './the-first-message-to-a-number';

/**
 * THE FIRST MESSAGE GROUNDWORK EVER SENDS TO A NUMBER names the organisation and says "Not you? Reply
 * STOP." (decision 106 item 2). Read as Amani reads it on her phone, from what Meta is sent.
 */
const OPEN = ['Amani', 'Sales team, Q4'];
const OPEN_TEXT = fill(TEMPLATES['checkin-open'].body, OPEN);

function aSender(o: { sentBefore?: boolean; wroteBefore?: boolean; approved?: string[]; saidStop?: boolean }) {
  const rows: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Kito Foods', whatsappAddOnOn: true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: null })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => (o.wroteBefore ? { messageId: 'ours:+254700000001:x' } : null)) },
    whatsAppSend: {
      create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async (q: any) => {
        if (q?.where?.kind?.in) return o.saidStop ? { kind: 'stopped' } : null;
        return o.sentBefore ? { id: 'earlier' } : null;
      }),
    },
    notification: { create: jest.fn(async () => ({})) },
  };
  const approved = o.approved ?? THE_NAMES_TO_SUBMIT;
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': approved } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('the first message to a number', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const what = () => JSON.parse(fetchSpy.mock.calls[0][1].body);
  const read = (body: any) => fill(TEMPLATES['first-contact'].body, body.template.components[0].parameters.map((p: any) => p.text));

  it('is submitted to Meta with the others', () => {
    expect(THE_NAMES_TO_SUBMIT).toContain('groundwork_first_contact');
  });

  it('names the organisation, carries the message, and says "Not you? Reply STOP."', async () => {
    const { wa } = aSender({});
    expect((await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN })).sent).toBe(true);
    expect(what().template.name).toBe('groundwork_first_contact');
    expect(read(what())).toBe('This is Groundwork, writing for Kito Foods. Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin. Not you? Reply STOP.');
  });

  it('the second is the ordinary message, with nothing added', async () => {
    const { wa } = aSender({ sentBefore: true });
    await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(what().template.name).toBe('checkin_open');
  });

  it('nor when the person has written to Groundwork before', async () => {
    const { wa } = aSender({ wroteBefore: true });
    await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(what().template.name).toBe('checkin_open');
  });

  it('any kind of first message carries it, an approval too', async () => {
    const { wa } = aSender({});
    await wa.sendFor('org-1', '+254700000001', 'Hi Wairimu, Amani has asked for leave from Tuesday 20 October to Thursday 22 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.', { kind: 'request-waiting', params: ['Wairimu', 'Amani', 'leave from Tuesday 20 October to Thursday 22 October'] });
    expect(read(what())).toBe('This is Groundwork, writing for Kito Foods. Hi Wairimu, Amani has asked for leave from Tuesday 20 October to Thursday 22 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first. Not you? Reply STOP.');
  });

  it('until Meta approves it, a first message is recorded as not sent, never sent without the protection', async () => {
    const { wa, rows } = aSender({ approved: ['checkin_open'] });
    const r = await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(r).toEqual({ sent: false, error: FIRST_CONTACT_NOT_APPROVED });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows[0].error).toBe(FIRST_CONTACT_NOT_APPROVED);
  });

  it('after STOP from that number, nothing more goes, whoever the number belongs to', async () => {
    const { wa } = aSender({ saidStop: true, sentBefore: true });
    const r = await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(r.sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  /* User journeys, F-19: two check-ins opened for one person in the same moment sent two introductions, each ending 'Not you? Reply STOP.' */
  it('two check-ins opening at once: only the very first message carries the introduction', async () => {
    const { wa } = aSender({});
    const other = ['Amani', 'Renewals'];
    await Promise.all([
      wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN }),
      wa.sendFor('org-1', '+254700000001', fill(TEMPLATES['checkin-open'].body, other), { kind: 'checkin-open', params: other }),
    ]);
    const names = fetchSpy.mock.calls.map((c: any) => JSON.parse(c[1].body).template.name).sort();
    expect(names).toEqual(['checkin_open', 'groundwork_first_contact']);
  });
});
