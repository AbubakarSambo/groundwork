import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT, OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';

/**
 * A SWITCHED-OFF CONNECTION IS NO CONNECTION (Drop Access, October). An organisation that once saved
 * a number of its own and switched it off sends on Groundwork's number, so the templates Groundwork's
 * Meta app has approved are the ones that count. Its own list starts empty; reading it there left
 * every check-in opening outside the 24 hours recorded as not sent, and nobody was told.
 *
 * Read as Amani reads it on her phone: what Meta is sent, on which number.
 */
const OPEN = ['Amani', 'Sales team, Q4'];
const OPEN_TEXT = fill(TEMPLATES['checkin-open'].body, OPEN);

function aSender(connection: { enabled: boolean; approvedTemplates: string[] } | null, o: { lastInboundAt?: Date | null } = {}) {
  const rows: any[] = [];
  const row = connection
    ? { id: 'conn-1', organizationId: 'org-1', phoneNumberId: '999999', accessToken: 'their-token', appSecret: null, verifyToken: 'v', displayNumber: '+254711000000', ...connection }
    : null;
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async (q: any) => (row && q?.select ? Object.fromEntries(Object.keys(q.select).map((k) => [k, (row as any)[k]])) : row)), update: jest.fn(async () => ({})) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Drop Access', whatsappAddOnOn: true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: o.lastInboundAt ?? null })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: {
      create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async (q: any) => (q?.where?.kind?.in ? null : { id: 'sent-before' })),
    },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'our-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': THE_NAMES_TO_SUBMIT } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('a switched-off connection is no connection', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const sentTo = () => fetchSpy.mock.calls.map((c: any) => ({ url: c[0] as string, body: JSON.parse(c[1].body), token: c[1].headers.Authorization }));

  it('switched off, with an empty list of its own: the opening goes on Groundwork\'s number, with Groundwork\'s approved template', async () => {
    const { wa } = aSender({ enabled: false, approvedTemplates: [] });
    const r = await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(r.sent).toBe(true);
    const [call] = sentTo();
    expect(call.url).toContain('/111111/messages');
    expect(call.token).toBe('Bearer our-token');
    expect(call.body.template.name).toBe('checkin_open');
    expect(fill(TEMPLATES['checkin-open'].body, call.body.template.components[0].parameters.map((p: any) => p.text))).toBe(OPEN_TEXT);
  });

  it('switched off reads exactly as no connection at all', async () => {
    const off = aSender({ enabled: false, approvedTemplates: [] });
    const none = aSender(null);
    await off.wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    await none.wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    const [a, b] = fetchSpy.mock.calls.map((c: any) => ({ url: c[0], body: c[1].body }));
    expect(a).toEqual(b);
  });

  it('inside the 24 hours, switched off, it goes as the plain message on Groundwork\'s number', async () => {
    const { wa } = aSender({ enabled: false, approvedTemplates: [] }, { lastInboundAt: new Date(Date.now() - 60 * 60_000) });
    await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    const [call] = sentTo();
    expect(call.url).toContain('/111111/messages');
    expect(call.body.type).toBe('text');
  });

  it('switched on, its own list still decides: an empty one is recorded as not sent, on nobody\'s number', async () => {
    const { wa, rows } = aSender({ enabled: true, approvedTemplates: [] });
    const r = await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN });
    expect(r).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows[0].error).toBe(OUTSIDE_THE_WINDOW);
  });

  it('switched on, with its own template approved: it goes on their number, with their token', async () => {
    const { wa } = aSender({ enabled: true, approvedTemplates: ['checkin_open'] });
    expect((await wa.sendFor('org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN })).sent).toBe(true);
    const [call] = sentTo();
    expect(call.url).toContain('/999999/messages');
    expect(call.token).toBe('Bearer their-token');
    expect(call.body.template.name).toBe('checkin_open');
  });

  it('switched on, a message on Groundwork\'s number uses Groundwork\'s list, not theirs', async () => {
    const { wa } = aSender({ enabled: true, approvedTemplates: [] });
    expect((await wa.sendOn('ours', 'org-1', '+254700000001', OPEN_TEXT, { kind: 'checkin-open', params: OPEN })).sent).toBe(true);
    const [call] = sentTo();
    expect(call.url).toContain('/111111/messages');
    expect(call.body.template.name).toBe('checkin_open');
  });
});
