import { EmailService } from '../email/email.service';
import { THEY_HAD_ONE_TODAY } from './one-routine-message-a-day';

/**
 * SECTION 36 JOURNEYS THAT CAN BE READ WITH IN-MEMORY DOUBLES (decision 109), as the person reads the record of what was and was not sent.
 *
 * 11 (email volume): one person with five things due on one day receives one routine message.
 * 16 (opted-out user): the weekly message that would otherwise go is suppressed before delivery, written down with its reason, and said in a way that
 *    cannot be read as the person ignoring it.
 * The other journeys that double can prove are in the specs beside the code each one belongs to (see the report).
 */
function world(optedOut = false) {
  const notifications: any[] = [];
  const delivered: string[] = [];
  const prisma: any = {
    notification: {
      create: jest.fn(async ({ data }: any) => { notifications.push({ ...data, createdAt: new Date() }); return data; }),
      findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.channel === 'email' && n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender))),
    },
    whatsAppSend: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => [{ email: 'vera@x.test', phone: null, organizationId: 'o1', externalId: 'vera' }]), findFirst: jest.fn(async () => ({ organizationId: 'o1', externalId: 'vera', timezone: null })) },
    user: { findUnique: jest.fn(async () => ({ emailNotifications: !optedOut, isActive: true, deletedAt: null })), findMany: jest.fn(async () => []) },
    emailPreference: { findMany: jest.fn(async () => (optedOut ? [{ unsubscribedAt: new Date(), roundDigest: true, nudges: true }] : [])), findUnique: jest.fn(async () => null) },
    emailAddressPreference: { findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    scheduledEmail: { create: jest.fn(async () => ({})) },
  };
  const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { delivered.push(sender); await email.writeItDown(o, sender, 'sent', null); return 'sent'; });
  email.holdForTheMorning = jest.fn(async () => false);
  const to = (sender: string) => email.sendEmail({ to: 'vera@x.test', subject: sender, html: '<p>Hello</p>' }, undefined, sender);
  return { to, notifications, delivered };
}

describe('journey 11: one person with five things due in one day', () => {
  it('receives one routine message, and the record says why the others did not go', async () => {
    const w = world();
    for (const sender of ['sendNudge', 'sendAbsenceReminder', 'sendFeedbackRequest', 'sendYourWeek', 'sendHeresWhatIsNew']) await w.to(sender);
    expect(w.delivered).toEqual(['sendNudge']);
    expect(w.notifications.filter((n) => n.outcome === 'suppressed').map((n) => n.because)).toEqual(Array(4).fill(THEY_HAD_ONE_TODAY));
  });
});

describe('journey 16: a person who turned these emails off', () => {
  it('is not sent the weekly message, and the record says they asked, not that they ignored it', async () => {
    const w = world(true);
    await w.to('sendYourWeek');
    expect(w.delivered).toEqual([]);
    expect(w.notifications).toEqual([expect.objectContaining({ sender: 'sendYourWeek', outcome: 'suppressed' })]);
    expect(w.notifications[0].because).toMatch(/unsubscribe|turned off|used the/);
    expect(w.notifications[0].because).not.toMatch(/ignor|did not open|no response/i);
  });
  it('and still gets what they asked for, and an approval', async () => {
    const w = world(true);
    for (const sender of ['sendReportReady', 'sendApprovalsSummary', 'sendMeThat']) await w.to(sender);
    expect(w.delivered).toEqual(['sendReportReady', 'sendApprovalsSummary', 'sendMeThat']);
  });
});
