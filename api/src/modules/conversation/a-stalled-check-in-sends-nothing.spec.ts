import { RemindService } from './remind.service';

/**
 * A STALLED CHECK-IN SENDS NOTHING (docs/user-journey-tests.md E1). On the test bed, after a one-day
 * clock move, the lead of an old organisation got five emails saying people "have not started"
 * check-ins that stalled weeks before. The morning reminder read every session nobody had started and
 * never asked the check-in's own state. The fake database here applies the state filter the way the
 * real one does, so the test fails if the reminder stops asking.
 */
const NOW = new Date('2026-10-08T08:00:00.000Z');

function theMorning(states: string[]) {
  const lead = { email: 'lead@riverbank.test', firstName: 'Mira' };
  const rows = states.map((state, i) => ({
    id: `c${i}`, createdAt: new Date('2026-09-20T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: `p${i}`, groundId: `g${i}`, leadToldAt: null,
    ground: { status: state, label: `Where next, part ${i + 1}`, organizationId: 'org', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead },
    participant: { id: `p${i}`, email: `p${i}@riverbank.test`, lastNudgedAt: null, nameGiven: null, user: { firstName: `P${i}`, lastName: '', emailNotifications: true, isActive: true, deletedAt: null } },
  }));
  const mailed: string[] = [];
  const prisma: any = {
    checkIn: {
      findMany: jest.fn(async (a: any) => {
        if (a.where?.status !== 'NOT_STARTED' || !a.select?.leadToldAt) return [];
        const notIn: string[] = a.where?.ground?.status?.notIn ?? [];
        return rows.filter((r) => !notIn.includes(r.ground.status));
      }),
      findFirst: jest.fn(async () => null), updateMany: jest.fn(async () => ({})), update: jest.fn(async () => ({})),
    },
    groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({})) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const email: any = {
    sendNudge: jest.fn(async (to: string) => { mailed.push(`nudge to ${to}`); }),
    sendWhoHasNotStarted: jest.fn(async (to: string, subject: string) => { mailed.push(`lead ${to}: ${subject}`); }),
    sendAbsenceReminder: jest.fn(async () => ({})),
    buildCheckInUrl: (id: string) => `http://localhost/checkin/${id}`,
  };
  const service = new RemindService(prisma, email, { tell: async () => [] } as any);
  return { service, mailed };
}

describe('the morning reminder and a check-in that is not live', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it.each(['STALLED', 'CLOSED', 'RESOLVED', 'PAUSED', 'AWAITING_APPROVAL', 'AWAITING_LEAD'])('sends nobody anything about a check-in that is %s', async (state) => {
    const { service, mailed } = theMorning([state, state]);
    await service.sendScheduledNudges();
    expect(mailed).toEqual([]);
  });

  it('still reminds about a check-in that is live', async () => {
    const { service, mailed } = theMorning(['STALLED', 'ACTIVE', 'AWAITING_PARTIES']);
    await service.sendScheduledNudges();
    expect(mailed.length).toBeGreaterThan(0);
    expect(mailed.join(' ')).not.toContain('part 1');
    expect(mailed.join(' ')).toContain('part 2');
  });
});
