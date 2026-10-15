import { ReviewsService } from './the-reviews.service';
import { PROPOSED_RECOGNISE_SETTING, RECOGNISE_SETTING_KEY, readRecogniseSetting } from './a-review-may-suggest-recognising';

/**
 * "GROUNDWORK SUGGESTS RECOGNISING AISHA’S WORK", AS EACH READER READS IT (item 16; the prototype's
 * docs/prototype/screens/E-suites/suite-reviews.txt, and decision 6, "Good suggestions work the same way").
 *
 * Baridi Appliances. Wairimu writes Aisha's review, started on 1 October 2026. In the four weeks before,
 * in "Aisha, weekly", which Wairimu runs, Aisha settled 10 commitments and kept 9. In "Stock meeting",
 * which Kamau runs, she missed 3: that is not Wairimu's to read, and is not counted. One more was kept
 * after the review started, and is not counted either, so the review reads the same whenever it is opened.
 * Grace is an admin.
 *
 * The setting is off unless it is stored as on, and while it is off nobody reads anything of it.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-aisha': 'MEMBER', 'u-leila': 'LEAD', 'u-omar': 'LEAD', 'u-guest': 'GUEST' };
const directory = [
  { externalId: 'p-grace', linkedUserId: 'u-grace', displayName: 'Grace Achieng', givenName: 'Grace', familyName: 'Achieng', department: 'Finance', managerExternalId: null, active: true },
  { externalId: 'p-wairimu', linkedUserId: 'u-wairimu', displayName: 'Wairimu Kamau', givenName: 'Wairimu', familyName: 'Kamau', department: 'Sales', managerExternalId: null, active: true },
  { externalId: 'p-leila', linkedUserId: 'u-leila', displayName: 'Leila Hassan', givenName: 'Leila', familyName: 'Hassan', department: 'Sales', managerExternalId: null, active: true },
  { externalId: 'p-omar', linkedUserId: 'u-omar', displayName: 'Omar Ali', givenName: 'Omar', familyName: 'Ali', department: 'Operations', managerExternalId: null, active: true },
  { externalId: 'p-aisha', linkedUserId: 'u-aisha', displayName: 'Aisha Otieno', givenName: 'Aisha', familyName: 'Otieno', department: 'Sales', managerExternalId: 'p-wairimu', active: true },
];
const STARTED = new Date('2026-10-01T09:00:00Z');
const daysBefore = (n: number) => new Date(STARTED.getTime() - n * 86_400_000);

function setup(opts: { setting?: unknown; theirView?: string | null; startedDaysAgo?: number } = {}) {
  const startedAt = opts.startedDaysAgo === undefined ? new Date() : new Date(Date.now() - opts.startedDaysAgo * 86_400_000);
  /* The commitments are dated against STARTED; the review's own start is moved only to test the three days. */
  const shift = startedAt.getTime() - STARTED.getTime();
  const at = (d: Date) => new Date(d.getTime() + shift);
  const commitments = [
    ...Array.from({ length: 9 }, (_, i) => ({ participantId: 'pp-a-weekly', status: 'DONE', createdAt: at(daysBefore(25)), settledAt: at(daysBefore(20 - i)) })),
    { participantId: 'pp-a-weekly', status: 'NOT_DONE', createdAt: at(daysBefore(25)), settledAt: at(daysBefore(3)) },
    { participantId: 'pp-a-weekly', status: 'DONE', createdAt: at(daysBefore(2)), settledAt: at(daysBefore(-1)) },
    ...Array.from({ length: 3 }, () => ({ participantId: 'pp-a-stock', status: 'NOT_DONE', createdAt: at(daysBefore(20)), settledAt: at(daysBefore(10)) })),
  ];
  const participants = [
    { id: 'pp-a-weekly', userId: 'u-aisha', managingOnly: false, ground: { organizationId: ORG, initiatorId: 'u-wairimu' } },
    { id: 'pp-a-stock', userId: 'u-aisha', managingOnly: false, ground: { organizationId: ORG, initiatorId: 'u-kamau' } },
  ];
  const review = {
    id: 'r-aisha', organizationId: ORG, evaluationDueId: 'd-aisha', personExternalId: 'p-aisha', startedById: 'u-wairimu', startedAt,
    managersWords: null, theirView: opts.theirView ?? null, decision: null, decisionReasons: null, decidedAt: null, noticed: null,
  };
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] ?? 'MEMBER' })) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null),
    },
    evaluationDue: { findUnique: jest.fn(async () => ({ id: 'd-aisha', dueOn: new Date('2026-10-20T00:00:00Z') })) },
    performanceReview: { findUnique: jest.fn(async () => review) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === RECOGNISE_SETTING_KEY && opts.setting !== undefined ? { value: opts.setting } : null)) },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => participants.filter((x) => x.userId === where.userId && x.ground.organizationId === where.ground.organizationId && x.ground.initiatorId === where.ground.initiatorId)),
    },
    groundCommitment: { findMany: jest.fn(async ({ where }: any) => commitments.filter((c) => where.participantId.in.includes(c.participantId) && where.status.in.includes(c.status))) },
    leaveRequest: { findMany: jest.fn(async () => []) },
  };
  const svc = new ReviewsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as };
}

