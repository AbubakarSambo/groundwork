import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { TheApproversSummaryCron } from './the-approvers-summary.cron';
import { aSpendRequest } from './a-request-in-words';
import { TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * AN APPROVER WITH THIRTY WAITING IS WRITTEN TO ONCE, AS EACH READER READS IT (suites at scale, Baobab Distribution,
 * Wednesday 7 October 2026, 10:00 in Lagos).
 *
 * Everything runs through the real sender (the 24 hours, STOP, "Not now", how often Groundwork writes first, the template) and the
 * real queue; only the database and the post are fakes. A request on its own still goes straight away (decision 92). When there are
 * two or more, nothing goes for each, and the approver is written to once for all of it: on WhatsApp when it can go, by email when it
 * cannot, never both, and never in the quiet hours (eight in the evening to seven in the morning in Lagos).
 */

const DAY = 86_400_000;
beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); });
afterEach(() => { jest.useRealTimers(); });

/** The hundred, with a phone each, a real sender, an email that is kept, and the real clock. */
function aWorldThatMessages(opts: { stopped?: string[]; sentToday?: Record<string, string[]>; noPhone?: string[]; outsideTheWindow?: boolean } = {}) {
  const w = aHundredPeople();
  const fetchSpy = jest.fn(async () => ({ ok: true, status: 200 }));
  (global as any).fetch = fetchSpy;
  const sends: any[] = [];
  const phoneOf = (id: string) => `+2547${String(10_000_000 + w.people.findIndex((p) => idOf(p.key) === id))}`;
  w.directory.forEach((p) => {
    (p as any).phone = opts.noPhone?.includes(p.linkedUserId) ? null : phoneOf(p.linkedUserId);
    (p as any).whatsappStoppedAt = opts.stopped?.includes(p.linkedUserId) ? new Date(TODAY.getTime() - DAY) : null;
    (p as any).whatsappLastInboundAt = opts.outsideTheWindow ? new Date(TODAY.getTime() - 3 * DAY) : new Date(TODAY.getTime() - 60_000);
  });
  const table = (rows: any[], more: Record<string, any> = {}) => ({ findMany: jest.fn(async () => rows), findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => { rows.push(data); return data; }), ...more });
  const sendRows: any[] = [];
  Object.entries(opts.sentToday ?? {}).forEach(([id, kinds]) => kinds.forEach((kind) => sendRows.push({ phone: phoneOf(id), kind, sentAt: new Date(TODAY.getTime() - 3_600_000), createdAt: new Date(TODAY.getTime() - 3_600_000) })));
  Object.assign(w.prisma, {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    /* What was sent to one number today, which is all "how often" asks of it. */
    whatsAppSend: {
      findMany: jest.fn(async ({ where }: any) => sendRows.filter((r) => (!where?.phone?.in || where.phone.in.includes(r.phone)) && (!where?.createdAt?.gte || r.createdAt >= where.createdAt.gte))),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => { sendRows.push({ createdAt: new Date(), ...data }); sends.push(data); return data; }),
    },
    notification: { create: jest.fn(async () => ({})) },
  });
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': opts.outsideTheWindow ? [] : [] , 'resend.frontendUrl': 'https://app.groundwork.test' } as any)[k] };
  const wa = new WhatsAppService(config, w.prisma);
  const emails: { to: string; subject: string; greeting: string; paragraph: string; url: string }[] = [];
  const mailer: any = {
    sendApprovalsSummary: jest.fn(async (to: string, subject: string, greeting: string, paragraph: string, url: string) => { emails.push({ to, subject, greeting, paragraph, url }); }),
    sendRequestDecided: jest.fn(async () => undefined),
  };
  const told = new ARequestToldOnWhatsApp(w.prisma, wa, mailer, w.queue, config);
  /* The boards tell through the real one. */
  (w.leaveBoard as any).told = told;
  (w.spending as any).told = told;
  const wentOnWhatsApp = () => fetchSpy.mock.calls.map((c: any[]) => JSON.parse(c[1].body)).map((b: any) => ({ to: String(b.to), text: b.text?.body as string }));
  const user = (key: string) => w.users.find((u) => u.id === idOf(key))!;
  return { w, told, wa, emails, sends, wentOnWhatsApp, fetchSpy, phoneOf, user };
}
const lagos = (hhmm: string) => new Date(`2026-10-07T${hhmm}:00+01:00`);

describe('a request on its own goes straight away, as decided', () => {
  it('the one thing that waits for finance is told to her as soon as it is passed to her', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    /* Nothing at all waits for finance: take every request that does off the board. */
    w.spend.filter((r) => r.status === 'waiting' && r.step >= 1 && !(r.step === 1 && r.amount > 50_000)).forEach((r) => { r.status = 'declined'; });
    const request = w.spend.find((r) => r.status === 'declined' && r.step === 1)!;
    request.status = 'waiting';
    await w.spending.tellWhoDecides(request);
    expect(x.wentOnWhatsApp()).toHaveLength(1);
    expect(x.wentOnWhatsApp()[0].text).toMatch(new RegExp(`^Hi ${x.user('finance.m1').firstName}, .+ has asked for KES [\\d,]+ for .+, and it is waiting for you\\.`));
  });
});

