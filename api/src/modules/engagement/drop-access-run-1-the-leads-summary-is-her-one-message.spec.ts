import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { whatIsOutstandingFor } from './the-leads-daily-nudge';
import { justAfterTheSummary } from './one-routine-message-a-day';
import { ReportsListener } from '../reports/reports.listener';

/**
 * DROP ACCESS RUN 1, ITEMS 16 AND 24: THE LEAD'S MORNING SUMMARY IS HER ONE ROUTINE MESSAGE OF THE DAY, AND IT WINS (standing decision,
 * 18 October 2026, recorded in docs/morning-report.md).
 *
 * Wednesday 21 October, as the run had it: at 04:00 UTC Grace was emailed '"Sales team, Q4" runs out in 7 days', at 05:00 UTC "Sales team,
 * Q4 - session 7 is complete", and her 08:00 UTC WhatsApp summary never went, held back by the day's one-a-day count. Thursday 22 October
 * the same with "session 8 is complete". And from 12 to 23 October she was emailed eighteen times "N of four people have checked in on
 * "Sales team, Q4", and it is not the whole team's view yet". Now routine mail to a lead waits for the summary and goes only if it did not;
 * the summary is never held back by it; the partial counts are not emailed.
 *
 * RELEASE 1, PULL REQUEST 5: "runs out in 7 days" is the only warning before a check-in is stalled, and the summary's lines can be cut for
 * room, so it stays an email of its own, goes when it is sent (after the night), and is not said again in the summary. It no longer holds
 * the summary back, because the summary is never held by the day's count. See docs/release-questions.md.
 */
const GRACE = 'grace@dropaccess.test';
const GRACES_PHONE = '+254700300001';
const RUNS_OUT = new Date('2026-10-21T04:00:00.000Z');

function aMailer(o: { summaryWentToday?: boolean } = {}) {
  const scheduled: any[] = [];
  const delivered: any[] = [];
  const prisma: any = {
    ground: { findFirst: jest.fn(async () => ({ id: 'ffa3b4b1-5ce0-4651-b35b-bf5ecc42d5be' })) },
    person: { findFirst: jest.fn(async () => ({ organizationId: '83e249ca', externalId: 'grace', timezone: null })), findMany: jest.fn(async () => [{ email: GRACE, phone: GRACES_PHONE }]) },
    user: { findMany: jest.fn(async () => [{ email: GRACE, phoneNumber: GRACES_PHONE }]), findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi' })) },
    emailPreference: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({ unsubscribeToken: 't' })) },
    emailAddressPreference: { findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    scheduledEmail: { create: jest.fn(async ({ data }: any) => { scheduled.push(data); return data; }) },
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    whatsAppSend: { findMany: jest.fn(async () => (o.summaryWentToday ? [{ kind: 'lead-summary:template', sentAt: new Date('2026-10-21T08:00:00.040Z') }] : [])) },
  };
  const svc: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  svc.writeItDown = jest.fn();
  svc.deliverNow = jest.fn(async (opts: any) => { delivered.push(opts); return 'id'; });
  return { svc, scheduled, delivered, prisma };
}

afterEach(() => jest.useRealTimers());

describe('21 October: the routine mail to Grace waits for her summary', () => {
  it('"runs out in 7 days" at 04:00 UTC (7 in the morning in Nairobi) is the warning before a check-in is stalled: it goes as its own email', async () => {
    jest.useFakeTimers().setSystemTime(RUNS_OUT);
    const m = aMailer();
    await m.svc.sendTimeRunningOut(GRACE, 'Sales team, Q4', 'http://localhost:5195/grounds/ffa3b4b1', new Date('2026-10-27T07:00:00Z'), 7);
    expect(m.delivered.map((d: any) => d.subject)).toEqual(['"Sales team, Q4" runs out in 7 days']);
    expect(m.scheduled).toHaveLength(0);
    expect(justAfterTheSummary(RUNS_OUT).toISOString()).toBe('2026-10-21T08:30:00.000Z');
  });
  it('"session 7 is complete" at 05:00 UTC waits the same way', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T05:00:00.085Z'));
    const m = aMailer();
    await m.svc.sendRoundDigest(GRACE, 'Sales team, Q4 - session 7 is complete', 'Session 7 of Sales team, Q4 has closed.');
    expect(m.delivered).toHaveLength(0);
    expect(m.scheduled.map((r) => r.subject)).toEqual(['Sales team, Q4 - session 7 is complete']);
  });
  it('at 08:30 the held mail is not sent, because the summary went at 08:00: one routine message, and it was the summary', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T08:30:00Z'));
    const m = aMailer({ summaryWentToday: true });
    await m.svc.deliverHeld({ toAddress: GRACE, subject: 'Sales team, Q4 - session 7 is complete', html: '<p>Session 7 of Sales team, Q4 has closed.</p>', sender: 'sendRoundDigest', context: null });
    expect(m.delivered).toHaveLength(0);
  });
  it('and on a day the summary did not go, the held mail goes at 08:30', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T08:30:00Z'));
    const m = aMailer();
    await m.svc.deliverHeld({ toAddress: GRACE, subject: 'Sales team, Q4 - session 7 is complete', html: '<p>Session 7 of Sales team, Q4 has closed.</p>', sender: 'sendRoundDigest', context: null });
    expect(m.delivered).toHaveLength(1);
  });
});

