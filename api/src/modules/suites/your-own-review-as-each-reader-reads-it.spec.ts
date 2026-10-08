import { NotFoundException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';

/**
 * THE PERSON FINDS THEIR OWN REVIEW (item 16; the prototype: "Aisha sees it before the meeting").
 *
 * Baridi Appliances. Wairimu manages Aisha and Miriam. Grace is an admin. Aisha's review is started by
 * Wairimu; Miriam's is only proposed by Groundwork and nobody has said yes. Each reader asks for "the
 * reviews about you", and each reads only their own, in plain sentences, and nothing of the review's
 * contents: no line of what Groundwork noticed, no word Wairimu wrote, no decision.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER' };
const p = (u: string, ext: string, name: string, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department: 'Sales', managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'p-wairimu'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function setup(opts: { on?: boolean } = {}) {
  const dues = [
    { id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2027-03-01'), source: null },
    { id: 'd-miriam', organizationId: ORG, personExternalId: 'p-miriam', dueOn: d('2027-03-01'), source: 'groundwork:the-organisations-date' },
  ];
  const reviews: any[] = [{
    id: 'r-aisha', organizationId: ORG, evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu',
    managersWords: 'Aisha is our strongest closer with butcheries.', theirView: null, decision: null, decisionReasons: null, decidedAt: null,
    noticed: [{ says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' }],
  }];
  const prisma: any = {
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
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
  };
  const svc = new ReviewsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as };
}

describe('the reviews about you', () => {
  it('Aisha reads that Wairimu has started her review, and what she can do now', async () => {
    const { svc, as } = setup();
    expect(await svc.mine(as('u-aisha'))).toEqual([{
      id: 'r-aisha', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'started',
      says: 'Wairimu has started your review. You can read it and add your own view before you meet.',
      /* Added by decision 113: nothing to appeal before the review is decided. */
      mayAppeal: false, appealStands: null, appealSays: null,
    }]);
  });

  it('once she has added her view, and once Wairimu has decided, the sentence says so', async () => {
    const { svc, as } = setup();
    await svc.writeView(as('u-aisha'), 'r-aisha', 'I want to lead the supermarket accounts, but I need faster stock.');
    expect((await svc.mine(as('u-aisha')))[0].says).toBe('Wairimu has started your review, and your own view is in it. You can read it and change your view before you meet.');
    await svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect((await svc.mine(as('u-aisha')))[0]).toMatchObject({ stands: 'decided', says: 'Wairimu has decided your review. You can read the decision and the reasons.' });
  });

  it('nothing of the review is in it: no noticed line, no word Wairimu wrote, no decision', async () => {
    const { svc, as } = setup();
    await svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    expect(JSON.stringify(await svc.mine(as('u-aisha')))).not.toMatch(/Paystack|strongest closer|supermarket|9 sales/);
  });

  it('Miriam, whose review Groundwork only proposed, is told nothing until Wairimu says yes', async () => {
    const { svc, as } = setup();
    expect(await svc.mine(as('u-miriam'))).toEqual([]);
  });

  it('Wairimu and Grace read only reviews about themselves here, which is none', async () => {
    const { svc, as } = setup();
    expect(await svc.mine(as('u-wairimu'))).toEqual([]);
    expect(await svc.mine(as('u-grace'))).toEqual([]);
  });

  it('while the suite is off, nobody is told anything', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.mine(as('u-aisha'))).rejects.toThrow(new NotFoundException(REVIEW_REFUSED.notOn));
  });
});