const ON = { on: true, keptAtLeast: 0.9, atLeastSettled: 8 };

describe('the setting', () => {
  it('is off unless stored as on, and the proposal is nine in ten kept, with at least eight settled', () => {
    expect(PROPOSED_RECOGNISE_SETTING).toEqual({ on: false, keptAtLeast: 0.9, atLeastSettled: 8 });
    expect(readRecogniseSetting(undefined).on).toBe(false);
    expect(readRecogniseSetting({ on: 'yes' }).on).toBe(false);
    expect(readRecogniseSetting({ on: true })).toEqual({ on: true, keptAtLeast: 0.9, atLeastSettled: 8 });
  });

  it('while it is off, nobody reads anything of it, however well the record reads', async () => {
    const { svc, as } = setup({ theirView: 'I want to lead the supermarket accounts.' });
    expect((await svc.one(as('u-wairimu'), 'r-aisha') as any).recognise).toBeNull();
    expect(await svc.one(as('u-aisha'), 'r-aisha')).not.toHaveProperty('recognise');
  });
});

describe('with the setting on', () => {
  it('Aisha reads her own count, from Wairimu’s check-ins only, the line, and who decides', async () => {
    const { svc, as } = setup({ setting: ON });
    expect((await svc.one(as('u-aisha'), 'r-aisha') as any).recognise).toEqual({
      facts: 'In the four weeks before your review started, you kept nine of your ten commitments in your check-ins with Wairimu. When at least nine in ten are kept, Groundwork suggests to Wairimu that your work is recognised.',
      whoDecides: 'Wairimu decides, and you read the reasons.',
    });
  });

  it('Wairimu reads nothing of it until Aisha has had her turn', async () => {
    const { svc, as } = setup({ setting: ON });
    expect((await svc.one(as('u-wairimu'), 'r-aisha') as any).recognise).toBeNull();
  });

  /* Decision 86 reverses decision 53's "a plain line with no count": Wairimu now reads the count behind it. */
  it('once Aisha has written her view, Wairimu reads the suggestion with the count behind it', async () => {
    const { svc, as } = setup({ setting: ON, theirView: 'I want to lead the supermarket accounts, but I need faster stock.' });
    const r: any = await svc.one(as('u-wairimu'), 'r-aisha');
    expect(r.recognise).toEqual({
      headline: 'Groundwork suggests recognising Aisha’s work',
      why: 'Aisha kept nine of the ten commitments made in your check-ins together in the four weeks before this review started. When at least nine in ten are kept, Groundwork suggests recognising the work.',
      whatWouldChangeIt: 'If Aisha keeps fewer than nine in ten of them from now on.',
      yourDecision: 'This is only a suggestion. You decide, and Aisha sees your reasons.',
    });
  });

  it('or three days after the review started, if Aisha has said nothing', async () => {
    const { svc, as } = setup({ setting: ON, startedDaysAgo: 3 });
    expect((await svc.one(as('u-wairimu'), 'r-aisha') as any).recognise).toMatchObject({ headline: 'Groundwork suggests recognising Aisha’s work' });
  });

  /* Changed by decision 93, row 16. These two pinned "reads nothing of it" for an admin and for a lead who does not write the review, the restriction Hafsah removed. */
  const SAME_COUNT = 'Aisha kept nine of the ten commitments made in Wairimu’s check-ins with them in the four weeks before this review started. When at least nine in ten are kept, Groundwork suggests recognising the work.';

  it('Grace, an admin who does not write it, reads the suggestion and the count, with Wairimu named as the one who decides', async () => {
    const { svc, as } = setup({ setting: ON, theirView: 'I want to lead the supermarket accounts.' });
    const r: any = await svc.one(as('u-grace'), 'r-aisha');
    expect(r.reader).toBe('admin');
    expect(r.recognise).toEqual({
      headline: 'Groundwork suggests recognising Aisha’s work',
      why: SAME_COUNT,
      whatWouldChangeIt: 'If Aisha keeps fewer than nine in ten of them from now on.',
      yourDecision: 'This is only a suggestion. Wairimu decides, and Aisha sees the reasons.',
    });
  });

  it('Leila, a lead of the same team who does not write it, reads the same', async () => {
    const { svc, as } = setup({ setting: ON, theirView: 'I want to lead the supermarket accounts.' });
    const r: any = await svc.one(as('u-leila'), 'r-aisha');
    expect(r.reader).toBe('lead');
    expect(r.recognise.why).toBe(SAME_COUNT);
    expect(r.recognise.yourDecision).toBe('This is only a suggestion. Wairimu decides, and Aisha sees the reasons.');
  });

  it('they read it only on the same timing and setting as Wairimu: not before Aisha has had her turn, and not while it is off', async () => {
    const early = setup({ setting: ON });
    expect((await early.svc.one(early.as('u-grace'), 'r-aisha') as any).recognise).toBeNull();
    expect((await early.svc.one(early.as('u-leila'), 'r-aisha') as any).recognise).toBeNull();
    const off = setup({ theirView: 'I want to lead the supermarket accounts.' });
    expect((await off.svc.one(off.as('u-grace'), 'r-aisha') as any).recognise).toBeNull();
    expect((await off.svc.one(off.as('u-leila'), 'r-aisha') as any).recognise).toBeNull();
  });

  it('a lead of another team and a guest cannot open the review at all, so read nothing of it', async () => {
    const { svc, as } = setup({ setting: ON, theirView: 'I want to lead the supermarket accounts.' });
    await expect(svc.one(as('u-omar'), 'r-aisha')).rejects.toThrow();
    await expect(svc.one(as('u-guest'), 'r-aisha')).rejects.toThrow();
  });

  it('below the line, nobody reads it: eight in ten kept is not enough', async () => {
    const { svc, as } = setup({ setting: { on: true, keptAtLeast: 0.95, atLeastSettled: 8 }, theirView: 'x' });
    expect((await svc.one(as('u-wairimu'), 'r-aisha') as any).recognise).toBeNull();
    expect(await svc.one(as('u-aisha'), 'r-aisha')).not.toHaveProperty('recognise');
  });

  it('too few settled, nobody reads it', async () => {
    const { svc, as } = setup({ setting: { on: true, keptAtLeast: 0.9, atLeastSettled: 11 }, theirView: 'x' });
    expect(await svc.one(as('u-aisha'), 'r-aisha')).not.toHaveProperty('recognise');
  });

  it('no label on anybody, for any reader', async () => {
    const { svc, as } = setup({ setting: ON, theirView: 'x' });
    for (const u of ['u-wairimu', 'u-aisha', 'u-grace']) {
      expect(JSON.stringify(await svc.one(as(u), 'r-aisha'))).not.toMatch(/\b(PIP|exit|at[- ]risk|verdict|reward|rating|score|top performer)\b/i);
    }
  });
});

