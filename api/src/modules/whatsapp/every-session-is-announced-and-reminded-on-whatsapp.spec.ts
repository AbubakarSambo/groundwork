import { WebhooksListener } from '../webhooks/webhooks.listener';
import { GroundsCron } from '../grounds/grounds.cron';
import { WhatsAppService } from './whatsapp.service';
import {
  theCheckInIsOpen, itIsDueTomorrow, itOpensSoon, itIsOverdue, theTeamIsAlmostIn, yourViewMatters,
  whatToSendThisMorning, whichChase, whenItIsDue,
} from './what-goes-to-a-phone';
import {
  TEMPLATES, THE_NAMES_TO_SUBMIT, templateFor, isBusinessInitiated, fill, OUTSIDE_THE_WINDOW, THEY_SAID_STOP, NOT_TODAY, THEY_SAID_NOT_NOW,
} from './a-message-outside-the-window';

/**
 * EVERY SESSION IS ANNOUNCED, AND REMINDED, ON WHATSAPP (survey item 7, decisions 82 and 83).
 *
 * On Groundwork's own number the first session was never announced on WhatsApp, and nothing reminded
 * anybody there. The first client starts on Groundwork's number. Hafsah wrote the eight messages
 * (decision 83); these are the words a person reads, and the rules for when each goes.
 */
const MIRIAM = { firstName: 'Miriam', label: 'the sales team' };

describe('what a person reads, word for word as Hafsah wrote it', () => {
  it('checkin_open', () => {
    expect(theCheckInIsOpen(MIRIAM).text).toBe('Hi Miriam, your check-in for the sales team is open. It takes about five minutes, and you can answer right here. Reply START to begin.');
  });
  it('checkin_due_tomorrow', () => {
    expect(itIsDueTomorrow(MIRIAM, new Date('2026-10-08T09:00:00Z')).text).toBe('Hi Miriam, your check-in for the sales team is due tomorrow, Thursday 8 October. You can answer here whenever suits you before then.');
  });
  it('checkin_opens_soon', () => {
    expect(itOpensSoon(MIRIAM, new Date('2026-10-08T16:00:00Z')).text).toBe("Hi Miriam, your check-in for the sales team opens in an hour, at 4:00 pm. Reply here when it opens and we'll begin.");
  });
  it('checkin_overdue', () => {
    expect(itIsOverdue(MIRIAM).text).toBe("Hi Miriam, your check-in for the sales team is overdue. It's still open, so you can answer here now.");
  });
  it('checkin_team_almost_in, with the counts in the blanks Hafsah numbered', () => {
    expect(theTeamIsAlmostIn(MIRIAM, 3, 5).text).toBe('Hi Miriam, 3 of 5 people have checked in for the sales team. Your check-in is still open, and you can answer here.');
  });
  it("checkin_your_view_matters, with the lead's first name", () => {
    expect(yourViewMatters(MIRIAM, 'Wairimu').text).toBe("Hi Miriam, your check-in for the sales team is still waiting. Your answers help Wairimu understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.");
  });
  it('lead_daily_summary and checkin_closes_soon are registered word for word', () => {
    expect(TEMPLATES['lead-summary'].body).toBe("Good morning {{1}}. Here is today's summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply \"not now\".");
    expect(TEMPLATES['closes-soon'].body).toBe('Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.');
  });
  it('a person whose first name nobody knows is still greeted', () => {
    expect(theCheckInIsOpen({ ...MIRIAM, firstName: null }).text).toMatch(/^Hi there, /);
  });
  it("outside the 24 hours the same words go as the template, with the product's words as its parameters", () => {
    const n = theTeamIsAlmostIn(MIRIAM, 3, 5);
    expect(n.params).toEqual(['Miriam', '3', '5', 'the sales team']);
    expect(fill(TEMPLATES[n.kind].body, n.params)).toBe(n.text);
    expect(TEMPLATES[n.kind].components(n.text, n.params)[0].parameters.map((p) => p.text)).toEqual(n.params);
  });
});

