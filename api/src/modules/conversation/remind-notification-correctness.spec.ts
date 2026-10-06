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
    /* Whose name a re-invitation is sent in. Somebody who never accepted is now reachable by the
       reminder button — see `whatToSendThem` — and that mail needs a name on it. */
    user: { findUnique: jest.fn(async () => ({ firstName: 'Ada' })) },
    checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', sessionNumber: 1 })) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Test ground' })) },
    groundParticipant: {
      findFirst: jest.fn(async () => ({ id: 'p-requester', groundId: 'g1', userId: 'requester-user' })),
      findMany: jest.fn(async () => overrides.participants ?? []),
      update: jest.fn(async (a: any) => { nudged.push(a.where.id); return {}; }),
    },
  };
  const email: any = {
    sendNudge: jest.fn(async (to: string) => { sent.push(to); return {}; }),
    /* The lead's Remind button is its own sender now (decision 109): never counted or held for the day's one routine message. */
    sendNudgeFromAPress: jest.fn(async (to: string) => { sent.push(to); return {}; }),
    /* The real one. The service reaches for the helper now rather than hand-building a path
       it had been getting wrong — see a-link-in-an-email-has-to-resolve.spec.ts. */
    buildCheckInUrl: (id: string) => `http://localhost:5173/checkin/${id}`,
    sendAbsenceReminder: jest.fn(async () => ({})),
  };
  /* The channel, where a customer has connected one. These tests are about who gets an EMAIL, so
     the notifier does nothing and records nothing. */
  const channel = { tell: async () => [] } as any;
  const service = new RemindService(prisma, email, channel);
  return { service, prisma, email, sent, nudged };
}

/*
 * A PARTICIPANT WHO HAS A CHECK-IN, because the reminder is a link to one.
 *
 * This fixture carried `checkIns: []`, and the service used to nudge that party anyway — building
 * the link from `checkIns[0]?.id ?? ''`, so the email pointed at nothing. The nudge now refuses a
 * party with no check-in (see who-is-worth-nudging.ts), so a fixture with none was asserting the
 * defect. `managingOnly` is here because the service reads it: a lead who oversees rather than
 * answers is not nudged about work that is not theirs.
 */
const PARTICIPANT = (over: any) => ({
  id: over.id, email: over.email, userId: over.userId, lastNudgedAt: over.lastNudgedAt ?? null,
  managingOnly: over.managingOnly ?? false,
  user: { firstName: over.firstName ?? 'X', emailNotifications: over.emailNotifications ?? true },
  checkIns: over.checkIns ?? [{ id: `${over.id}-checkin`, status: 'NOT_STARTED' }],
});

describe('sendReminder: does not self-nudge the requester', () => {
  it('excludes the requester from the participants queried for nudging', async () => {
    const { service, prisma } = makeService({
      participants: [PARTICIPANT({ id: 'p2', email: 'other@x.test', userId: 'other-user' })],
    });
    await service.sendReminder('ci1', 'requester-user');
    /* The shape changed: somebody who never accepted has no `userId`, and they are exactly who a
       lead wants to chase — so the query is an OR rather than `userId: { not: null }`. The rule
       being tested is unchanged: the requester is never in the result. */
    const where = (prisma.groundParticipant.findMany as jest.Mock).mock.calls[0][0].where;
    const excludes = JSON.stringify(where.OR ?? where);
    expect(excludes).toContain('requester-user');
    expect(excludes).toContain('notIn');
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

/*
 * AND THE THREE PEOPLE WHO USED TO BE NUDGED AND SHOULD NOT BE. Driven through the service rather
 * than through the pure list, because the fault was in what the service selected and passed.
 */
describe('sendReminder: leaves alone the people a reminder is not for', () => {
  it('does not chase somebody who declined', async () => {
    const { service, sent } = makeService({
      participants: [PARTICIPANT({ id: 'p4', email: 'no@x.test', userId: 'u4', checkIns: [{ id: 'c4', status: 'DECLINED' }] })],
    });
    const res = await service.sendReminder('ci1', 'requester-user');
    expect(sent).not.toContain('no@x.test');
    expect(res.count).toBe(0);
  });

  it('does not chase a managing-only lead about a check-in they do not have', async () => {
    const { service, sent } = makeService({
      participants: [PARTICIPANT({ id: 'p5', email: 'lead@x.test', userId: 'u5', managingOnly: true, checkIns: [] })],
    });
    const res = await service.sendReminder('ci1', 'requester-user');
    expect(sent).not.toContain('lead@x.test');
    expect(res.count).toBe(0);
  });

  it('does not send a reminder whose link would point at nothing', async () => {
    const { service, sent } = makeService({
      participants: [PARTICIPANT({ id: 'p6', email: 'nolink@x.test', userId: 'u6', checkIns: [] })],
    });
    await service.sendReminder('ci1', 'requester-user');
    expect(sent).not.toContain('nolink@x.test');
  });
});
