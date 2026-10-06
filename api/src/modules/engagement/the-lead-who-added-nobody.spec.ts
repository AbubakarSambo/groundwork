import { RemindService } from '../conversation/remind.service';
import { theLeadsFirstWords } from './the-leads-own-first-check-in';

/**
 * JOURNEY 1: THE LEAD WHO MADE A CHECK-IN AND ADDED NOBODY (decision 109; spec sections 4 and 10), AS WAIRIMU READS IT.
 *
 * Wairimu set up "Sales team, Q4" five days ago, with a brief, and has not added anybody or answered. The morning sweep reaches day 3. She is sent one
 * message that starts from her brief, says she needs nothing else, and asks for three people. Where she HAS added people, she is chased about her own
 * answer like anybody else, and nobody is sent this.
 */
const NOW = new Date('2026-10-20T08:00:00.000Z');

function sweep(othersAdded: boolean) {
  const lead = { email: 'wairimu@x.test', firstName: 'Wairimu' };
  const ground = { label: 'Sales team, Q4', organizationId: 'org', initiatorId: 'u-w', brief: 'Why we keep missing the Q4 sales target.', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };
  const row = {
    id: 'c1', createdAt: new Date('2026-10-15T08:00:00.000Z'), sessionNumber: 1, availableFrom: null, participantId: 'p-w', groundId: 'g1', leadToldAt: null, ground,
    participant: { id: 'p-w', email: lead.email, userId: 'u-w', lastNudgedAt: null, user: { firstName: 'Wairimu', emailNotifications: true, isActive: true, deletedAt: null } },
  };
  const round = [
    { id: 'p-w', userId: 'u-w', managingOnly: false, user: { isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: [{ status: 'NOT_STARTED', createdAt: row.createdAt }] },
    ...(othersAdded ? [{ id: 'p-o', userId: 'u-o', managingOnly: false, user: { isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: [{ status: 'NOT_STARTED', createdAt: row.createdAt }] }] : []),
  ];
  const sent: any[] = [];
  const nudges: string[] = [];
  const prisma: any = {
    checkIn: { findMany: jest.fn(async (a: any) => (a.where?.status === 'NOT_STARTED' && a.select?.leadToldAt ? [row] : [])) },
    groundParticipant: { findMany: jest.fn(async () => round), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const email: any = {
    sendLeadFirstCheckIn: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); }),
    sendNudge: jest.fn(async (to: string) => { nudges.push(to); }),
    sendWhoHasNotStarted: jest.fn(async () => undefined),
    sendAbsenceReminder: jest.fn(async () => ({})),
    buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}`,
    frontendUrl: 'https://app.test',
  };
  return { service: new RemindService(prisma, email, { tell: async () => [] } as any), sent, nudges };
}

describe('Wairimu, with nobody else in it', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('reads her brief and one next step, and is not told she has an invitation', async () => {
    const w = sweep(false);
    await w.service.sendScheduledNudges();
    expect(w.nudges).toEqual([]);
    expect(w.sent).toEqual([{
      to: 'wairimu@x.test',
      subject: 'You set up "Sales team, Q4", and nobody else is in it yet',
      lines: [
        'Hello Wairimu. You set up "Sales team, Q4", and nobody else has been added to it yet.',
        'What you told Groundwork you wanted was: "Why we keep missing the Q4 sales target".',
        'You do not need to set anything else up. Add the people involved, starting with three, and Groundwork will take it from there.',
      ],
      linkLabel: 'Add the people involved',
      linkUrl: 'https://app.test/grounds/g1',
    }]);
    expect(JSON.stringify(w.sent)).not.toMatch(/invit|complete your setup|Your check-in is waiting/i);
  });

  it('with others added, she is chased about her own answer as anybody is, and not sent this', async () => {
    const w = sweep(true);
    await w.service.sendScheduledNudges();
    expect(w.sent).toEqual([]);
    expect(w.nudges).toEqual(['wairimu@x.test']);
  });
});

describe('the words with no brief', () => {
  it('leave out what she did not say and never invent it', () => {
    const w = theLeadsFirstWords('Wairimu', 'Kenya launch', '');
    expect(w.lines).toEqual([
      'Hello Wairimu. You set up "Kenya launch", and nobody else has been added to it yet.',
      'You do not need to set anything else up. Add the people involved, starting with three, and Groundwork will take it from there.',
    ]);
  });
});
