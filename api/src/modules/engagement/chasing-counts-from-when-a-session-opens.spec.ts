import { RemindService } from '../conversation/remind.service';

/**
 * CHASE DAYS COUNT FROM WHEN A SESSION OPENS (engagement spec sections 15 and 18; found on the test bed, 15 to 18 October), AS CHIDI READS HIS REMINDERS.
 *
 * "Q4 priorities" is weekly. Chidi answered session 1 on 8 October, and that made his session 2 row the same minute. Session 2 became available on 15 October.
 * The chase days are 3, 7 and 14 after a session opens. The sweep counted them from the row, so on the morning session 2 opened Chidi had "been waiting" seven
 * days and was chased at once, and the lead was told the chasing was over a week after it began.
 */
const lead = { email: 'grace@x.test', firstName: 'Grace' };
const ground = { label: 'Q4 priorities', organizationId: 'org', initiatorId: 'u-g', brief: null, chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };

function sweep(row: { createdAt: Date; availableFrom: Date | null }) {
  const rows = [{
    id: 'c1', ...row, sessionNumber: 2, participantId: 'p1', groundId: 'g1', leadToldAt: null, ground,
    participant: { id: 'p1', email: 'chidi@x.test', userId: 'u1', lastNudgedAt: null, user: { firstName: 'Chidi', emailNotifications: true, isActive: true, deletedAt: null } },
  }];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? rows : [])), updateMany: jest.fn(async () => ({})) },
    groundParticipant: { findMany: jest.fn(async () => []), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const email: any = {
    sendNudge: jest.fn(async () => 'sent'),
    sendWhoHasNotStarted: jest.fn(async () => undefined),
    buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}`,
    frontendUrl: 'https://app.test',
  };
  return { service: new RemindService(prisma, email, { tell: async () => [] } as any), email };
}
const ROW_MADE = new Date('2026-10-08T08:10:00.000Z');
const OPENED = new Date('2026-10-15T08:10:00.000Z');
const at = (iso: string) => { jest.useFakeTimers().setSystemTime(new Date(iso)); };
afterEach(() => jest.useRealTimers());

describe('Chidi, whose session 2 row was made on 8 October and opened on 15 October', () => {
  it('is not chased on the morning it opens, which is seven days after the row was made', async () => {
    at('2026-10-15T09:00:00.000Z');
    const w = sweep({ createdAt: ROW_MADE, availableFrom: OPENED });
    await w.service.sendScheduledNudges();
    expect(w.email.sendNudge).not.toHaveBeenCalled();
  });
  it('is chased three days after it opens', async () => {
    at('2026-10-18T09:00:00.000Z');
    const w = sweep({ createdAt: ROW_MADE, availableFrom: OPENED });
    await w.service.sendScheduledNudges();
    expect(w.email.sendNudge).toHaveBeenCalledTimes(1);
  });
  it('and the lead is not told the chasing is over a week after it began', async () => {
    at('2026-10-22T09:00:00.000Z');
    const w = sweep({ createdAt: ROW_MADE, availableFrom: OPENED });
    await w.service.sendScheduledNudges();
    expect(w.email.sendWhoHasNotStarted).not.toHaveBeenCalled();
  });
  it('a first session, which has no date it opens, counts from when it was made, as before', async () => {
    at('2026-10-11T09:00:00.000Z');
    const w = sweep({ createdAt: new Date('2026-10-08T08:10:00.000Z'), availableFrom: null });
    await w.service.sendScheduledNudges();
    expect(w.email.sendNudge).toHaveBeenCalledTimes(1);
  });
});
