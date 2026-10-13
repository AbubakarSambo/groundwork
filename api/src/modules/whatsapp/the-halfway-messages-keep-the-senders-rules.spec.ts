import { WhatsAppService } from './whatsapp.service';
import { THE_NAMES_TO_SUBMIT, NOT_TODAY, THEY_SAID_NOT_NOW, THEY_SAID_STOP, NOT_TURNED_ON_QUIETLY, OUTSIDE_THE_WINDOW } from './a-message-outside-the-window';
import { carryOnSaying, closesInHalfAnHourSaying, closedByTheClockSaying, CARRY_ON, CLOSES_IN_HALF_AN_HOUR, CLOSED_BY_THE_CLOCK } from './a-check-in-left-halfway';

/**
 * THE THREE MESSAGES FOR SOMEBODY WHO STOPPED HALFWAY GO THROUGH THE SENDER, AND KEEP ITS RULES (decision 107).
 * Read as Amani reads them on her phone, with the sender's own gates in front: STOP, "not now", how often
 * Groundwork may write first today, the organisation's add-on and the 24 hours.
 */
const HOUR = 3_600_000;
const SAID = {
  reminder: carryOnSaying('Amani', 'Sales team, Q4'),
  warning: closesInHalfAnHourSaying('Sales team, Q4'),
  closed: closedByTheClockSaying('Sales team, Q4'),
};

function aSender(o: { today?: (string | null)[]; notNow?: boolean; saidStop?: boolean; addOn?: boolean; wroteHoursAgo?: number | null } = {}) {
  const rows: any[] = [];
  const todayRows = [
    ...(o.today ?? []).map((kind) => ({ kind })),
    ...(o.notNow ? [{ kind: 'not-now' }] : []),
  ];
  const wrote = o.wroteHoursAgo === undefined ? 5 : o.wroteHoursAgo;
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Kito Foods', whatsappAddOnOn: o.addOn ?? true })), findMany: jest.fn(async () => []) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: wrote === null ? null : new Date(Date.now() - wrote * HOUR) })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => ({ messageId: 'ours:+254700000001:x', handledAt: wrote === null ? null : new Date(Date.now() - wrote * HOUR) })) },
    whatsAppSend: {
      create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }),
      findMany: jest.fn(async () => todayRows),
      findFirst: jest.fn(async (q: any) => (q?.where?.kind?.in ? (o.saidStop ? { kind: 'stopped' } : null) : { id: 'earlier' })),
    },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': THE_NAMES_TO_SUBMIT } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('the messages for somebody who stopped halfway, through the sender', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const sentText = () => JSON.parse(fetchSpy.mock.calls[0][1].body).text?.body;
  const send = (w: ReturnType<typeof aSender>, text: string, kind: string) => w.wa.sendFor('org-1', '+254700000001', text, { kind, checkInId: 'ci-1' });

  it('Amani reads each of the three, word for word, inside the 24 hours', async () => {
    for (const [text, kind] of [[SAID.reminder, CARRY_ON], [SAID.warning, CLOSES_IN_HALF_AN_HOUR], [SAID.closed, CLOSED_BY_THE_CLOCK]] as const) {
      fetchSpy.mockClear();
      expect((await send(aSender(), text, kind)).sent).toBe(true);
      expect(sentText()).toBe(text);
    }
  });

  it('nothing goes after STOP', async () => {
    for (const [text, kind] of [[SAID.reminder, CARRY_ON], [SAID.warning, CLOSES_IN_HALF_AN_HOUR], [SAID.closed, CLOSED_BY_THE_CLOCK]] as const) {
      expect(await send(aSender({ saidStop: true }), text, kind)).toEqual({ sent: false, error: THEY_SAID_STOP });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('nothing goes after "not now" today, the clock closing it included', async () => {
    for (const [text, kind] of [[SAID.reminder, CARRY_ON], [SAID.warning, CLOSES_IN_HALF_AN_HOUR], [SAID.closed, CLOSED_BY_THE_CLOCK]] as const) {
      expect(await send(aSender({ notNow: true }), text, kind)).toEqual({ sent: false, error: THEY_SAID_NOT_NOW });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the reminder is one of the day\'s first messages: it does not go on a day Groundwork has already written first', async () => {
    expect(await send(aSender({ today: ['checkin-open'] }), SAID.reminder, CARRY_ON)).toEqual({ sent: false, error: NOT_TODAY });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the warning counts as a closing, so it may be the day\'s second, but not a third', async () => {
    expect((await send(aSender({ today: ['checkin-open'] }), SAID.warning, CLOSES_IN_HALF_AN_HOUR)).sent).toBe(true);
    fetchSpy.mockClear();
    expect(await send(aSender({ today: ['checkin-open', 'carry-on'] }), SAID.warning, CLOSES_IN_HALF_AN_HOUR)).toEqual({ sent: false, error: NOT_TODAY });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the clock closing it never uses up the day\'s count and is never held by it', async () => {
    expect((await send(aSender({ today: ['checkin-open', 'closes-in-half-an-hour'] }), SAID.closed, CLOSED_BY_THE_CLOCK)).sent).toBe(true);
  });

  it('nothing goes to an organisation that has not turned WhatsApp on', async () => {
    for (const [text, kind] of [[SAID.reminder, CARRY_ON], [SAID.warning, CLOSES_IN_HALF_AN_HOUR], [SAID.closed, CLOSED_BY_THE_CLOCK]] as const) {
      expect(await send(aSender({ addOn: false }), text, kind)).toEqual({ sent: false, error: NOT_TURNED_ON_QUIETLY });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('outside the 24 hours there is no template for these, so nothing is sent and the record says why', async () => {
    for (const [text, kind] of [[SAID.reminder, CARRY_ON], [SAID.warning, CLOSES_IN_HALF_AN_HOUR], [SAID.closed, CLOSED_BY_THE_CLOCK]] as const) {
      const w = aSender({ wroteHoursAgo: 30 });
      const r = await send(w, text, kind);
      expect(r.sent).toBe(false);
      expect(r.error).toBe(OUTSIDE_THE_WINDOW);
      expect(w.rows[0].error).toBe(OUTSIDE_THE_WINDOW);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
