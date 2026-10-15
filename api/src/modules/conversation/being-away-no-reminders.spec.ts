import { RemindService } from './remind.service';

/**
 * BEING AWAY, FOR THE SENDERS (week 23). Nobody on approved leave today is nudged, and nobody is
 * told they have missed check-ins that opened while they were on leave. Somebody whose leave is only
 * waiting for approval is chased exactly as before.
 */
const NOW = new Date('2026-09-30T08:00:00.000Z');
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

function sweep(leave: { status: string }[]) {
  const lead = { email: 'lead@x.test', firstName: 'Lead' };
  const ground = { label: 'Sales', organizationId: 'org', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };
  const row = (id: string, participantId: string, email: string) => ({
    id, createdAt: new Date('2026-09-26T08:00:00.000Z'), sessionNumber: 2, availableFrom: null, participantId, groundId: 'g1', leadToldAt: null, ground,
    participant: { id: participantId, email, lastNudgedAt: null, user: { firstName: email, emailNotifications: true, isActive: true, deletedAt: null } },
  });
  const sent: string[] = [];
  const told: any[] = [];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row('c1', 'pA', 'ade'), row('c2', 'pY', 'yemi')] : [])), findFirst: jest.fn(async () => null), updateMany: jest.fn(async () => ({})) },
    groundParticipant: {
      findMany: jest.fn(async () => [{ id: 'pA', userId: 'uA', ground: { organizationId: 'org' } }, { id: 'pY', userId: 'uY', ground: { organizationId: 'org' } }]),
      update: jest.fn(async () => ({})),
      findUnique: jest.fn(async () => ({ userId: 'uY', ground: { organizationId: 'org' }, absenceToldAt: null })),
    },
    leaveRequest: {
      findMany: jest.fn(async () => leave.map((l) => ({ ...l, userId: 'uY', organizationId: 'org', startsOn: day('2026-09-28'), endsOn: day('2026-10-02') }))
        .filter((l) => l.status === 'approved')),
    },
  };
  const email: any = {
    sendNudge: jest.fn(async (to: string) => { sent.push(to); }),
    sendWhoHasNotStarted: jest.fn(async (_to: string, _s: string, text: string) => { told.push(text); }),
    sendAbsenceReminder: jest.fn(async () => ({})),
    buildCheckInUrl: (id: string) => `http://localhost/checkin/${id}`,
  };
  const service = new RemindService(prisma, email, { tell: async () => [] } as any);
  return { service, sent, told, email, prisma };
}

describe('the scheduled nudges and the people who are away', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('nudge the person who is there and not the one who is away', async () => {
    const { service, sent } = sweep([{ status: 'approved' }]);
    await service.sendScheduledNudges();
    expect(sent).toEqual(['ade']);
  });

  it('nudge both when the leave is only waiting for approval', async () => {
    const { service, sent } = sweep([{ status: 'waiting' }]);
    await service.sendScheduledNudges();
    expect(sent.sort()).toEqual(['ade', 'yemi']);
  });
});

describe('the "you have missed" mail', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  const missed = (opened: string[]) => {
    const w = sweep([{ status: 'approved' }]);
    w.prisma.checkIn.findMany = jest.fn(async () => opened.map((d, i) => ({ id: `m${i}`, sessionNumber: 5 - i, createdAt: new Date(d), availableFrom: null })));
    return w;
  };

  it('is sent after three missed check-ins that opened while they were there', async () => {
    const { service, email } = missed(['2026-07-01T08:00:00Z', '2026-07-08T08:00:00Z', '2026-07-15T08:00:00Z']);
    await (service as any).checkAndSendConsecutiveAbsenceReminder('http://x', 'pY', 'yemi@x.test', 'Yemi', 'Sales');
    expect(email.sendAbsenceReminder).toHaveBeenCalledTimes(1);
  });

  it('is not sent when those check-ins opened while they were on leave', async () => {
    const { service, email, prisma } = missed(['2026-09-28T08:00:00Z', '2026-09-29T08:00:00Z', '2026-09-30T00:00:00Z']);
    await (service as any).checkAndSendConsecutiveAbsenceReminder('http://x', 'pY', 'yemi@x.test', 'Yemi', 'Sales');
    expect(prisma.checkIn.findMany).toHaveBeenCalled();
    expect(email.sendAbsenceReminder).not.toHaveBeenCalled();
  });
});
