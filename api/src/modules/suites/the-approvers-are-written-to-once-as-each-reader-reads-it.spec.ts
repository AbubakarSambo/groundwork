import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { TheApproversSummaryCron } from './the-approvers-summary.cron';
import { aSpendRequest, anHoursRequest } from './a-request-in-words';
import { TODAY, aHundredPeople, idOf } from './__fixtures__/a-hundred-people';

/**
 * AN APPROVER IS TOLD STRAIGHT AWAY, AND ONCE FOR WHAT ARRIVES TOGETHER, AS EACH READER READS IT (suites at scale, Baobab Distribution,
 * Wednesday 7 October 2026, 10:00 in Lagos).
 *
 * Everything runs through the real sender (the 24 hours, STOP, "Not now", the template) and the real queue; only the database and the
 * post are fakes. Every request is told to its approver straight away (decision 92), and none of them is the person's one message of
 * the day. Requests that arrive together, the ones the clock passes on to the same person, are said once, at once. The morning sweep is
 * only the catch-up for what was not told, and says nothing twice. Hours are never held or gathered.
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

describe('what arrives one at a time is told one at a time, and the morning only catches up', () => {
  it('27 requests passed to finance one by one are each told straight away, and the morning sweep says nothing more of them', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const finance = w.spend.filter((r) => r.status === 'waiting' && r.step >= 1 && !(r.step === 1 && r.amount > 50_000));
    expect(finance).toHaveLength(27);
    const mine = new Set(finance.map((r) => r.id));
    w.spend.filter((r) => !mine.has(r.id) && r.status === 'waiting').forEach((r) => { r.status = 'approved'; });
    w.leave.filter((r) => r.status === 'waiting').forEach((r) => { r.status = 'approved'; });
    for (const r of finance) await w.spending.tellWhoDecides(r);
    const toFinance = () => x.wentOnWhatsApp().filter((m) => m.to === x.phoneOf(idOf('finance.m1')).replace('+', ''));
    expect(toFinance()).toHaveLength(27);
    expect(toFinance()[0].text).toMatch(/^Hi \w+, \w+ has asked for KES [\d,]+ for .+, and it is waiting for you\./);
    const cron = new TheApproversSummaryCron(w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(toFinance()).toHaveLength(27);
    expect(x.emails.filter((e) => e.to === 'finance.m1@baobab.test')).toEqual([]);
  });

  it('a backlog nobody was told of is one summary in the morning, once, and not again the day after', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const cron = new TheApproversSummaryCron(w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    const toFinance = () => x.wentOnWhatsApp().filter((m) => m.to === x.phoneOf(idOf('finance.m1')).replace('+', ''));
    expect(toFinance()).toHaveLength(1);
    expect(toFinance()[0].text).toBe(`Hi ${x.user('finance.m1').firstName}. 27 requests are waiting for you to approve or decline. The oldest has waited 4 working days. Of them, 18 have waited longer than your organisation allows before a request is passed on. Open Groundwork to read and answer: https://app.groundwork.test/today`);
    expect(x.emails).toEqual([]);
    expect((await cron.tellNow(lagos('07:45'))).whatsapp).toBe(0);
    jest.setSystemTime(new Date(lagos('07:30').getTime() + DAY));
    expect((await cron.tellNow(new Date(lagos('07:30').getTime() + DAY))).whatsapp).toBe(0);
  });

  it('hours are never held: a finance person with 27 requests to spend waiting is told of an hours request straight away', async () => {
    const x = aWorldThatMessages();
    const hours = anHoursRequest(idOf('sales.m1'), '2026-10-05', 'Aisha', { Atlas: 360 }, 360, ['2026-10-05']);
    await x.told.waiting('org-baobab', [idOf('finance.m1')], hours);
    expect(x.wentOnWhatsApp().map((m) => m.text)).toEqual([`Hi ${x.user('finance.m1').firstName}, Aisha has asked for approval of 6 hours on Atlas for Monday 5 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.`]);
  });
  it('the whole organisation: 92 requests waiting are one message to each approver they wait for, and none to anybody else', async () => {
    const x = aWorldThatMessages();
    const w = x.w;
    const cron = new TheApproversSummaryCron(w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    const done = await cron.tellNow(lagos('07:30'));
    const everyone = await w.queue.whatWaitsForEveryone('org-baobab', lagos('07:30'));
    /* Three of the eighteen are on leave this Wednesday (Operations', Customer Support's and Procurement's managers): held, not written to. */
    expect(everyone.size).toBe(18);
    expect(done).toEqual({ whatsapp: 15, email: 0, held: 3 });
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
    expect(f.paragraph).toMatch(/^27 requests are waiting for you to approve or decline[.:]/);
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
    expect(done.email).toBe(15);
    expect(x.emails).toHaveLength(done.email);
    expect(new Set(x.emails.map((e) => e.to)).size).toBe(x.emails.length);
  });
});

