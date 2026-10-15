import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';
import { afterTheKindOfCheckInIsDecided } from './where-a-review-stands';

/**
 * WHERE EACH REVIEW STANDS, AS EACH READER READS IT (item 16; docs/prototype/screens/E-suites/suite-reviews.txt).
 *
 * Baridi Appliances, 2 October 2026. Reviews are every 6 months and "Their manager" writes each one.
 * Wairimu leads Sales and manages Aisha, Miriam and Kwame. Grace is an admin who takes part in none of
 * their check-ins. Aisha has had check-ins since April, so six months to draw on. Miriam has none yet.
 * Kwame's "Kwame, first 90 days" is still open, so his review waits for it to be decided, as the
 * prototype's "After his 90 days are decided." Aisha's own review is started.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-10-02T09:00:00Z');
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-kwame': 'MEMBER' };
const p = (u: string, ext: string, name: string, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department: 'Sales', managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'p-wairimu'),
  p('u-kwame', 'p-kwame', 'Kwame Boateng', 'p-wairimu'),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function setup() {
  const dues = [
    { id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2026-10-20') },
    { id: 'd-miriam', organizationId: ORG, personExternalId: 'p-miriam', dueOn: d('2026-10-20') },
    { id: 'd-kwame', organizationId: ORG, personExternalId: 'p-kwame', dueOn: d('2026-10-20') },
  ];
  const reviews: any[] = [];
  const kwames = {
    id: 'g-kwame', label: 'Kwame, first 90 days', organizationId: ORG, scenario: 'NEW_HIRE', status: 'ACTIVE',
    participants: [
      { id: 'pp-w', userId: 'u-wairimu', partyType: 'INITIATOR', managingOnly: false, createdAt: d('2026-07-01') },
      { id: 'pp-k', userId: 'u-kwame', partyType: 'PARTICIPANT', managingOnly: false, createdAt: d('2026-07-01') },
    ],
  };
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
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
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => where.evaluationDueId.in.includes(r.evaluationDueId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-${reviews.length + 1}`, startedAt: d('2026-10-02'), decidedAt: null, ...data }; reviews.push(r); return { id: r.id }; }),
    },
    ground: {
      findMany: jest.fn(async ({ where }: any) => [kwames].filter((g) =>
        where.scenario.in.includes(g.scenario) && !where.status.notIn.includes(g.status)
        && g.participants.some((x) => where.participants.some.userId.in.includes(x.userId)))),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => [
        { userId: 'u-aisha', createdAt: d('2026-04-01') },
        { userId: 'u-aisha', createdAt: d('2026-08-15') },
        { userId: 'u-kwame', createdAt: d('2026-07-01') },
      ].filter((r) => where.userId.in.includes(r.userId))),
    },
    resolution: { findMany: jest.fn(async () => []) },
  };
  const svc = new ReviewsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, kwames };
}

const rows = (b: any) => b.next.map((x: any) => [x.name, x.stands, x.standsSays, x.mayStart]);

describe('where each review stands', () => {
  it('Wairimu, who writes them and runs Kwame’s first 90 days, reads it in the prototype’s words', async () => {
    const { svc, as } = setup();
    expect(rows(await svc.board(as('u-wairimu'), TODAY))).toEqual([
      ['Aisha Otieno', 'ready', 'Ready to start. 6 months of check-ins to draw on.', true],
      ['Miriam Wanjiku', 'ready', 'Ready to start.', true],
      ['Kwame Boateng', 'not-yet', 'After “Kwame, first 90 days” is decided.', false],
    ]);
  });

  /* Changed by decision 93, row 20. This pinned "After a check-in about Kwame is decided.", the wording Hafsah replaced with the prototype's, said with the name and no he or she. */
  it('Grace, an admin who is not in Kwame’s check-in, is not told its title, and reads the kind of check-in in its own words', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(rows(b)[2]).toEqual(['Kwame Boateng', 'not-yet', 'After Kwame’s 90 days are decided.', false]);
    expect(JSON.stringify(b)).not.toMatch(/first 90 days/);
    expect(JSON.stringify(b)).not.toMatch(/\b(his|her|he|she)\b/i);
  });

  it('says every kind of check-in in its own words, with the name and never a he or a she', () => {
    expect(['NEW_HIRE', 'PIP', 'CONTRACT_RENEWAL', 'RECOGNITION', 'SOMETHING_ELSE', null].map((k) => afterTheKindOfCheckInIsDecided(k, 'Kwame'))).toEqual([
      'After Kwame’s 90 days are decided.',
      'After Kwame’s performance plan is decided.',
      'After Kwame’s contract renewal is decided.',
      'After the recognition round for Kwame is decided.',
      'After the check-in about Kwame is decided.',
      'After the check-in about Kwame is decided.',
    ]);
  });

  it('Kwame’s review cannot be started while his first 90 days are open, and can once they are decided', async () => {
    const { svc, as, kwames } = setup();
    await expect(svc.start(as('u-wairimu'), 'd-kwame')).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.notYet));
    kwames.status = 'RESOLVED';
    expect(rows(await svc.board(as('u-wairimu'), TODAY))[2]).toEqual(['Kwame Boateng', 'ready', 'Ready to start. 3 months of check-ins to draw on.', true]);
    await expect(svc.start(as('u-wairimu'), 'd-kwame')).resolves.toEqual({ id: expect.any(String) });
  });

  it('once started, every reader of the board reads that the person can read it and add their view', async () => {
    const { svc, as } = setup();
    await svc.start(as('u-wairimu'), 'd-aisha');
    for (const reader of ['u-wairimu', 'u-grace']) {
      expect(rows(await svc.board(as(reader), TODAY))[0]).toEqual(['Aisha Otieno', 'started', 'Started on 2 October 2026. Aisha can read it and add a view of their own.', false]);
    }
  });

  it('Aisha and Kwame, the people reviewed, are refused the board, so neither reads another decision about them there', async () => {
    const { svc, as } = setup();
    await expect(svc.board(as('u-aisha'), TODAY)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads));
    await expect(svc.board(as('u-kwame'), TODAY)).rejects.toThrow(ForbiddenException);
  });
});