describe('decision 93, row 17: the suggestion about the person, on the review', () => {
  const SUGGESTION = { headline: 'Groundwork suggests extra support for Aisha Otieno' };
  function withSuggestions() {
    const { svc, as } = setup({});
    const asked: string[] = [];
    (svc as any).suggestions = { latestForTheLeadAbout: jest.fn(async (_p: string, reader: { userId: string }) => { asked.push(reader.userId); return reader.userId === 'u-leila' ? null : SUGGESTION; }) };
    return { svc, as, asked };
  }

  it('Wairimu, who writes it, and Grace, an admin, are asked for it; Leila, a lead who does not write it, is not', async () => {
    const { svc, as, asked } = withSuggestions();
    expect(((await svc.one(as('u-wairimu'), 'r-aisha')) as any).suggestion).toEqual(SUGGESTION);
    expect(((await svc.one(as('u-grace'), 'r-aisha')) as any).suggestion).toEqual(SUGGESTION);
    expect(((await svc.one(as('u-leila'), 'r-aisha')) as any).suggestion).toBeNull();
    expect(asked).toEqual(['u-wairimu', 'u-grace']);
  });

  it('Aisha is not served it', async () => {
    const { svc, as } = withSuggestions();
    expect(await svc.one(as('u-aisha'), 'r-aisha')).not.toHaveProperty('suggestion');
  });
});