describe('thirty waiting is one message', () => {
  it('as they arrive one by one only the first is told, and the morning summary says the whole of it, once', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const finance = w.spend.filter((r) => r.status === 'waiting' && r.step >= 1 && !(r.step === 1 && r.amount > 50_000));
    expect(finance).toHaveLength(27);
    const mine = new Set(finance.map((r) => r.id));
    /* Everything else is answered, so the only thing waiting for finance is what arrives. */
    w.spend.filter((r) => !mine.has(r.id) && r.status === 'waiting').forEach((r) => { r.status = 'approved'; });
    w.leave.filter((r) => r.status === 'waiting').forEach((r) => { r.status = 'approved'; });
    finance.forEach((r) => { r.status = 'declined'; });
    const sentBefore = x.wentOnWhatsApp().length;
    for (const r of finance) { r.status = 'waiting'; await w.spending.tellWhoDecides(r); }
    expect(x.wentOnWhatsApp().length - sentBefore).toBe(1);

    /* The morning after, the summary says what waits, once. */
    const cron = new TheApproversSummaryCron(w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    const done = await cron.tellNow(lagos('07:30'));
    expect(done.whatsapp).toBeGreaterThanOrEqual(1);
    const toFinance = x.wentOnWhatsApp().filter((m) => m.to.endsWith(x.phoneOf(idOf('finance.m1')).slice(1)));
    expect(toFinance).toHaveLength(2);
    expect(toFinance[1].text).toBe(`Hi ${x.user('finance.m1').firstName}. 27 requests are waiting for you to approve or decline. The oldest has waited 4 working days. Of them, 18 have waited longer than your organisation allows before a request is passed on. Open Groundwork to read and answer: https://app.groundwork.test/today`);
    expect(x.emails).toEqual([]);
    /* And not again: what has been said is not said twice, that day or the next. */
    expect((await cron.tellNow(lagos('07:45'))).whatsapp).toBe(0);
    jest.setSystemTime(new Date(lagos('07:30').getTime() + DAY));
    expect((await cron.tellNow(new Date(lagos('07:30').getTime() + DAY))).whatsapp).toBe(0);
  });

  it('the whole organisation: 92 requests waiting are one message to each approver they wait for, and none to anybody else', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const cron = new TheApproversSummaryCron(w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    const done = await cron.tellNow(lagos('07:30'));
    const everyone = await w.queue.whatWaitsForEveryone('org-baobab', lagos('07:30'));
    /* Three of the nineteen are on leave this Wednesday (Operations', Customer Support's and Procurement's managers): held, not written to. */
    expect(everyone.size).toBe(19);
    expect(done).toEqual({ whatsapp: 16, email: 0, held: 3 });
    const to = x.wentOnWhatsApp().map((m) => m.to);
    expect(new Set(to).size).toBe(to.length);
    expect(to.length).toBeLessThan(40);
    expect(to.length).toBeLessThan(92);
    /* Somebody nothing waits for, and the people who only asked, are written to by nobody. */
    for (const key of ['sales.m1', 'hr.m1', 'ceo', 'eng.m9']) expect(to).not.toContain(x.phoneOf(idOf(key)).replace('+', ''));
  });
});

describe('what the summary says, and where it goes when WhatsApp cannot', () => {
  it('a person with leave and spending waiting reads how many of each, which have waited too long, and how long the oldest has', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    const eng = x.wentOnWhatsApp().find((m) => m.to === x.phoneOf(idOf('eng.manager')).replace('+', ''))!;
    expect(eng.text).toBe(`Hi ${x.user('eng.manager').firstName}. Six requests are waiting for you to approve or decline: three for leave and three to spend. The oldest has waited 7 working days. Two of them have waited longer than your organisation allows before a request is passed on. Open Groundwork to read and answer: https://app.groundwork.test/today`);
  });

  it('somebody who said STOP, or has no number, is emailed the same paragraph once, and gets no WhatsApp', async () => {
    const x = aWorldThatMessages({ stopped: [idOf('finance.m1')], noPhone: [idOf('eng.manager')] });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    const to = x.wentOnWhatsApp().map((m) => m.to);
    expect(to).not.toContain(x.phoneOf(idOf('finance.m1')).replace('+', ''));
    expect(to).not.toContain(x.phoneOf(idOf('eng.manager')).replace('+', ''));
    expect(x.emails.map((e) => e.to).sort()).toEqual([`eng.manager@baobab.test`, `finance.m1@baobab.test`].sort());
    const f = x.emails.find((e) => e.to === 'finance.m1@baobab.test')!;
    expect(f.greeting).toBe(`Hi ${x.user('finance.m1').firstName},`);
    expect(f.paragraph).toMatch(/^27 requests are waiting for you to approve or decline\./);
    expect(f.subject).toBe('27 requests are waiting for you to approve or decline');
    expect(x.emails.find((e) => e.to === 'eng.manager@baobab.test')!.paragraph).toMatch(/^Six requests are waiting for you to approve or decline: three for leave and three to spend\./);
    expect(f.url).toBe('https://app.groundwork.test/today');
    /* Once: a second morning of the same day adds nothing. */
    await cron.tellNow(lagos('07:50'));
    expect(x.emails).toHaveLength(2);
  });

  it('outside the 24 hours, with the template not approved, WhatsApp cannot send it, and the email goes instead, once', async () => {
    const x = aWorldThatMessages({ outsideTheWindow: true });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    const done = await cron.tellNow(lagos('07:30'));
    expect(done.whatsapp).toBe(0);
    expect(x.wentOnWhatsApp()).toEqual([]);
    expect(done.email).toBe(16);
    expect(x.emails).toHaveLength(done.email);
    expect(new Set(x.emails.map((e) => e.to)).size).toBe(x.emails.length);
  });
});