describe('the summary itself is never held back by the routine mail of the morning', () => {
  it("Grace's WhatsApp summary at 08:00 UTC goes although a routine email reached her earlier (it was refused in the run)", async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-22T08:00:00Z'));
    const prisma: any = {
      whatsAppSend: { findMany: jest.fn(async () => []) },
      notification: { findMany: jest.fn(async () => [{ sender: 'sendRoundDigest' }]) },
      user: { findMany: jest.fn(async () => [{ email: GRACE, phoneNumber: GRACES_PHONE }]) },
      person: { findMany: jest.fn(async () => [{ email: GRACE, phone: GRACES_PHONE }]) },
    };
    const wa: any = new WhatsAppService({ get: () => undefined } as any, prisma);
    expect(await wa.howOftenToday(GRACES_PHONE, 'lead-summary')).toBeNull();
    /* Anybody else's routine message is still held by the morning's routine email, as before. */
    expect(await wa.howOftenToday(GRACES_PHONE, 'anchor-follow-up')).not.toBeNull();
  });
  it('but a second summary the same day, or one after Friday\'s weekly insight, is held', async () => {
    const prisma: any = { whatsAppSend: { findMany: jest.fn(async () => [{ kind: 'anchor-weekly-insight:template' }]) } };
    const wa: any = new WhatsAppService({ get: () => undefined } as any, prisma);
    expect(await wa.howOftenToday(GRACES_PHONE, 'lead-summary')).not.toBeNull();
  });
});

describe('the warning is not said twice', () => {
  it('on 21 October the summary does not say again that the check-in ends on 27 October: the warning email says it', async () => {
    const now = new Date('2026-10-21T08:00:00Z');
    const prisma: any = new Proxy({}, { get: (_t, model: string) => new Proxy({}, { get: (_x: any, method: string) => jest.fn(async () => (method === 'findMany' ? [] : method === 'count' ? 0 : null)) }) });
    const ground = { id: 'ffa3b4b1-5ce0-4651-b35b-bf5ecc42d5be', label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', overWhatsApp: null, timelineDays: 15, cadence: 'DAILY', createdAt: new Date('2026-10-12T07:00:00.313Z'), startsAt: null, runsUntilEnded: false };
    const o = await whatIsOutstandingFor(prisma, { userId: 'u-grace', organizationId: '83e249ca', grounds: [ground as any] }, { boards: {} as any, release: new Date('2026-01-01') }, now);
    expect(o.risks).toEqual([]);
  });
});

describe('item 24: Grace is not emailed "Three of four people have checked in ... not the whole team\'s view yet"', () => {
  it('13 October, Kevin checks in first: before, "One of four people has checked in on \\"Sales team, Q4\\", and it is not the whole team\'s view yet"; now nothing', async () => {
    const sent: any[] = [];
    const person = (id: string, first: string, last: string, done: boolean) => ({ id, managingOnly: false, user: { email: `${first.toLowerCase()}@dropaccess.test`, firstName: first, lastName: last, isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: done ? [{ id: `c-${id}` }] : [] });
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, Q4', initiator: { email: GRACE }, participants: [person('p-g', 'Grace', 'Achieng', false), person('p-k', 'Kevin', 'Omondi', true), person('p-m', 'Mercy', 'Wairimu', false), person('p-j', 'Joseph', 'Kariuki', false)] })) },
      checkIn: { findUnique: jest.fn(async () => ({ closedReason: null })) },
    };
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    email.sendEmail = jest.fn(async (x: any) => { sent.push(x); });
    const listener: any = new ReportsListener(prisma, {} as any, {} as any, email, { get: () => 'http://localhost:5195' } as any);
    await listener.notifyAdminOnCheckIn({ groundId: 'ffa3b4b1', sessionNumber: 2, participantId: 'p-k', checkInId: 'c75508f1-7e7f-4dbe-aebc-ac963c8aed96' });
    expect(sent).toHaveLength(0);
  });
});
