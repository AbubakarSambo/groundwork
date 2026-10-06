import { RemindService } from '../conversation/remind.service';
import { theLeadsFirstWords } from './the-leads-own-first-check-in';
import { ENGAGEMENT_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * JOURNEY 1: THE LEAD WHO MADE A CHECK-IN AND ADDED NOBODY (decision 109; spec sections 4 and 10), AS WAIRIMU READS IT.
 *
 * Wairimu set up "Sales team, Q4" five days ago, with a brief, and has not added anybody or answered. The morning sweep reaches day 3. She is sent one
 * message that starts from her brief, says she needs nothing else, and asks for three people. Where she HAS added people, she is chased about her own
 * answer like anybody else, and nobody is sent this.
 */
const NOW = new Date('2026-10-20T08:00:00.000Z');

function sweep(othersAdded: boolean, opts: { madeAt?: Date; told?: boolean; outcome?: 'sent' | 'held' | 'suppressed' } = {}) {
  const once = new Set<string>(opts.told ? ['engagement.once.lead-first:g1'] : []);
  const updates: any[] = [];
  const lead = { email: 'wairimu@x.test', firstName: 'Wairimu' };
  const ground = { label: 'Sales team, Q4', organizationId: 'org', initiatorId: 'u-w', createdAt: opts.madeAt ?? new Date('2026-10-15T08:00:00.000Z'), brief: 'Why we keep missing the Q4 sales target.', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, initiator: lead };
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
    groundParticipant: { findMany: jest.fn(async () => round), update: jest.fn(async (a: any) => { updates.push(a); return {}; }), findUnique: jest.fn(async () => null) },
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === ENGAGEMENT_MOMENT_KEY ? { value: { at: '2026-10-01T00:00:00Z' } } : once.has(where.key) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { once.add(data.key); return data; }),
    },
    scheduledEmail: { findFirst: jest.fn(async () => null) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const email: any = {
    sendLeadFirstCheckIn: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); return opts.outcome ?? 'sent'; }),
    sendNudge: jest.fn(async (to: string) => { nudges.push(to); }),
    sendWhoHasNotStarted: jest.fn(async () => undefined),
    sendAbsenceReminder: jest.fn(async () => ({})),
    buildCheckInUrl: (id: string) => `https://app.test/checkin/${id}`,
    frontendUrl: 'https://app.test',
  };
  return { service: new RemindService(prisma, email, { tell: async () => [] } as any), sent, nudges, once, updates };
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

describe('existing check-ins, and the things that stop it', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('a check-in made before the engagement messages began keeps the chase it always had', async () => {
    const w = sweep(false, { madeAt: new Date('2026-09-20T08:00:00.000Z') });
    await w.service.sendScheduledNudges();
    expect(w.sent).toEqual([]);
    expect(w.nudges).toEqual(['wairimu@x.test']);
  });
  it('is sent once per check-in, and not again', async () => {
    const w = sweep(false);
    await w.service.sendScheduledNudges();
    expect(w.once.has('engagement.once.lead-first:g1')).toBe(true);
    const again = sweep(false, { told: true });
    await again.service.sendScheduledNudges();
    expect(again.sent).toEqual([]);
    expect(again.nudges).toEqual([]);
  });
  it('is not recorded as sent when it was refused, and her chase day is not used up', async () => {
    const w = sweep(false, { outcome: 'suppressed' });
    await w.service.sendScheduledNudges();
    expect(w.once.size).toBe(0);
    expect(w.updates).toEqual([]);
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

describe('the lead turned nudges off', () => {
  it('the first-check-in message is governed by that switch', async () => {
    const { whetherToSend } = await import('../email/nothing-goes-out-that-was-turned-off');
    expect(whetherToSend('we decided to send it', { wantsNudges: false }, 'sendLeadFirstCheckIn')).toMatchObject({ send: false });
    expect(whetherToSend('we decided to send it', { wantsNudges: true }, 'sendLeadFirstCheckIn')).toEqual({ send: true });
  });
});
