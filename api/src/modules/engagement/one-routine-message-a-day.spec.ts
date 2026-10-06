import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NOT_TODAY } from '../whatsapp/a-message-outside-the-window';
import { THEY_HAD_ONE_TODAY, ROUTINE_EMAILS, aRoutineWhatsApp } from './one-routine-message-a-day';

/**
 * ONE ROUTINE MESSAGE A PERSON A DAY, ACROSS EMAIL AND WHATSAPP TOGETHER (decision 109, item 6), AS EACH PERSON READS IT.
 *
 * Vera has a roster row with an address and a number. Read through the real email door and the real WhatsApp door over one shared record:
 * after one routine message by either, the next routine one by either is held back and said so; a check-in opening or closing, an approval,
 * and everything she asked for still go; somebody else is never held for Vera's day, and yesterday does not count.
 */
const NOW = new Date();
const YESTERDAY = new Date(NOW.getTime() - 36 * 3600_000);

function world() {
  const notifications: any[] = [];
  const sends: any[] = [];
  const people = [
    { email: 'vera@x.test', phone: '+254700000001', organizationId: 'o1', externalId: 'vera', timezone: null },
    { email: 'omar@x.test', phone: '+254700000002', organizationId: 'o1', externalId: 'omar', timezone: null },
  ];
  const prisma: any = {
    notification: {
      create: jest.fn(async ({ data }: any) => { notifications.push({ ...data, createdAt: new Date() }); return data; }),
      findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.channel === 'email' && n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender) && n.createdAt >= where.createdAt.gte)),
    },
    whatsAppSend: {
      findMany: jest.fn(async ({ where }: any) => sends.filter((s) => where.phone.in.includes(s.phone) && s.createdAt >= where.createdAt.gte && (!where.OR || where.OR.some((c: any) => (c.sentAt?.not === null ? s.sentAt != null : s.kind === 'not-now'))) && (where.sentAt?.not === null ? s.sentAt != null : true))),
      create: jest.fn(async () => ({})),
    },
    person: {
      findMany: jest.fn(async ({ where }: any) => people.filter((p) => where.OR.some((c: any) => (c.email ? p.email === c.email.equals : c.phone ? c.phone.in.includes(p.phone) : false)))),
      findFirst: jest.fn(async () => ({ organizationId: 'o1', externalId: 'vera', timezone: null })),
    },
    user: { findUnique: jest.fn(async () => null) },
    emailPreference: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    scheduledEmail: { create: jest.fn(async () => ({})) },
  };
  const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  /* The door is real; only the post is a fake, and it writes the record the way the real one does. */
  email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { await email.writeItDown(o, sender, 'sent', null); return 'sent'; });
  email.holdForTheMorning = jest.fn(async () => false);
  const wa: any = new WhatsAppService({ get: () => undefined } as any, prisma);
  const emailed = (to: string, sender: string) => email.sendEmail({ to, subject: `${sender} for ${to}`, html: '<p>Hello</p>' }, undefined, sender);
  const wentOn = (phone: string, kind: string, when = NOW) => sends.push({ phone, kind, sentAt: when, createdAt: when });
  const ask = (phone: string, kind: string) => wa.howOftenToday(phone, kind);
  return { emailed, wentOn, ask, notifications, sends };
}

