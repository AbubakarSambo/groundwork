import { GroundsCron } from '../grounds/grounds.cron';
import { itIsOverdue } from './what-goes-to-a-phone';

/* A WORKING DAY, WHATEVER DAY THE TESTS RUN (CI after batch 1, 7 November 2026). The morning sweep skips a day the team does not work
   (isAWorkingDay), so on a Saturday or a Sunday it rightly sent nothing and these failed. Only the date is fixed: Wednesday 4 November,
   21:30 UTC, when CI last ran them; timers stay real. */
const ALL_BUT_THE_DATE = ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] as const;
beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-11-04T21:30:00Z'), doNotFake: [...ALL_BUT_THE_DATE] }); });
afterAll(() => { jest.useRealTimers(); });


/**
 * NOBODY HELD FOR A SEAT IS REMINDED, NUDGED OR ANNOUNCED TO (privacy row 5, kept by decision 93; second review, new leak C).
 *
 * The morning reminder sent four people not yet let in "Hi there, your check-in for What are your three priorities this is overdue.
 * It's still open, so you can answer here now.", and their check-in then refused them. The database is asked only for people who hold
 * a seat; this stands in for it, answering the question the sweep actually asks, so a sweep that stops asking fails here.
 */
const DAY = 86_400_000;
const row = (i: number, held: boolean) => ({
  id: `ci-${i}`, groundId: 'g-1', sessionNumber: 2, participantId: `gp-${i}`, createdAt: new Date(Date.now() - 2 * DAY), availableFrom: null, held,
  ground: { label: 'the sales team', scenario: 'PULSE_CHECK', organizationId: 'org-1', overWhatsApp: null, cadence: 'DAILY', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: { firstName: 'Wairimu' } },
  participant: { id: `gp-${i}`, email: `p${i}@example.com`, userId: `u-${i}`, user: { firstName: held ? 'Tobi' : 'Miriam', email: `p${i}@example.com`, phoneNumber: null, isActive: true, deletedAt: null } },
});

function theMorning(rows: any[]) {
  const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
  const prisma: any = {
    checkIn: {
      findMany: jest.fn(async (q: any) => (q.cursor ? [] : rows.filter((r) => q.where?.participant?.awaitingSeat !== false || !r.held))),
    },
    groundParticipant: { findMany: jest.fn(async () => rows.map((r) => ({ id: r.participantId, userId: r.participant.userId, ground: { organizationId: 'org-1' } }))) },
    organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    whatsAppSend: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => ({ phone: '+254712345678' })) },
  };
  const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { cron, sendFor };
}

describe('the morning reminder, with somebody held for a seat among those waiting', () => {
  it('reminds the people who have a seat and nobody held, and never says "is overdue" to somebody not let in', async () => {
    const { cron, sendFor } = theMorning([row(1, false), row(2, true), row(3, false), row(4, true)]);
    const r = await cron.sendWhatsAppRemindersInner();
    expect(r.sent).toBe(2);
    expect(sendFor).toHaveBeenCalledTimes(2);
    const text = itIsOverdue({ firstName: 'Miriam', label: 'the sales team' }).text;
    expect(sendFor.mock.calls.map((c) => c[2])).toEqual([text, text]);
    expect(sendFor.mock.calls.map((c) => c[2]).join(' ')).not.toContain('Tobi');
  });
});
