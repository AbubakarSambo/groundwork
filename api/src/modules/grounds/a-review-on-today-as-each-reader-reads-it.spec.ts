import { WhatNeedsYouService } from './what-needs-you.service';
import { ReviewsService } from '../suites/the-reviews.service';

/**
 * A PERFORMANCE REVIEW ON TODAY, AS EACH READER READS IT (item 16).
 *
 * Baridi Appliances, on Friday 2 October 2026. Wairimu leads Sales and manages Aisha and Miriam. Juma
 * leads Logistics and manages Baraka and Kwame. Grace is an admin. The suite says reviews are written
 * with "Their manager".
 *   - Aisha's review (15 October) was started by Wairimu.
 *   - Miriam's review (8 October) is only proposed by Groundwork; nobody has said yes.
 *   - Baraka's review (6 October) is set by the organisation's own system and not started.
 *   - Kwame's review (20 November) is not due for weeks.
 *
 * The reviews service and Today are the real ones; the database is pretend. What is checked is the
 * text each reader is handed on Today, and where it takes them.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-juma': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-baraka': 'MEMBER', 'u-kwame': 'MEMBER' };
const p = (u: string, ext: string, name: string, department: string, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, email: null, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Office', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-juma', 'p-juma', 'Juma Mwangi', 'Logistics', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'Sales', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'Sales', 'p-wairimu'),
  p('u-baraka', 'p-baraka', 'Baraka Odhiambo', 'Logistics', 'p-juma'),
  p('u-kwame', 'p-kwame', 'Kwame Boateng', 'Logistics', 'p-juma'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const CONTENTS = /Paystack|strongest closer|butcheries|supermarket/;

function setup(opts: { on?: boolean; decided?: boolean } = {}) {
  const dues = [
    { id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2026-10-15'), source: null },
    { id: 'd-miriam', organizationId: ORG, personExternalId: 'p-miriam', dueOn: d('2026-10-08'), source: 'groundwork:a-check-in-ended' },
    { id: 'd-baraka', organizationId: ORG, personExternalId: 'p-baraka', dueOn: d('2026-10-06'), source: 'hr-system' },
    { id: 'd-kwame', organizationId: ORG, personExternalId: 'p-kwame', dueOn: d('2026-11-20'), source: 'hr-system' },
  ];
  const reviews: any[] = [{
    id: 'r-aisha', organizationId: ORG, evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu', startedAt: d('2026-10-01'),
    managersWords: 'Aisha is our strongest closer with butcheries.', theirView: null,
    decision: opts.decided ? 'Aisha leads the supermarket accounts from April.' : null,
    decisionReasons: opts.decided ? 'She closed 9 sales, all paid.' : null,
    decidedAt: opts.decided ? d('2026-10-02') : null,
    noticed: [{ says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' }],
  }];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ awaitingOrgApproval: false })) },
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: opts.on ?? true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] ?? 'MEMBER' })) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null),
    },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => r.organizationId === where.organizationId
        && (!where.personExternalId || r.personExternalId === where.personExternalId)
        && (!where.evaluationDueId || where.evaluationDueId.in.includes(r.evaluationDueId)))),
    },
    ground: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
  };
  const grounds: any = { list: jest.fn(async () => []), listAwaitingApproval: jest.fn(async () => []) };
  const today = new WhatNeedsYouService(prisma, grounds, undefined, undefined, undefined, new ReviewsService(prisma));
  const read = async (userId: string) => {
    const r = await today.forReader(userId, `${userId}@baridi.test`, ORG, roles[userId]);
    return r.needs.map((n) => ({ says: [n.title, n.detail].filter(Boolean).join(' '), to: n.action.to, label: n.action.label, kind: n.kind }));
  };
  return { read };
}

beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-10-02T09:00:00.000Z'), advanceTimers: true }); });
afterAll(() => { jest.useRealTimers(); });

describe('a performance review, on Today', () => {
  it('Aisha reads that Wairimu has started her review, in the suite\'s own words, with the way to it', async () => {
    const { read } = setup();
    expect(await read('u-aisha')).toEqual([{
      says: 'Wairimu has started your review. You can read it and add your own view before you meet.',
      to: '/suite/reviews', label: 'Read it', kind: 'look',
    }]);
  });

  it('once Wairimu has decided, Aisha reads that, and nothing of the decision itself', async () => {
    const { read } = setup({ decided: true });
    const aisha = await read('u-aisha');
    expect(aisha.map((n) => n.says)).toEqual(['Wairimu has decided your review. You can read the decision and the reasons.']);
    expect(JSON.stringify(aisha)).not.toMatch(CONTENTS);
  });

  it('Miriam, whose review Groundwork only proposed, reads nothing about it', async () => {
    const { read } = setup();
    expect(await read('u-miriam')).toEqual([]);
  });

  it('Wairimu, who writes them, reads the reviews ready for her to start, and not the one already started', async () => {
    const { read } = setup();
    expect(await read('u-wairimu')).toEqual([{
      says: 'Miriam’s review is ready for you to start. Groundwork suggests a review for Miriam, because a check-in about Miriam’s work has ended. Nothing is sent to Miriam unless you say yes.',
      to: '/suite/reviews', label: 'Look at it', kind: 'decide',
    }]);
    /* One apostrophe in one item: the prototype's screens write ’ everywhere, so a straight one never sits beside it. */
    expect((await read('u-wairimu'))[0].says).not.toMatch(/'/);
  });

  it('Juma, another lead, reads only his own team\'s, and only the one due soon', async () => {
    const { read } = setup();
    const juma = await read('u-juma');
    expect(juma.map((n) => n.says)).toEqual(['Baraka’s review is ready for you to start. It is due on Tuesday 6 October.']);
    expect(JSON.stringify(juma)).not.toMatch(/Aisha|Miriam|Kwame/);
  });

  it('Grace, an admin who does not write these reviews, reads none of them', async () => {
    const { read } = setup();
    expect(await read('u-grace')).toEqual([]);
  });

  it('nobody reads anything of a review\'s contents on Today', async () => {
    const { read } = setup();
    for (const u of Object.keys(roles)) expect(JSON.stringify(await read(u))).not.toMatch(CONTENTS);
  });

  it('while the suite is off, nobody is told anything and Today still opens', async () => {
    const { read } = setup({ on: false });
    for (const u of Object.keys(roles)) expect(await read(u)).toEqual([]);
  });
});