describe('after one routine email, to Vera', () => {
  it('a second routine email is not sent, and the record says why', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    await w.emailed('vera@x.test', 'sendRoundDigest');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendNudge', 'sent'], ['sendRoundDigest', 'suppressed']]);
    expect(w.notifications[1].because).toBe(THEY_HAD_ONE_TODAY);
    expect(THEY_HAD_ONE_TODAY).toBe('They have already been sent one routine message today, by email or on WhatsApp, and one a day is the most Groundwork sends.');
  });

  it('a routine WhatsApp message is not sent either, on the same day', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    expect(await w.ask('+254700000001', 'overdue')).toBe(NOT_TODAY);
    expect(await w.ask('+254700000001', 'lead-summary')).toBe(NOT_TODAY);
  });

  it('but a check-in opening or closing, and an approval, still reach her on WhatsApp', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    for (const kind of ['checkin-open', 'opens-soon', 'closes-soon', 'closes-in-half-an-hour', 'request-waiting', 'requests-waiting', 'closed-by-the-clock']) {
      expect({ kind, held: await w.ask('+254700000001', kind) }).toEqual({ kind, held: null });
    }
  });

  it('and nothing she asked for, nor an opening or closing by email, is counted or held', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    for (const sender of ['sendSessionReady', 'sendTimeRunningOut', 'sendStalledNotification', 'sendReopenedNotification', 'sendApprovalsSummary', 'sendReportReady', 'sendParticipantCheckedIn', 'sendGroundClosed']) await w.emailed('vera@x.test', sender);
    expect(w.notifications.filter((n) => n.sender !== 'sendNudge').map((n) => n.outcome)).toEqual(Array(8).fill('sent'));
  });
});

describe('after one routine WhatsApp message, to Vera', () => {
  it('a routine email is not sent, and an email she asked for still is', async () => {
    const w = world();
    w.wentOn('+254700000001', 'overdue');
    await w.emailed('vera@x.test', 'sendNudge');
    await w.emailed('vera@x.test', 'sendReportReady');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendNudge', 'suppressed'], ['sendReportReady', 'sent']]);
  });

  it('a second routine WhatsApp message is held as it always was, and an opening still makes two', async () => {
    const w = world();
    w.wentOn('+254700000001', 'overdue');
    expect(await w.ask('+254700000001', 'due-tomorrow')).toBe(NOT_TODAY);
    expect(await w.ask('+254700000001', 'checkin-open')).toBeNull();
  });
});

describe('nobody else, and no other day', () => {
  it('Omar is not held for Vera\'s day', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    w.wentOn('+254700000001', 'overdue');
    expect(await w.ask('+254700000002', 'overdue')).toBeNull();
    await w.emailed('omar@x.test', 'sendNudge');
    expect(w.notifications.filter((n) => n.toAddress === 'omar@x.test').map((n) => n.outcome)).toEqual(['sent']);
  });

  it('yesterday\'s routine message does not count', async () => {
    const w = world();
    w.wentOn('+254700000001', 'overdue', YESTERDAY);
    w.notifications.push({ channel: 'email', toAddress: 'vera@x.test', sender: 'sendNudge', outcome: 'sent', createdAt: YESTERDAY });
    expect(await w.ask('+254700000001', 'due-tomorrow')).toBeNull();
    await w.emailed('vera@x.test', 'sendRoundDigest');
    expect(w.notifications[w.notifications.length - 1].outcome).toBe('sent');
  });

  it('a message that was suppressed is not a message that was sent: it does not use up the day', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    await w.emailed('vera@x.test', 'sendRoundDigest');
    await w.emailed('vera@x.test', 'sendAbsenceReminder');
    expect(w.notifications.filter((n) => n.outcome === 'sent')).toHaveLength(1);
  });
});

describe('what counts as routine', () => {
  it('is the mail Groundwork decided to send, without the openings, closings and approvals', () => {
    for (const s of ['sendSessionReady', 'sendTimeRunningOut', 'sendStalledNotification', 'sendReopenedNotification', 'sendApprovalsSummary', 'sendWebhookEndpointDying']) expect(ROUTINE_EMAILS.has(s)).toBe(false);
    for (const s of ['sendNudge', 'sendAbsenceReminder', 'sendRoundDigest', 'sendTheLeadsWeeklyLetter', 'sendFeedbackRequest']) expect(ROUTINE_EMAILS.has(s)).toBe(true);
    expect(['overdue', 'due-tomorrow', 'lead-summary', 'carry-on', 'anchor-follow-up'].every(aRoutineWhatsApp)).toBe(true);
    expect(['checkin-open', 'opens-soon', 'closes-soon', 'closes-in-half-an-hour', 'request-waiting', 'not-now'].some(aRoutineWhatsApp)).toBe(false);
  });
});