describe('the names', () => {
  it("are Hafsah's, every one is business-initiated, and every one is in the list an admin submits", () => {
    const hers = ['checkin_open', 'checkin_due_tomorrow', 'checkin_opens_soon', 'checkin_closes_soon', 'checkin_overdue', 'checkin_team_almost_in', 'checkin_your_view_matters', 'lead_daily_summary'];
    expect(THE_NAMES_TO_SUBMIT).toEqual(expect.arrayContaining(hers));
    for (const k of ['checkin-open', 'due-tomorrow', 'opens-soon', 'overdue', 'team-almost-in', 'your-view-matters', 'lead-summary']) expect(isBusinessInitiated(k)).toBe(true);
  });
  it('while a name is not approved, nothing goes as a template', () => {
    expect(templateFor('overdue', [])).toBeNull();
    expect(templateFor('overdue', ['checkin_overdue'])?.name).toBe('checkin_overdue');
  });
});

describe('when a morning message is due', () => {
  const policy = { days: [3, 7, 14], stopped: false, tellTheLead: true };
  const now = new Date('2026-10-07T08:30:00Z');
  const base = { policy, daysOpen: 3, dueAt: null as Date | null, now, alreadyHad: new Set<string>(), hoursSinceLastChase: null as number | null };
  it('a check-in is due one step of its rhythm after it opened; a one-off has no due day', () => {
    expect(whenItIsDue('2026-10-01T09:00:00Z', 'WEEKLY')?.toISOString()).toBe('2026-10-08T09:00:00.000Z');
    expect(whenItIsDue('2026-10-01T09:00:00Z', 'ONE_TIME')).toBeNull();
    expect(whenItIsDue('2026-10-01T09:00:00Z', 'SEQUENTIAL')).toBeNull();
  });
  it("overdue first, once, then due tomorrow, once, then the chase on the lead's days", () => {
    expect(whatToSendThisMorning({ ...base, dueAt: new Date('2026-10-06T09:00:00Z') })).toBe('overdue');
    expect(whatToSendThisMorning({ ...base, dueAt: new Date('2026-10-06T09:00:00Z'), alreadyHad: new Set(['overdue']) })).toBe('chase');
    expect(whatToSendThisMorning({ ...base, dueAt: new Date('2026-10-08T09:00:00Z') })).toBe('due-tomorrow');
    expect(whatToSendThisMorning({ ...base, daysOpen: 2 })).toBeNull();
    expect(whatToSendThisMorning({ ...base, hoursSinceLastChase: 5 })).toBeNull();
  });
  it('nothing at all when the lead stopped chasing or asked for no reminders', () => {
    expect(whatToSendThisMorning({ ...base, dueAt: new Date('2026-10-06T09:00:00Z'), policy: { ...policy, stopped: true } })).toBeNull();
    expect(whatToSendThisMorning({ ...base, policy: { ...policy, days: [] } })).toBeNull();
  });
  it('the team is almost in at half or more; fewer, or a check-in about one person, is "your view matters"', () => {
    expect(whichChase({ answered: 3, ofHowMany: 6, aboutOnePerson: false })).toBe('team-almost-in');
    expect(whichChase({ answered: 2, ofHowMany: 6, aboutOnePerson: false })).toBe('your-view-matters');
    expect(whichChase({ answered: 1, ofHowMany: 1, aboutOnePerson: true })).toBe('your-view-matters');
  });
});

/* ---------- the opening notice, sent ---------- */

function aListener(opts: { overWhatsApp?: boolean | null; personPhone?: string | null; settingsPhone?: string | null; onLeave?: boolean; joined?: boolean } = {}) {
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-1', label: 'the sales team', overWhatsApp: opts.overWhatsApp ?? null })) },
    groundParticipant: {
      findUnique: jest.fn(async () => ({ id: 'gp-1', email: 'miriam@example.com', userId: 'u-1', user: { firstName: 'Miriam', email: 'miriam@example.com', phoneNumber: opts.settingsPhone ?? null } })),
      findMany: jest.fn(async () => [{ id: 'gp-1', userId: 'u-1', ground: { organizationId: 'org-1' } }]),
    },
    leaveRequest: { findMany: jest.fn(async () => (opts.onLeave ? [{ userId: 'u-1', organizationId: 'org-1', startsOn: new Date(Date.now() - 86_400_000), endsOn: new Date(Date.now() + 86_400_000) }] : [])) },
    /* Joined on WhatsApp (they have written from their number) unless a test says not: one channel for an opening (14 October). */
    person: { findFirst: jest.fn(async () => {
      const joined = opts.joined === false ? null : new Date('2026-10-10T09:00:00Z');
      return opts.personPhone === undefined ? { phone: '+254712345678', whatsappLastInboundAt: joined } : opts.personPhone ? { phone: opts.personPhone, whatsappLastInboundAt: joined } : { phone: null, whatsappLastInboundAt: joined };
    }) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: false, whatsappFreeUntil: new Date(Date.now() + 20 * 86_400_000) })) },
  };
  const webhooks: any = { emit: jest.fn(async () => undefined) };
  const listener = new WebhooksListener(prisma, webhooks, { get: () => undefined } as any, {} as any, { sendFor } as any);
  return { listener, sendFor, webhooks };
}
const OPENED = (sessionNumber: number) => ({ checkInId: 'ci-1', groundId: 'g-1', participantId: 'gp-1', sessionNumber, personExternalId: 'ext-1' });

