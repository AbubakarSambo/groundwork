import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';

/**
 * PERFORMANCE REVIEWS, AS EACH PERSON IS SERVED THEM (E4, U.17; decisions rule 6).
 *
 * Baridi Appliances, 27 September 2026. Reviews are every 6 months, and "Their manager" writes each
 * one with the person. Aisha's and Miriam's reviews fall due on 1 March 2027 (the organisation's own
 * system said so, through the table the daily reminder reads). Otieno's, in Operations, too.
 * Wairimu leads Sales and manages Aisha and Miriam. Kamau leads Operations and manages nobody here.
 * Grace is an admin. Tomas is a guest. Aisha's review is started, and the engine has written what it
 * noticed, including one line with a mark nobody may read, which must never be served.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - nobody reads anything while the suite is off;
 *   - an admin reads every review; a lead only their own team's; the writer starts, writes and decides;
 *   - the person reads the facts, their own view and the decision with its reasons, and writes their
 *     own view; never the manager's words before Hafsah decides, never a verdict or a label;
 *   - a colleague and a guest are refused;
 *   - no label on anybody, for any reader; hours and leave never feed a review.
 */

const ORG = 'org-baridi';
const TODAY = new Date('2026-09-27T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER', 'u-otieno': 'MEMBER', 'u-tomas': 'GUEST',
};
const p = (u: string | null, ext: string, name: string, department: string | null, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Finance', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-kamau', 'p-kamau', 'Kamau Njenga', 'Operations', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'Sales', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'Sales', 'p-wairimu'),
  p('u-otieno', 'p-otieno', 'Otieno Ouma', 'Operations', null),
];
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function setup(opts: { on?: boolean } = {}) {
  const dues = [
    { id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: d('2027-03-01'), kind: 'six-monthly' },
    { id: 'd-miriam', organizationId: ORG, personExternalId: 'p-miriam', dueOn: d('2027-03-01'), kind: 'six-monthly' },
    { id: 'd-otieno', organizationId: ORG, personExternalId: 'p-otieno', dueOn: d('2027-03-15'), kind: 'six-monthly' },
  ];
  const reviews: any[] = [{
    id: 'r-aisha', organizationId: ORG, evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu',
    managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
    theirView: null, decision: null, decisionReasons: null, decidedAt: null,
    noticed: [
      { says: 'Says supermarkets take longer than butcheries. Nothing proves this yet.', mark: 'said' },
      { says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' },
      { says: 'Rated low on specificity.', mark: 'rating' },
      { says: 'Kept 41 of 44 things she said she would do.', mark: 'proven' },
    ],
    noticedPromptVersionId: 'pv-1',
  }];
  let n = 0;
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async ({ where }: any) =>
      where.organizationId_suite.organizationId === ORG && where.organizationId_suite.suite === 'reviews'
        ? { isOn: opts.on ?? true, answers: { every: 'Every 6 months', writer: 'Their manager' } } : null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => {
      const { userId, organizationId } = where.userId_organizationId;
      return organizationId === ORG && roles[userId] ? { role: roles[userId] } : null;
    }) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null),
    },
    evaluationDue: {
      findMany: jest.fn(async ({ where }: any) => dues.filter((x) => x.organizationId === where.organizationId)),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
      create: jest.fn(async ({ data }: any) => { const x = { id: `d-new-${dues.length}`, ...data }; dues.push(x); return x; }),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => where.evaluationDueId.in.includes(r.evaluationDueId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-new-${++n}`, managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, noticed: null, ...data }; reviews.push(r); return { id: r.id }; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
  };
  const svc = new ReviewsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, reviews };
}

const LABELS = /\b(PIP|performance improvement plan|exit|at[- ]risk|low[- ]performer|underperform\w*|verdict|rating|rated|specificity|score)\b/i;

describe('while the suite is off', () => {
  it('nobody reads or writes anything', async () => {
    const { svc, as } = setup({ on: false });
    await expect(svc.board(as('u-grace'), TODAY)).rejects.toThrow(new NotFoundException(REVIEW_REFUSED.notOn));
    await expect(svc.one(as('u-aisha'), 'r-aisha')).rejects.toThrow(NotFoundException);
  });
});

describe('the next reviews', () => {
  it('Grace, an admin, reads all of them, who each is written with, and where each stands', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.every).toBe('Every 6 months');
    expect(b.next.map((x) => [x.name, x.writtenWith, x.dueOn, x.stands, x.mayStart])).toEqual([
      ['Aisha Otieno', 'Wairimu Kamau', '2027-03-01', 'started', false],
      ['Miriam Wanjiku', 'Wairimu Kamau', '2027-03-01', 'ready', false],
      ['Otieno Ouma', null, '2027-03-15', 'ready', true],
    ]);
  });

  it('Wairimu reads her team’s, and starts the ones she writes', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-wairimu'), TODAY);
    expect(b.next.map((x) => [x.name, x.mayStart])).toEqual([['Aisha Otieno', false], ['Miriam Wanjiku', true]]);
    const { id } = await svc.start(as('u-wairimu'), 'd-miriam');
    expect((await svc.board(as('u-wairimu'), TODAY)).next.find((x) => x.name === 'Miriam Wanjiku')).toMatchObject({ stands: 'started', reviewId: id });
    await expect(svc.start(as('u-wairimu'), 'd-miriam')).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.alreadyStarted));
  });

  it('Kamau reads Operations’ only, and nobody but the writer starts one', async () => {
    const { svc, as } = setup();
    expect((await svc.board(as('u-kamau'), TODAY)).next.map((x) => [x.name, x.mayStart])).toEqual([['Otieno Ouma', false]]);
    await expect(svc.start(as('u-kamau'), 'd-otieno')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyTheWriter));
    await expect(svc.start(as('u-grace'), 'd-miriam')).rejects.toThrow(ForbiddenException);
  });

  it('a review can start today for anyone the reader writes for, with nothing due (polish round 1, 26 October 2026)', async () => {
    const { svc, as } = setup();
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.startNow.map((x) => x.name)).toEqual(['Kamau Njenga', 'Wairimu Kamau']);
    expect((await svc.board(as('u-wairimu'), TODAY)).startNow).toEqual([]);
    expect((await svc.board(as('u-kamau'), TODAY)).startNow).toEqual([]);
    const { id } = await svc.startNow(as('u-grace'), 'p-kamau');
    expect(id).toMatch(/^r-new-/);
    expect((await svc.board(as('u-grace'), TODAY)).startNow.map((x) => x.name)).toEqual(['Wairimu Kamau']);
    await expect(svc.startNow(as('u-kamau'), 'p-wairimu')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyTheWriter));
  });

  it('a member and a guest are refused the board', async () => {
    const { svc, as } = setup();
    await expect(svc.board(as('u-aisha'), TODAY)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads));
    await expect(svc.board(as('u-tomas'), TODAY)).rejects.toThrow(ForbiddenException);
  });
});

describe('one review, as each reader reads it', () => {
  it('Wairimu, who writes it, reads all of it: what Groundwork noticed, proof first, her words and Aisha’s view', async () => {
    const { svc, as } = setup();
    const r: any = await svc.one(as('u-wairimu'), 'r-aisha');
    expect(r).toMatchObject({ reader: 'writer', name: 'Aisha Otieno', firstName: 'Aisha', writtenWithFirstName: 'Wairimu', dueOn: '2027-03-01', mayWrite: true });
    expect(r.noticed).toEqual([
      { says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' },
      { says: 'Kept 41 of 44 things she said she would do.', mark: 'proven' },
      { says: 'Says supermarkets take longer than butcheries. Nothing proves this yet.', mark: 'said' },
    ]);
    expect(r.managersWords).toBe('Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.');
  });

  it('Grace, an admin, reads it without writing it', async () => {
    const { svc, as } = setup();
    expect(await svc.one(as('u-grace'), 'r-aisha')).toMatchObject({ reader: 'admin', mayWrite: false });
    await expect(svc.writeWords(as('u-grace'), 'r-aisha', 'x')).rejects.toThrow(ForbiddenException);
  });

  /* Changed by decision 93, row 15. This pinned "and not Wairimu’s words", the restriction Hafsah removed: she now reads them, and both views side by side. */
  it('Aisha reads the facts, her own view, Wairimu’s words beside it, and the decision with its reasons', async () => {
    const { svc, as } = setup();
    await svc.writeView(as('u-aisha'), 'r-aisha', ' I want to lead the supermarket accounts, but I need faster stock. ');
    await svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid, and helped two others.' });
    const r = await svc.one(as('u-aisha'), 'r-aisha');
    expect(r).toEqual({
      reader: 'person', id: 'r-aisha', firstName: 'Aisha', writtenWithFirstName: 'Wairimu', writerFirstName: 'Wairimu', dueOn: '2027-03-01',
      noticed: [
        { says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' },
        { says: 'Kept 41 of 44 things she said she would do.', mark: 'proven' },
        { says: 'Says supermarkets take longer than butcheries. Nothing proves this yet.', mark: 'said' },
      ],
      /* A review started before the record was read for it (build step 12) has none, and says so by null. */
      record: null,
      theirView: 'I want to lead the supermarket accounts, but I need faster stock.',
      managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
      /* Added by request 162, item 6: who wrote the words. This review's words were set without an author, so none is named. */
      managersWordsById: null,
      managersWordsHeading: 'What Wairimu writes',
      whereYouDiffer: {
        says: 'Wairimu and you have each written your own view of your work. Here they are side by side, so you can see where they differ before you meet.',
        managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
        yourView: 'I want to lead the supermarket accounts, but I need faster stock.',
      },
      decision: { says: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid, and helped two others.' },
      /* Added by decision 113: once decided, the person may appeal it, and is told to whom it goes. */
      mayAppeal: true,
      mayAppealSays: 'If you disagree with this decision, you can appeal it. An admin other than Wairimu reads the review, your side and your reasons, and decides.',
      appeal: null,
    });
    expect(JSON.stringify(r)).not.toMatch(/pv-1|promptVersion/);
  });

  it('before Aisha has written her view, she reads Wairimu’s words under their heading, and no side-by-side', async () => {
    const { svc, as } = setup();
    const r: any = await svc.one(as('u-aisha'), 'r-aisha');
    expect(r.managersWordsHeading).toBe('What Wairimu writes');
    expect(r.managersWords).toBe('Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.');
    expect(r.theirView).toBeNull();
    expect(r.whereYouDiffer).toBeNull();
    /* The writer's other readers are served what they were: nothing here changes for Wairimu or Grace. */
    expect(((await svc.one(as('u-wairimu'), 'r-aisha')) as any).managersWords).toBe(r.managersWords);
    expect(((await svc.one(as('u-grace'), 'r-aisha')) as any)).not.toHaveProperty('whereYouDiffer');
  });

  it('only the writer writes their words and decides, and a decision needs its reasons', async () => {
    const { svc, as } = setup();
    await expect(svc.writeWords(as('u-aisha'), 'r-aisha', 'I am great')).rejects.toThrow(ForbiddenException);
    await expect(svc.decide(as('u-aisha'), 'r-aisha', { decision: 'x', reasons: 'y' })).rejects.toThrow(ForbiddenException);
    await expect(svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Keep things as they are.' })).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.sayWhatAndWhy));
    await expect(svc.writeWords(as('u-wairimu'), 'r-aisha', '   ')).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.writeSomething));
  });

  it('only the person writes their own view', async () => {
    const { svc, as } = setup();
    await expect(svc.writeView(as('u-wairimu'), 'r-aisha', 'She thinks...')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyThePerson));
  });

  it('Miriam, a colleague, Kamau from another team, and a guest are refused; another organisation finds nothing', async () => {
    const { svc, as } = setup();
    await expect(svc.one(as('u-miriam'), 'r-aisha')).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.notYours));
    await expect(svc.one(as('u-kamau'), 'r-aisha')).rejects.toThrow(ForbiddenException);
    await expect(svc.one(as('u-tomas'), 'r-aisha')).rejects.toThrow(ForbiddenException);
    await expect(svc.one({ userId: 'u-grace', organizationId: 'org-other' }, 'r-aisha')).rejects.toThrow(NotFoundException);
  });
});

describe('no label on anybody, for any reader', () => {
  it('nothing any reader is served carries a label, a verdict or a rating', async () => {
    const { svc, as } = setup();
    await svc.decide(as('u-wairimu'), 'r-aisha', { decision: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' });
    const served = [
      await svc.board(as('u-grace'), TODAY), await svc.board(as('u-wairimu'), TODAY), await svc.board(as('u-kamau'), TODAY),
      await svc.one(as('u-grace'), 'r-aisha'), await svc.one(as('u-wairimu'), 'r-aisha'), await svc.one(as('u-aisha'), 'r-aisha'),
    ];
    for (const x of served) expect(JSON.stringify(x)).not.toMatch(LABELS);
  });

  it('hours and leave never feed a review: the service reads neither', () => {
    const code = readFileSync(join(__dirname, 'the-reviews.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\b(timeEntry|timeWeek|timeAgreement|leaveRequest)\b/);
    expect(code).toMatch(/\bperformanceReview\b/);
  });
});