describe('"Not now", the quiet hours and leave hold the catch-up, and nothing is lost', () => {
  it('a person who has had their message of the day is still told: this is not one of Groundwork’s first messages', async () => {
    const x = aWorldThatMessages({ sentToday: { [idOf('finance.m1')]: ['lead-summary', 'checkin-open'] } });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(x.wentOnWhatsApp().map((m) => m.to)).toContain(x.phoneOf(idOf('finance.m1')).replace('+', ''));
  });

  it('a person who said "Not now" today is left alone today, by WhatsApp and by email', async () => {
    const x = aWorldThatMessages({ sentToday: { [idOf('ops.manager')]: ['not-now'], [idOf('eng.manager')]: ['not-now'] } });
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(x.wentOnWhatsApp().map((m) => m.to)).not.toContain(x.phoneOf(idOf('eng.manager')).replace('+', ''));
    expect(x.emails.map((e) => e.to)).not.toContain('eng.manager@baobab.test');
  });

  it('nothing goes between eight in the evening and seven in the morning in Lagos, and it goes in the morning', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    for (const at of ['20:00', '23:30', '03:00', '06:59']) {
      const when = lagos(at);
      jest.setSystemTime(when);
      expect(await cron.tellNow(when)).toEqual({ whatsapp: 0, email: 0, held: 18 });
    }
    expect(x.wentOnWhatsApp()).toEqual([]);
    jest.setSystemTime(lagos('07:00'));
    expect((await cron.tellNow(lagos('07:00'))).whatsapp).toBe(15);
  });

  it('the quiet hours are where the person is: a person in Nairobi is quiet at 21:30 their time, and a person in Lagos is not', async () => {
    const x = aWorldThatMessages();
    (x.w.directory.find((p) => p.linkedUserId === idOf('finance.m1')) as any).timezone = 'Africa/Nairobi';
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    /* 19:30 in Lagos is 21:30 in Nairobi. */
    const when = lagos('19:30');
    jest.setSystemTime(when);
    await cron.tellNow(when);
    const to = x.wentOnWhatsApp().map((m) => m.to);
    expect(to).not.toContain(x.phoneOf(idOf('finance.m1')).replace('+', ''));
    expect(to).toContain(x.phoneOf(idOf('eng.manager')).replace('+', ''));
  });

  it('an approver who is on leave today is not written to, and is the day after the leave ends', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(x.wentOnWhatsApp().map((m) => m.to)).not.toContain(x.phoneOf(idOf('support.manager')).replace('+', ''));
    const friday = new Date('2026-10-09T07:30:00+01:00');
    jest.setSystemTime(friday);
    x.w.directory.forEach((p) => { (p as any).whatsappLastInboundAt = new Date(friday.getTime() - 60_000); });
    await cron.tellNow(friday);
    expect(x.wentOnWhatsApp().map((m) => m.to)).toContain(x.phoneOf(idOf('support.manager')).replace('+', ''));
  });
});

describe('what the clock passes on together is said once, at once, and the summary after it says nothing more', () => {
  const clockOf = (x: ReturnType<typeof aWorldThatMessages>) => new ARequestWaitsTooLongCron(x.w.prisma, x.w.leaveBoard, x.w.spending, { passOnWhatWaitsTooLong: async () => [] } as any, x.told);

  it('59 requests passed on are one message to each person they were passed on to, straight away, and not once for each request', async () => {
    const x = aWorldThatMessages();
    const done = await clockOf(x).passOnNow(TODAY);
    expect(done.passedOn).toBe(59);
    const to = x.wentOnWhatsApp().map((m) => m.to);
    expect(new Set(to).size).toBe(to.length);
    expect(to.length).toBeLessThan(15);
    /* An admin whom leave and spending were both passed on to reads one message of 42. */
    const admin = x.wentOnWhatsApp().filter((m) => m.to === x.phoneOf(idOf('ceo')).replace('+', ''));
    expect(admin).toHaveLength(1);
    expect(admin[0].text).toMatch(/^Hi \w+\. 4\d requests are waiting for you to approve or decline[.:]/);
  });

  it('it goes at once even for a person who has had their message of the day, so nobody waits a day for it', async () => {
    const x = aWorldThatMessages({ sentToday: { [idOf('ceo')]: ['lead-summary'], [idOf('ops.head')]: ['lead-summary'] } });
    await clockOf(x).passOnNow(TODAY);
    expect(x.wentOnWhatsApp().map((m) => m.to)).toContain(x.phoneOf(idOf('ceo')).replace('+', ''));
  });

  it('clock, then the morning sweep: what the clock told is not told again, and only what it did not reach is caught up', async () => {
    const x = aWorldThatMessages();
    await clockOf(x).passOnNow(TODAY);
    const afterTheClock = x.wentOnWhatsApp().length;
    const toCeo = () => x.wentOnWhatsApp().filter((m) => m.to === x.phoneOf(idOf('ceo')).replace('+', '')).length;
    expect(toCeo()).toBe(1);
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    expect(toCeo()).toBe(1);
    /* The people the clock reached have had everything told; the sweep writes only to those with something it never said. */
    const toldByTheClock = new Set(x.wentOnWhatsApp().slice(0, afterTheClock).map((m) => m.to));
    const caughtUp = x.wentOnWhatsApp().slice(afterTheClock).map((m) => m.to);
    for (const to of caughtUp) expect(toldByTheClock.has(to)).toBe(false);
  });

  it('the morning sweep, then the clock: the clock still tells the people it passes requests to', async () => {
    const x = aWorldThatMessages();
    const cron = new TheApproversSummaryCron(x.w.prisma, x.told);
    jest.setSystemTime(lagos('07:30'));
    await cron.tellNow(lagos('07:30'));
    const before = x.wentOnWhatsApp().length;
    jest.setSystemTime(lagos('08:00'));
    await clockOf(x).passOnNow(lagos('08:00'));
    expect(x.wentOnWhatsApp().length).toBeGreaterThan(before);
  });
});

it('aSpendRequest reads as it always did', () => {
  expect(aSpendRequest('s-1', 'u-1', 'Grace', 120000, 'KES', 'Two tablets').what).toBe('KES 120,000 for two tablets');
});