describe("the opening notice, on Groundwork's own number", () => {
  it("announces the first session, with no number of the organisation's own connected", async () => {
    const { listener, sendFor } = aListener();
    await listener.onCheckInOpened(OPENED(1));
    expect(sendFor).toHaveBeenCalledWith('org-1', '+254712345678', theCheckInIsOpen(MIRIAM).text, { checkInId: 'ci-1', kind: 'checkin-open', params: ['Miriam', 'the sales team'] });
  });
  it('and later sessions, once each', async () => {
    const { listener, sendFor } = aListener();
    await listener.onCheckInOpened(OPENED(3));
    expect(sendFor).toHaveBeenCalledTimes(1);
  });
  it('reaches a number given in Settings when the roster has none', async () => {
    const { listener, sendFor } = aListener({ personPhone: null, settingsPhone: '+254700000002' });
    await listener.onCheckInOpened(OPENED(1));
    expect(sendFor.mock.calls[0][1]).toBe('+254700000002');
  });
  /* Hafsah, 14 October: each opening goes on one channel only. Somebody who has not joined on WhatsApp is told by email alone. */
  it('never to somebody who has not joined on WhatsApp: the email carries their opening', async () => {
    const { listener, sendFor } = aListener({ joined: false });
    await listener.onCheckInOpened(OPENED(3));
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('never for a check-in kept in the app, nor for somebody on approved leave; the webhook still fires', async () => {
    const kept = aListener({ overWhatsApp: false });
    await kept.listener.onCheckInOpened(OPENED(1));
    expect(kept.sendFor).not.toHaveBeenCalled();
    expect(kept.webhooks.emit).toHaveBeenCalled();
    const away = aListener({ onLeave: true });
    await away.listener.onCheckInOpened(OPENED(1));
    expect(away.sendFor).not.toHaveBeenCalled();
  });
});

/* ---------- the morning sweep ---------- */

const DAY = 86_400_000;
function aCron(rows: any[], opts: { before?: any[]; onLeave?: boolean; session?: { status: string; awaiting?: boolean; managingOnly?: boolean }[] } = {}) {
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const prisma: any = {
    checkIn: {
      findMany: jest.fn(async (q: any) => (q.where.sessionNumber !== undefined
        ? (opts.session ?? []).map((r) => ({ status: r.status, participant: { managingOnly: !!r.managingOnly, user: { awaitingOrgApproval: !!r.awaiting } } }))
        : rows)),
    },
    groundParticipant: { findMany: jest.fn(async () => rows.map((r) => ({ id: r.participantId, userId: 'u-1', ground: { organizationId: 'org-1' } }))) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    leaveRequest: { findMany: jest.fn(async () => (opts.onLeave ? [{ userId: 'u-1', organizationId: 'org-1', startsOn: new Date(Date.now() - DAY), endsOn: new Date(Date.now() + DAY) }] : [])) },
    whatsAppSend: { findMany: jest.fn(async () => opts.before ?? []), findFirst: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor };
}
const aRow = (over: any = {}) => ({
  id: 'ci-1', groundId: 'g-1', sessionNumber: 2, participantId: 'gp-1', createdAt: new Date(Date.now() - 3 * DAY - 3_600_000), availableFrom: null,
  ground: { label: 'the sales team', scenario: 'PULSE_CHECK', organizationId: 'org-1', overWhatsApp: null, cadence: 'ONE_TIME', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
  participant: { id: 'gp-1', email: 'miriam@example.com', userId: 'u-1', user: { firstName: 'Miriam', email: 'miriam@example.com', phoneNumber: null, isActive: true, deletedAt: null } },
  ...over,
});

describe('the morning sweep', () => {
  it('on a chase day with fewer than half in, the person reads that their view matters, with the lead named', async () => {
    const { cron, sendFor } = aCron([aRow()], { session: [{ status: 'NOT_STARTED' }, { status: 'COMPLETED' }, { status: 'NOT_STARTED' }, { status: 'NOT_STARTED' }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).toHaveBeenCalledWith('org-1', '+254712345678', yourViewMatters(MIRIAM, 'Wairimu').text, expect.objectContaining({ checkInId: 'ci-1', kind: 'your-view-matters' }));
  });
  it('a lead who is also answering is told her answers help her, and her own name is not said in the third person (B-023)', async () => {
    const lead = aRow({ ground: { ...aRow().ground, initiatorId: 'u-1', initiator: { firstName: 'Miriam' } } });
    const { cron, sendFor } = aCron([lead], { session: [{ status: 'NOT_STARTED' }, { status: 'COMPLETED' }, { status: 'NOT_STARTED' }, { status: 'NOT_STARTED' }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor.mock.calls[0][2]).toBe("Hi Miriam, your check-in for the sales team is still waiting. Your answers help you understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.");
  });
  it('with half or more in, the person reads the count, which leaves out anybody not yet let in', async () => {
    const { cron, sendFor } = aCron([aRow()], { session: [{ status: 'NOT_STARTED' }, { status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'NOT_STARTED' }, { status: 'NOT_STARTED', awaiting: true }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor.mock.calls[0][2]).toBe(theTeamIsAlmostIn(MIRIAM, 2, 4).text);
  });
  it('a performance plan is never "the team\'s picture"', async () => {
    const plan = aRow({ ground: { ...aRow().ground, scenario: 'PIP', label: 'Performance plan for Amina' } });
    const { cron, sendFor } = aCron([plan], { session: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'NOT_STARTED' }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor.mock.calls[0][3]).toMatchObject({ kind: 'your-view-matters' });
  });
  it('overdue, while still open, before anything else', async () => {
    const { cron, sendFor } = aCron([aRow({ ground: { ...aRow().ground, cadence: 'DAILY' }, createdAt: new Date(Date.now() - 2 * DAY) })]);
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor.mock.calls[0][2]).toBe(itIsOverdue(MIRIAM).text);
  });
  it('one message a morning to a person with two check-ins waiting: the most useful', async () => {
    const overdue = aRow({ id: 'ci-2', ground: { ...aRow().ground, cadence: 'DAILY' }, createdAt: new Date(Date.now() - 2 * DAY) });
    const { cron, sendFor } = aCron([aRow(), overdue], { session: [{ status: 'NOT_STARTED' }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).toHaveBeenCalledTimes(1);
    expect(sendFor.mock.calls[0][3]).toMatchObject({ checkInId: 'ci-2', kind: 'overdue' });
  });
  it('not twice for the same chase: one already tried today is read back from the send record', async () => {
    const { cron, sendFor } = aCron([aRow()], { before: [{ kind: 'your-view-matters', createdAt: new Date(Date.now() - 2 * 3_600_000) }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('never to somebody on leave, nor about a check-in kept in the app', async () => {
    const away = aCron([aRow()], { onLeave: true });
    await away.cron.sendWhatsAppRemindersInner();
    expect(away.sendFor).not.toHaveBeenCalled();
    const kept = aCron([aRow({ ground: { ...aRow().ground, overWhatsApp: false } })]);
    await kept.cron.sendWhatsAppRemindersInner();
    expect(kept.sendFor).not.toHaveBeenCalled();
  });
  it('an hour before a session opens at a set time, the person reads when', async () => {
    const opensAt = new Date(Date.now() + 50 * 60_000);
    const { cron, sendFor } = aCron([aRow({ availableFrom: opensAt })]);
    await cron.sendWhatsAppOpensSoonInner();
    /* The hour is the person's own, with the zone named (B-140): Miriam's number is Kenyan, so it is East Africa Time. */
    expect(sendFor.mock.calls[0][2]).toBe(itOpensSoon(MIRIAM, opensAt, undefined, 'Africa/Nairobi').text);
    expect(sendFor.mock.calls[0][2]).toContain('East Africa Time');
  });
});

/* ---------- STOP, Not now, how often, and a template not yet approved ---------- */

function aSender(person: any, sentToday: { kind: string }[] = []) {
  const rows: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => person), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }), findMany: jest.fn(async () => sentToday) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': [] } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('the sender keeps the rules every first message shares', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const inside = { whatsappStoppedAt: null, whatsappLastInboundAt: new Date() };
  const n = itIsOverdue(MIRIAM);

  it('nothing after STOP', async () => {
    const { wa } = aSender({ ...inside, whatsappStoppedAt: new Date() });
    expect(await wa.sendFor('org-1', '+254712345678', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params })).toEqual({ sent: false, error: THEY_SAID_STOP });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('nothing more today after "Not now"', async () => {
    const { wa } = aSender(inside, [{ kind: 'not-now' }]);
    expect(await wa.sendFor('org-1', '+254712345678', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params })).toEqual({ sent: false, error: THEY_SAID_NOT_NOW });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('one first message a day, or two on a day a check-in opens', async () => {
    const once = aSender(inside, [{ kind: 'your-view-matters' }]);
    expect(await once.wa.sendFor('org-1', '+254712345678', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params })).toEqual({ sent: false, error: NOT_TODAY });
    const open = theCheckInIsOpen(MIRIAM);
    expect((await once.wa.sendFor('org-1', '+254712345678', open.text, { checkInId: 'ci-2', kind: open.kind, params: open.params })).sent).toBe(true);
    const twice = aSender(inside, [{ kind: 'opens-soon' }, { kind: 'your-view-matters:template' }]);
    expect(await twice.wa.sendFor('org-1', '+254712345678', open.text, { checkInId: 'ci-2', kind: open.kind, params: open.params })).toEqual({ sent: false, error: NOT_TODAY });
  });
  it('the report after somebody finishes is not a first message, and is never held back by it', async () => {
    const { wa } = aSender(inside, [{ kind: 'checkin-open' }, { kind: 'opens-soon' }]);
    expect((await wa.sendFor('org-1', '+254712345678', 'Your report for the sales team is ready.', { checkInId: 'ci-1', kind: 'report' })).sent).toBe(true);
  });
  it('outside the 24 hours, while its template is not approved, it is recorded as not sent, with the reason', async () => {
    const { wa, rows } = aSender({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 3 * DAY) });
    expect(await wa.sendFor('org-1', '+254712345678', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params })).toEqual({ sent: false, error: OUTSIDE_THE_WINDOW });
    expect(rows[0]).toMatchObject({ checkInId: 'ci-1', kind: 'overdue', sentAt: null, error: OUTSIDE_THE_WINDOW });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ---------- the person's two answers to checkin_open ---------- */

import { anInboundHarness } from './a-whatsapp-inbound-harness';

describe('"Start" and "Not now", typed or tapped', () => {
  const tapped = (text: string) => ({ entry: [{ changes: [{ value: { messages: [{ id: `wamid.${text}`, from: '254712345678', type: 'button', button: { text, payload: text } }] } }] }] });

  it('"Start" begins the check-in and is not taken as an answer', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'the sales team', status: 'NOT_STARTED' }] });
    await h.service.handle('org-1', tapped('Start'), 'ours');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-1', 'u-1');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said[0]).toBe('the sales team, session 1. You can write "ask" at any time to talk to Ask Groundwork, "back" to come back to your check-in, and "switch" to choose another check-in.\n\nWhat moved since last time?');
  });

  it('"Not now" stops Groundwork writing first today, and the person is told so plainly', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'the sales team', status: 'NOT_STARTED' }] });
    await h.service.handle('org-1', tapped('Not now'), 'ours');
    expect(h.whatsapp.notNow).toHaveBeenCalledWith('org-1', '254712345678');
    expect(h.conversation.open).not.toHaveBeenCalled();
    expect(h.said).toEqual(['All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready.']);
  });

  it('"START" after STOP still resumes, as before', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'the sales team', status: 'NOT_STARTED' }] });
    h.prisma.person.findUnique.mockResolvedValue({ whatsappStoppedAt: new Date() });
    await h.service.handle('org-1', h.message('START'), 'ours');
    expect(h.said[0]).toMatch(/^Resumed\./);
    expect(h.conversation.open).not.toHaveBeenCalled();
  });
});
