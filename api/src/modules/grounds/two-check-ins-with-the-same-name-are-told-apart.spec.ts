import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { theNamesOfReadersCheckIns } from './the-names-of-a-readers-check-ins';

/**
 * TWO CHECK-INS WITH THE SAME NAME, AS A PERSON READS THEM. Each surface that lists check-ins by name
 * says which is which when two share a name, and a check-in with a name of its own reads as it always did.
 */
const NOW = new Date('2026-10-07T09:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

const same = (id: string, startedDaysAgo: number): ListedCheckIn => ({
  id, label: 'Sales team, Q4', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-lead', createdAt: ago(startedDaysAgo),
  participants: [{ id: `p-${id}`, userId: 'u-me', user: { firstName: 'Me' } }],
  checkIns: [{ id: `c-${id}`, participantId: `p-${id}`, sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) }],
});

describe('Today with two check-ins of the same name', () => {
  it('says when each started', () => {
    const today = whatNeedsYou([same('g1', 35), same('g2', 5), { ...same('g3', 9), label: 'Hiring' }], { userId: 'u-me', organizationId: 'org' }, [], NOW);
    const titles = JSON.stringify(today);
    expect(titles).toContain('Sales team, Q4, started 2 September');
    expect(titles).toContain('Sales team, Q4, started 2 October');
    /* The one with a name of its own is unchanged. */
    expect(titles).toContain('Hiring');
    expect(titles).not.toContain('Hiring, started');
  });

  it('reads a unique name as before', () => {
    const today = whatNeedsYou([same('g1', 35)], { userId: 'u-me', organizationId: 'org' }, [], NOW);
    expect(JSON.stringify(today)).toContain('Sales team, Q4');
    expect(JSON.stringify(today)).not.toContain('started');
  });
});

describe('the names a person is told in a message', () => {
  const prisma: any = {
    ground: {
      findMany: jest.fn(async () => [
        { id: 'g1', label: 'Sales team, Q4', createdAt: ago(35), initiator: { firstName: 'Wairimu' } },
        { id: 'g2', label: 'Sales team, Q4', createdAt: ago(5), initiator: { firstName: 'Baraka' } },
        { id: 'g3', label: 'Hiring', createdAt: ago(9), initiator: { firstName: 'Baraka' } },
      ]),
    },
  };
  it('tells the two apart and leaves the third alone, reading the person once', async () => {
    const nameFor = theNamesOfReadersCheckIns(prisma);
    const who = { userId: 'u-me', email: 'me@x.test' };
    expect(await nameFor(who, 'g1', 'Sales team, Q4')).toBe('Sales team, Q4, started 2 September');
    expect(await nameFor(who, 'g2', 'Sales team, Q4')).toBe('Sales team, Q4, started 2 October');
    expect(await nameFor(who, 'g3', 'Hiring')).toBe('Hiring');
    expect(prisma.ground.findMany).toHaveBeenCalledTimes(1);
  });
  it('falls back to the stored name when the read fails', async () => {
    const nameFor = theNamesOfReadersCheckIns({ ground: { findMany: async () => { throw new Error('down'); } } } as any);
    expect(await nameFor({ userId: 'u' }, 'g1', 'Sales team, Q4')).toBe('Sales team, Q4');
  });
});

describe('the morning reminder email', () => {
  it('names the one it is about by when it started, when the person has two of that name', async () => {
    const { RemindService } = await import('../conversation/remind.service');
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T08:00:00.000Z'));
    try {
      const lead = { email: 'lead@x.test', firstName: 'Wairimu' };
      const row = (id: string, groundId: string, made: string) => ({
        id, createdAt: new Date(made), sessionNumber: 1, availableFrom: null, participantId: 'p1', groundId, leadToldAt: null,
        ground: { status: 'ACTIVE', label: 'Sales team, Q4', organizationId: 'org', initiatorId: 'u-lead', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: false, initiator: lead },
        participant: { id: 'p1', email: 'amani@x.test', userId: 'u-amani', lastNudgedAt: null, nameGiven: null, user: { firstName: 'Amani', lastName: '', emailNotifications: true, isActive: true, deletedAt: null } },
      });
      const sent: string[] = [];
      const prisma: any = {
        checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row('c1', 'g1', '2026-09-30T08:00:00.000Z')] : [])), findFirst: jest.fn(async () => null), updateMany: jest.fn(async () => ({})) },
        ground: { findMany: jest.fn(async () => [
          { id: 'g1', label: 'Sales team, Q4', createdAt: new Date('2026-09-02T09:00:00Z'), initiator: { firstName: 'Wairimu' } },
          { id: 'g2', label: 'Sales team, Q4', createdAt: new Date('2026-10-02T09:00:00Z'), initiator: { firstName: 'Wairimu' } },
        ]) },
        groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
        leaveRequest: { findMany: jest.fn(async () => []) },
      };
      const email: any = { sendNudge: jest.fn(async (_to: string, label: string) => { sent.push(label); }), sendWhoHasNotStarted: jest.fn(), sendAbsenceReminder: jest.fn(), buildCheckInUrl: (id: string) => `http://x/checkin/${id}` };
      await new RemindService(prisma, email, { tell: async () => [] } as any).sendScheduledNudges();
      expect(sent).toEqual(['Sales team, Q4, started 2 September']);
    } finally { jest.useRealTimers(); }
  });
});
