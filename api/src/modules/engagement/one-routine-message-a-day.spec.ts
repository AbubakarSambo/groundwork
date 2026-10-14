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
  /* Kai has an account and a number on it, and is on no roster. */
  const users: any[] = [{ email: 'kai@x.test', phoneNumber: '+254700000009' }];
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
    user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async ({ where }: any) => users.filter((u) => where.OR.some((c: any) => (c.email ? u.email === c.email.equals.toLowerCase() : c.phoneNumber ? c.phoneNumber.in.includes(u.phoneNumber) : false)))) },
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
  return { emailed, wentOn, ask, notifications, sends, email, prisma, people };
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
    for (const s of ['sendNudge', 'sendAbsenceReminder', 'sendRoundDigest', 'sendFeedbackRequest']) expect(ROUTINE_EMAILS.has(s)).toBe(true);
    /* Not routine, and never held for the day's one: what was asked for by a press or a request, what is billing, an invitation about to lapse, a participant being blocked, and the lead's Friday letter (it outranks the morning's WhatsApp summary). */
    for (const s of ['sendNudgeFromAPress', 'sendMeThat', 'sendCodeExpiryReminder', 'sendInviteAboutToLapse', 'sendParticipantBlockedNudge', 'sendTheLeadsWeeklyLetter']) expect(ROUTINE_EMAILS.has(s)).toBe(false);
    expect(['overdue', 'due-tomorrow', 'lead-summary', 'carry-on', 'anchor-follow-up'].every(aRoutineWhatsApp)).toBe(true);
    expect(['checkin-open', 'opens-soon', 'closes-soon', 'closes-in-half-an-hour', 'request-waiting', 'not-now'].some(aRoutineWhatsApp)).toBe(false);
  });
});

describe('what a person asked for is never routine (review of the one-a-day rule)', () => {
  it('the lead pressing Remind still goes after a routine email, and does not use up the day', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    await w.emailed('vera@x.test', 'sendNudgeFromAPress');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendNudge', 'sent'], ['sendNudgeFromAPress', 'sent']]);
    const fresh = world();
    await fresh.emailed('vera@x.test', 'sendNudgeFromAPress');
    await fresh.emailed('vera@x.test', 'sendNudge');
    expect(fresh.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendNudgeFromAPress', 'sent'], ['sendNudge', 'sent']]);
  });

  it('"send me that" from the assistant is never counted or held', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    await w.emailed('vera@x.test', 'sendMeThat');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendNudge', 'sent'], ['sendMeThat', 'sent']]);
  });

  it('the lead\'s Friday letter, a code about to expire and an invitation about to lapse still go', async () => {
    const w = world();
    await w.emailed('vera@x.test', 'sendNudge');
    for (const s of ['sendTheLeadsWeeklyLetter', 'sendCodeExpiryReminder', 'sendInviteAboutToLapse', 'sendParticipantBlockedNudge']) await w.emailed('vera@x.test', s);
    expect(w.notifications.slice(1).map((n) => n.outcome)).toEqual(['sent', 'sent', 'sent', 'sent']);
  });
});

describe('one person, found by the number on their sign-in too', () => {
  it('Kai has no roster row; an email to him then uses the day for his WhatsApp, and the other way round', async () => {
    const w = world();
    await w.emailed('kai@x.test', 'sendNudge');
    expect(await w.ask('+254700000009', 'overdue')).toBe(NOT_TODAY);
    const v = world();
    v.wentOn('+254700000009', 'overdue');
    await v.emailed('kai@x.test', 'sendNudge');
    expect(v.notifications[0].outcome).toBe('suppressed');
  });
});

describe('a mail held for the morning is asked again before it goes', () => {
  it('and is put away if they were sent their one in the meantime, or stopped these emails', async () => {
    const w = world();
    const held = { toAddress: 'vera@x.test', subject: 'Your check-in is waiting', html: '<p>Hi</p>', sender: 'sendNudge', context: null };
    await w.emailed('vera@x.test', 'sendRoundDigest');
    await (w.email as any).deliverHeld(held);
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendRoundDigest', 'sent'], ['sendNudge', 'suppressed']]);
    expect(w.email.deliverNow).toHaveBeenCalledTimes(1);

    const v = world();
    await (v.email as any).deliverHeld(held);
    expect(v.notifications).toEqual([expect.objectContaining({ sender: 'sendNudge', outcome: 'sent' })]);
  });
});

describe('the invitation about to lapse says what became of it', () => {
  it('sent, or refused, so the sweep stamps only what is on its way', async () => {
    const w = world();
    expect(await (w.email as any).sendInviteAboutToLapse('vera@x.test', 'Sales team, Q4', 'https://app.test/invite?token=t', 'p1')).toBe('sent');
  });
});

/**
 * REVIEWER, 14 OCTOBER: MERCY'S 17 OCTOBER. She got the WhatsApp opening, the "Your next check-in is open" email and the "You've missed
 * your last two check-ins" email. The two openings are the exception (WhatsApp is in addition to email, never instead of it); the missed
 * notice is routine (decision 136 tells the person first, once by email) and was her one routine message that day. Anything routine after
 * it, by either door, is held.
 */
describe('Mercy\'s day: the openings on both doors, and one routine message', () => {
  it('the openings never use up her one, the missed notice does, and the next routine one by either door is held', async () => {
    const w = world();
    w.wentOn('+254700000001', 'checkin-open:template');
    await w.emailed('vera@x.test', 'sendSessionReady');
    await w.emailed('vera@x.test', 'sendMissedCheckIns');
    await w.emailed('vera@x.test', 'sendYourWeek');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendSessionReady', 'sent'], ['sendMissedCheckIns', 'sent'], ['sendYourWeek', 'suppressed']]);
    expect(await w.ask('+254700000001', 'overdue')).toBe(NOT_TODAY);
  });
});

describe('the missed notice rides inside the opening email (reviewer, 14 October)', () => {
  it('one email: "Your next check-in is open" with the missed lines in it, and no routine message used', async () => {
    const w = world();
    let html = '';
    w.email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { html = o.html; await w.email.writeItDown(o, sender, 'sent', null); return 'sent'; });
    await w.email.sendSessionReady('vera@x.test', 'Sales daily', 'https://app.test/checkin/c1', false, ["You've missed your last two check-ins.", 'If something is in the way, you can tell Grace why on your Today page.']);
    expect(html).toContain("<p>You've missed your last two check-ins.</p>");
    expect(html).toContain('If something is in the way, you can tell Grace why on your Today page.');
    await w.emailed('vera@x.test', 'sendNudge');
    expect(w.notifications.map((n) => [n.sender, n.outcome])).toEqual([['sendSessionReady', 'sent'], ['sendNudge', 'sent']]);
  });
});
