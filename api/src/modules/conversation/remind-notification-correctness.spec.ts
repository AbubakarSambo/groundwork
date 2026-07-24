import { RemindService } from './remind.service';

/**
 * Notification correctness for the manual "remind" action.
 *
 * (1) SELF-NUDGE: allParticipants used to include the requester themselves,
 *     so clicking "remind" could email the CLICKER a "complete your check-in"
 *     nudge about their own incomplete session, and count toward the
 *     "N people reminded" result as if someone else had been nudged.
 * (2) PREFERENCE: the settings toggle "Ground invites and reminders - emails
 *     when you are added to a ground or when a check-in is due" must actually
 *     gate reminder emails; it was written to the user row and never read.
 */
function makeService(overrides: any = {}) {
  const sent: string[] = [];
  const nudged: string[] = [];
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', sessionNumber: 1 })) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Test ground' })) },
    groundParticipant: {
      findFirst: jest.fn(async () => ({ id: 'p-requester', groundId: 'g1', userId: 'requester-user' })),
      findMany: jest.fn(async () => overrides.participants ?? []),
      update: jest.fn(async (a: any) => { nudged.push(a.where.id); return {}; }),
    },
  };
  const email: any = { sendNudge: jest.fn(async (to: string) => { sent.push(to); return {}; }) };
  const service = new RemindService(prisma, email);
  return { service, prisma, email, sent, nudged };
}

const PARTICIPANT = (over: any) => ({
  id: over.id, email: over.email, userId: over.userId, lastNudgedAt: null,
  user: { firstName: over.firstName ?? 'X', emailNotifications: over.emailNotifications ?? true },
  checkIns: [],
});

describe('sendReminder: does not self-nudge the requester', () => {
  it('excludes the requester from the participants queried for nudging', async () => {
    const { service, prisma } = makeService({
      participants: [PARTICIPANT({ id: 'p2', email: 'other@x.test', userId: 'other-user' })],
    });
    await service.sendReminder('ci1', 'requester-user');
    const where = (prisma.groundParticipant.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.userId.notIn).toContain('requester-user');
  });
});

describe('sendReminder: respects "Ground invites and reminders" being turned off', () => {
  it('does NOT email a participant who has emailNotifications: false', async () => {
    const { service, sent, nudged } = makeService({
      participants: [PARTICIPANT({ id: 'p2', email: 'off@x.test', userId: 'u2', emailNotifications: false })],
    });
    const res = await service.sendReminder('ci1', 'requester-user');
    expect(sent).not.toContain('off@x.test');
    expect(nudged).not.toContain('p2');
    expect(res.count).toBe(0);
  });

  it('DOES email a participant with notifications on (unchanged)', async () => {
    const { service, sent } = makeService({
      participants: [PARTICIPANT({ id: 'p3', email: 'on@x.test', userId: 'u3', emailNotifications: true })],
    });
    const res = await service.sendReminder('ci1', 'requester-user');
    expect(sent).toContain('on@x.test');
    expect(res.count).toBe(1);
  });
});
