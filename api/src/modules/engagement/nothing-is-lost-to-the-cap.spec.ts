import { hasBeenToldOnce, nowToldOnce } from './a-message-sent-once';
import { RemindService } from '../conversation/remind.service';
import { EmailService } from '../email/email.service';

/**
 * NOTHING IS LOST TO THE ONE-A-DAY CAP (decision 109, review).
 *
 * A reminder the cap refused did not go, so it must not use up the person's chase (an existing client would lose reminders they had before); and a
 * "once" record is written only for a message that was really delivered. A message held for the morning counts as told only while it waits, or once it went.
 */
function store() {
  const rows = new Map<string, any>();
  const scheduled: any[] = [];
  const notifications: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (rows.has(where.key) ? { value: rows.get(where.key) } : null)),
      create: jest.fn(async ({ data }: any) => { if (rows.has(data.key)) throw new Error('clash'); rows.set(data.key, data.value); return data; }),
      update: jest.fn(async ({ where, data }: any) => { rows.set(where.key, data.value); return data; }),
    },
    scheduledEmail: { findFirst: jest.fn(async ({ where }: any) => scheduled.find((s) => s.sender === where.sender && s.toAddress.toLowerCase() === where.toAddress.equals.toLowerCase() && s.sentAt === null) ?? null) },
    notification: { findFirst: jest.fn(async ({ where }: any) => notifications.find((n) => n.sender === where.sender && n.toAddress.toLowerCase() === where.toAddress.equals.toLowerCase() && n.outcome === 'sent' && n.createdAt >= where.createdAt.gte) ?? null) },
  };
  return { prisma, rows, scheduled, notifications };
}
const held = { sender: 'sendTheReportFollowUp', to: 'Wairimu@x.test' };

describe('a "once" record', () => {
  it('is not written for a message that was refused', async () => {
    const s = store();
    await nowToldOnce(s.prisma, 'k', 'suppressed', held);
    expect(s.rows.size).toBe(0);
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(false);
  });
  it('is written for one that was delivered', async () => {
    const s = store();
    await nowToldOnce(s.prisma, 'k', 'sent', held);
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(true);
  });
  it('for a held one counts as told while it waits, and once it went', async () => {
    const s = store();
    await nowToldOnce(s.prisma, 'k', 'held', held);
    s.scheduled.push({ sender: held.sender, toAddress: 'WAIRIMU@x.test', sentAt: null });
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(true);
    s.scheduled.length = 0;
    s.notifications.push({ sender: held.sender, toAddress: 'wairimu@x.test', outcome: 'sent', createdAt: new Date(Date.now() + 1000) });
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(true);
  });
  it('for a held one that was refused when its time came is not told, and is tried again', async () => {
    const s = store();
    await nowToldOnce(s.prisma, 'k', 'held', held);
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(false);
    await nowToldOnce(s.prisma, 'k', 'sent', held);
    expect(await hasBeenToldOnce(s.prisma, 'k')).toBe(true);
  });
});

describe('a chase the cap refused', () => {
  const NOW = new Date('2026-10-20T08:00:00.000Z');
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  function sweep(outcome: 'sent' | 'suppressed') {
    const ground = { label: 'Kenya launch', organizationId: 'org', initiatorId: 'u-w', createdAt: new Date('2026-10-02T08:00:00Z'), brief: null, chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { email: 'w@x.test', firstName: 'Wairimu' } };
    const row = { id: 'c1', createdAt: new Date('2026-10-17T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: 'p-o', groundId: 'g1', leadToldAt: null, ground, participant: { id: 'p-o', email: 'omar@x.test', userId: 'u-o', lastNudgedAt: null, user: { firstName: 'Omar', emailNotifications: true, isActive: true, deletedAt: null } } };
    const updates: any[] = [];
    const prisma: any = {
      checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row] : [])) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-o', userId: 'u-o', managingOnly: false, user: { isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: [] }]), update: jest.fn(async (a: any) => { updates.push(a); return {}; }), findUnique: jest.fn(async () => null) },
      leaveRequest: { findMany: jest.fn(async () => []) },
    };
    const email: any = { sendNudge: jest.fn(async () => outcome), sendWhoHasNotStarted: jest.fn(), sendAbsenceReminder: jest.fn(), buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}` };
    return { service: new RemindService(prisma, email, { tell: async () => [] } as any), updates };
  }

  it('does not use up Omar\'s chase when it was refused, so it is tried again', async () => {
    const w = sweep('suppressed');
    await w.service.sendScheduledNudges();
    expect(w.updates).toEqual([]);
  });
  it('and does when it went', async () => {
    const w = sweep('sent');
    await w.service.sendScheduledNudges();
    expect(w.updates).toHaveLength(1);
  });
});

describe('the reminder tells its caller what became of it', () => {
  it('suppressed by the one-a-day rule is said as suppressed', async () => {
    const notifications: any[] = [{ channel: 'email', outcome: 'sent', sender: 'sendRoundDigest', toAddress: 'omar@x.test', createdAt: new Date() }];
    const prisma: any = {
      notification: { create: jest.fn(async ({ data }: any) => { notifications.push(data); return data; }), findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender))) },
      whatsAppSend: { findMany: jest.fn(async () => []) },
      person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      emailPreference: { findMany: jest.fn(async () => []) }, emailAddressPreference: { findUnique: jest.fn(async () => null) }, emailDelivery: { findFirst: jest.fn(async () => null) },
      groundParticipant: { findUnique: jest.fn(async () => null) }, scheduledEmail: { create: jest.fn() },
    };
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    email.deliverNow = jest.fn(async () => 'sent');
    email.holdForTheMorning = jest.fn(async () => false);
    email.theWayToStopBeingChased = jest.fn(async () => '');
    expect(await email.sendNudge('omar@x.test', 'Kenya launch', 'https://app.test/c', undefined, undefined, null, 'p1')).toBe('suppressed');
  });
});