describe('how often, "Not now" and the quiet hours hold it, and nothing is lost', () => {
  it('a person who has already had their message of the day is not written to again that day, by WhatsApp or by email, and is told the next morning', async () => {
    const x = aWorldThatMessages({ sentToday: { [idOf('finance.m1')]: ['lead-summary'] } });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(x.wentOnWhatsApp().map((m) => m.to)).not.toContain(x.phoneOf(idOf('finance.m1')).replace('+', ''));
    expect(x.emails.map((e) => e.to)).not.toContain('finance.m1@baobab.test');
    expect(x.w.events.filter((e) => e.kind === 'told' && e.toUserId === idOf('finance.m1'))).toEqual([]);
  });

  it('a person who said "Not now" today is left alone today', async () => {
    const x = aWorldThatMessages({ sentToday: { [idOf('ops.manager')]: ['not-now'] } });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(x.wentOnWhatsApp().map((m) => m.to)).not.toContain(x.phoneOf(idOf('ops.manager')).replace('+', ''));
    expect(x.emails.map((e) => e.to)).not.toContain('ops.manager@baobab.test');
  });

  it('nothing goes between eight in the evening and seven in the morning in Lagos, and it goes in the morning', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    for (const at of ['20:00', '23:30', '03:00', '06:59']) {
      const when = lagos(at);
      jest.setSystemTime(when);
      expect(await cron.tellNow(when)).toEqual({ whatsapp: 0, email: 0, held: 0 });
    }
    expect(x.wentOnWhatsApp()).toEqual([]);
    jest.setSystemTime(lagos('07:00'));
    expect((await cron.tellNow(lagos('07:00'))).whatsapp).toBe(16);
  });

  it('an approver who is on leave today is not written to, and is the next day the leave ends', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    /* Customer Support's manager is on leave this Wednesday and Thursday. */
    expect(x.wentOnWhatsApp().map((m) => m.to)).not.toContain(x.phoneOf(idOf('support.manager')).replace('+', ''));
    const friday = new Date('2026-10-09T07:30:00+01:00');
    jest.setSystemTime(friday);
    /* Everybody has written to us since: the 24 hours are open again. */
    x.w.directory.forEach((p) => { (p as any).whatsappLastInboundAt = new Date(friday.getTime() - 60_000); });
    await cron.tellNow(friday);
    expect(x.wentOnWhatsApp().map((m) => m.to)).toContain(x.phoneOf(idOf('support.manager')).replace('+', ''));
  });
});

describe('many passed on at once are one message to each person they were passed on to', () => {
  it('the clock passing on 57 requests writes to each person once, not 57 times', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const cron = new ARequestWaitsTooLongCron(w.prisma, w.leaveBoard, w.spending, { passOnWhatWaitsTooLong: async () => [] } as any, x.told);
    const done = await cron.passOnNow(TODAY);
    expect(done.passedOn).toBe(57);
    const to = x.wentOnWhatsApp().map((m) => m.to);
    /* The 57 now wait for admins and a few heads: a handful of people, each written to once. */
    expect(new Set(to).size).toBe(to.length);
    expect(to.length).toBeLessThan(15);
    /* An admin whom 42 were passed on to, leave and spending together, reads one message of 42, not one for leave and one for spending. */
    const admin = x.wentOnWhatsApp().filter((m) => m.to === x.phoneOf(idOf('ceo')).replace('+', ''));
    expect(admin).toHaveLength(1);
    expect(admin[0].text).toMatch(/^Hi \w+\. 4\d requests are waiting for you to approve or decline: one for leave and \d+ to spend\./);
  });
});

it('aSpendRequest reads as it always did', () => {
  expect(aSpendRequest('s-1', 'u-1', 'Grace', 120000, 'KES', 'Two tablets').what).toBe('KES 120,000 for two tablets');
});
