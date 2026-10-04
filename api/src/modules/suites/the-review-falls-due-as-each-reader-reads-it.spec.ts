import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService, REVIEW_REFUSED } from './the-reviews.service';
import { ReviewsProposedService } from './the-reviews-proposed.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { aSuggestionFromTheRecord } from '../suggestions/a-suggestion-reached-from-the-record';
import { DEFAULT_SUGGESTION_THRESHOLDS } from '../suggestions/thresholds';
import { labelsForParties } from '../reports/party-labels';

/**
 * A REVIEW THAT FALLS DUE FROM INSIDE THE PRODUCT, AS EACH READER READS IT (week 11).
 *
 * Decided for Hafsah to confirm: when a review falls due, the product PROPOSES it to whoever runs
 * it, and only their yes starts it. Nothing starts a review on its own, and nothing is sent to the
 * person before the lead's yes.
 *
 * Baridi Appliances. Wairimu runs "Kwame, first 90 days" (a new hire's check-in) and manages Kwame.
 * Kwame is in the staff directory and signs in. Grace is an admin. Aisha is a colleague. When the
 * check-in ends on "Keep the hire", a review is proposed. Wairimu reads why, and says yes.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-kwame': 'MEMBER', 'u-aisha': 'MEMBER' };
const person = (u: string | null, ext: string, given: string, manager: string | null, active = true) => ({
  externalId: ext, linkedUserId: u, displayName: `${given} Mensah`, givenName: given, familyName: 'Mensah',
  department: 'Sales', managerExternalId: manager, active,
});
const directory = [
  person('u-grace', 'p-grace', 'Grace', null),
  person('u-wairimu', 'p-wairimu', 'Wairimu', null),
  person('u-kwame', 'p-kwame', 'Kwame', 'p-wairimu'),
];
const part = (id: string, userId: string, type: string, first: string) => ({
  id, userId, partyType: type, managingOnly: false, email: `${first}@baridi.test`, createdAt: new Date('2026-07-01'),
  roleAsDescribed: 'Sales', user: { firstName: first, lastName: '', email: `${first}@baridi.test` },
});
const participants = [part('pp-w', 'u-wairimu', 'INITIATOR', 'Wairimu'), part('pp-k', 'u-kwame', 'PARTICIPANT', 'Kwame')];

const TODAY = new Date('2026-09-30T10:00:00Z');

function setup(opts: {
  scenario?: string; endState?: string; suiteOn?: boolean; every?: string; extraParticipant?: boolean;
  closedBefore?: { scenario: string; endState: string; reason: string }[];
  dues?: any[]; kwameActive?: boolean;
} = {}) {
  const ground: any = {
    id: 'g1', label: 'Kwame, first 90 days', organizationId: ORG, initiatorId: 'u-wairimu', scenario: opts.scenario ?? 'NEW_HIRE',
    endState: opts.endState ?? 'KEEP', peersVisibleToEachOther: null,
    participants: opts.extraParticipant ? [...participants, part('pp-a', 'u-aisha', 'PARTICIPANT', 'Aisha')] : participants,
  };
  const dues: any[] = [...(opts.dues ?? [])];
  const reviews: any[] = [];
  const suggestions: any[] = [];
  let n = 0;
  const dir = directory.map((p) => (p.externalId === 'p-kwame' ? { ...p, active: opts.kwameActive ?? true } : p));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    organizationSuite: {
      findUnique: jest.fn(async () => ({ isOn: opts.suiteOn ?? true, answers: { every: opts.every ?? 'Every 6 months', writer: 'Their manager' } })),
      findMany: jest.fn(async () => ((opts.suiteOn ?? true) ? [{ organizationId: ORG, answers: { every: opts.every ?? 'Every 6 months', writer: 'Their manager' } }] : [])),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] ?? 'MEMBER' })) },
    person: {
      findMany: jest.fn(async () => dir.filter((p) => p.active)),
      findFirst: jest.fn(async ({ where }: any) =>
        dir.find((x) => (where.linkedUserId ? x.linkedUserId === where.linkedUserId : x.externalId === where.externalId) && (where.active === undefined || x.active === where.active)) ?? null),
    },
    evaluationDue: {
      create: jest.fn(async ({ data }: any) => { const r = { id: `d-${++n}`, ...data }; dues.push(r); return { id: r.id }; }),
      findMany: jest.fn(async ({ where }: any) => dues.filter((d) => d.organizationId === where.organizationId
        && (!where.personExternalId || d.personExternalId === where.personExternalId))),
      findUnique: jest.fn(async ({ where }: any) => dues.find((d) => d.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => where.evaluationDueId.in.includes(r.evaluationDueId))),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { id: `r-${++n}`, managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, noticed: null, ...data }; reviews.push(r); return { id: r.id }; }),
    },
    resolution: {
      findMany: jest.fn(async () => (opts.closedBefore ?? []).map((c, i) => ({
        endState: c.endState, reason: c.reason, closedAt: new Date(`2026-09-${20 + i}T10:00:00Z`),
        ground: { label: `Kwame, ${c.scenario === 'NEW_HIRE' ? 'first 90 days' : 'the next six weeks'}`, scenario: c.scenario, initiatorId: 'u-wairimu', participants },
      }))),
    },
    suggestion: { findMany: jest.fn(async () => suggestions) },
    user: { findMany: jest.fn(async () => []) },
    personObjective: { findMany: jest.fn(async () => []) },
  };
  const suggestionsService = new SuggestionsService(prisma);
  const proposer = new ReviewsProposedService(prisma);
  const svc = new ReviewsService(prisma, suggestionsService);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { prisma, proposer, svc, as, dues, reviews, suggestions, ground };
}

const LABELS = /\b(PIP|performance improvement plan|exit|at[- ]risk|low[- ]performer|underperform\w*|verdict|rating|rated|specificity|score)\b/i;

describe('when a check-in about one person ends and they carry on', () => {
  it('proposes a review, and starts nothing', async () => {
    const { proposer, prisma, dues } = setup();
    const made = await proposer.whenACheckInEnds('g1', TODAY);
    expect(made).not.toBeNull();
    expect(dues).toHaveLength(1);
    expect(dues[0]).toMatchObject({ personExternalId: 'p-kwame', source: 'groundwork:a-check-in-ended', dueOn: new Date('2026-09-30T00:00:00.000Z') });
    expect(prisma.performanceReview.create).not.toHaveBeenCalled();
  });

  it('Wairimu, who writes it, reads why it is proposed and may say yes; nothing is sent to Kwame', async () => {
    const { proposer, svc, as } = setup();
    await proposer.whenACheckInEnds('g1', TODAY);
    const b = await svc.board(as('u-wairimu'), TODAY);
    expect(b.next).toHaveLength(1);
    expect(b.next[0]).toMatchObject({ name: 'Kwame Mensah', writtenWith: 'Wairimu Mensah', stands: 'ready', mayStart: true });
    expect(b.next[0].proposal).toBe(
      'Groundwork suggests a review for Kwame, because a check-in about Kwame’s work has ended. Nothing is sent to Kwame unless you say yes.',
    );
    expect(b.next[0].proposal).not.toMatch(/'/);
    expect(b.next[0].proposal).not.toMatch(LABELS);
  });

  it('Grace, an admin, reads the proposal but may not start it, because Wairimu writes it', async () => {
    const { proposer, svc, as } = setup();
    await proposer.whenACheckInEnds('g1', TODAY);
    const b = await svc.board(as('u-grace'), TODAY);
    expect(b.next[0]).toMatchObject({ mayStart: false });
    expect(b.next[0].proposal).toContain('Groundwork suggests a review for Kwame');
    await expect(svc.start(as('u-grace'), b.next[0].dueId)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyTheWriter));
  });

  it('Kwame and Aisha are refused the board, so neither reads that a review is proposed', async () => {
    const { proposer, svc, as } = setup();
    await proposer.whenACheckInEnds('g1', TODAY);
    await expect(svc.board(as('u-kwame'), TODAY)).rejects.toThrow(new ForbiddenException(REVIEW_REFUSED.onlyAdminsAndLeads));
    await expect(svc.board(as('u-aisha'), TODAY)).rejects.toThrow(ForbiddenException);
  });

  it('only Wairimu\'s yes starts it, and once', async () => {
    const { proposer, svc, as, prisma } = setup();
    await proposer.whenACheckInEnds('g1', TODAY);
    const due = (await svc.board(as('u-wairimu'), TODAY)).next[0];
    const { id } = await svc.start(as('u-wairimu'), due.dueId);
    expect(prisma.performanceReview.create).toHaveBeenCalledTimes(1);
    expect((await svc.board(as('u-wairimu'), TODAY)).next[0]).toMatchObject({ stands: 'started', reviewId: id, proposal: null });
    await expect(svc.start(as('u-wairimu'), due.dueId)).rejects.toThrow(new BadRequestException(REVIEW_REFUSED.alreadyStarted));
  });

  it('proposes nothing twice while one is waiting for a yes', async () => {
    const { proposer, dues } = setup();
    await proposer.whenACheckInEnds('g1', TODAY);
    await proposer.whenACheckInEnds('g1', new Date('2026-10-02T10:00:00Z'));
    expect(dues).toHaveLength(1);
  });

  it.each([
    ['the person does not carry on', { endState: 'EXIT' }],
    ['the check-in was not about one person', { extraParticipant: true }],
    ['the check-in was a team check-in', { scenario: 'PULSE_CHECK' }],
    ['the organisation has not switched reviews on', { suiteOn: false }],
    ['the person is not in the staff directory', { kwameActive: false }],
  ])('proposes nothing when %s', async (_why, opts) => {
    const { proposer, dues } = setup(opts as any);
    expect(await proposer.whenACheckInEnds('g1', TODAY)).toBeNull();
    expect(dues).toEqual([]);
  });
});

describe('when the date the organisation set for reviews comes round', () => {
  const earlier = [{ id: 'd-0', organizationId: ORG, personExternalId: 'p-kwame', dueOn: new Date('2026-09-01T00:00:00Z'), kind: 'six-monthly', source: 'their HR system' }];

  it('proposes the next review a month ahead, from the months the organisation asked for', async () => {
    const { proposer, dues } = setup({ dues: earlier });
    expect(await proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-10T06:30:00Z'))).toEqual({ proposed: 1 });
    expect(dues[1]).toMatchObject({ personExternalId: 'p-kwame', source: 'groundwork:the-organisations-date', dueOn: new Date('2027-03-01T00:00:00.000Z') });
  });

  it('Wairimu reads why it is proposed, in plain words', async () => {
    const { proposer, svc, as } = setup({ dues: earlier });
    await proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-10T06:30:00Z'));
    const b = await svc.board(as('u-wairimu'), new Date('2027-02-10T06:30:00Z'));
    expect(b.next.find((x) => x.dueOn === '2027-03-01')!.proposal).toBe(
      'Groundwork suggests a review for Kwame, because your organisation asked for reviews on a regular date and this is the next one. Nothing is sent to Kwame unless you say yes.',
    );
  });

  it('proposes nothing while the date is further off than a month, or twice', async () => {
    const { proposer, dues } = setup({ dues: earlier });
    expect(await proposer.whenTheOrganisationsDateComesRound(new Date('2026-12-01T06:30:00Z'))).toEqual({ proposed: 0 });
    await proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-10T06:30:00Z'));
    await proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-11T06:30:00Z'));
    expect(dues).toHaveLength(2);
  });

  it('proposes nothing from a date nobody can read, and nothing for somebody with no earlier review', async () => {
    expect(await setup({ dues: earlier, every: 'Whenever it suits' }).proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-10'))).toEqual({ proposed: 0 });
    expect(await setup().proposer.whenTheOrganisationsDateComesRound(new Date('2027-02-10'))).toEqual({ proposed: 0 });
  });
});

describe('What Groundwork noticed, written from the record when Wairimu says yes', () => {
  const closedBefore = [
    { scenario: 'NEW_HIRE', endState: 'EXTEND', reason: 'He needs another month on the supermarket accounts.' },
    { scenario: 'PIP', endState: 'RESOLVED', reason: 'The stock delay was not his doing.' },
  ];
  async function started() {
    const w = setup({ closedBefore });
    await w.proposer.whenACheckInEnds('g1', TODAY);
    const due = (await w.svc.board(w.as('u-wairimu'), TODAY)).next[0];
    const { id } = await w.svc.start(w.as('u-wairimu'), due.dueId);
    return { ...w, id };
  }

  it('Wairimu reads plain facts about how each ended check-in was decided, marked as the record', async () => {
    const { svc, as, id } = await started();
    const r: any = await svc.one(as('u-wairimu'), id);
    expect(r.noticed.map((x: any) => x.says)).toEqual([
      'Wairimu made the decision at the end of “Kwame, first 90 days” on 20 September 2026, and said why, “He needs another month on the supermarket accounts”. The outcome is that the time to decide is made longer.',
      'Wairimu made the decision at the end of “Kwame, the next six weeks” on 21 September 2026, and said why, “The stock delay was not his doing”. The outcome is that the concern about the work has been resolved.',
    ]);
    expect(r.noticed.every((x: any) => x.mark === 'proven')).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(LABELS);
  });

  it('Kwame reads the same facts about himself, never the private flag', async () => {
    const { svc, as, id } = await started();
    const r: any = await svc.one(as('u-kwame'), id);
    expect(r.reader).toBe('person');
    expect(r.noticed).toHaveLength(2);
    expect(JSON.stringify(r)).not.toContain('private');
    expect(r).not.toHaveProperty('suggestion');
    /* Decision 93, row 15: the person reads what the writer has written once it is written; nothing is written here yet. */
    expect(r.managersWords).toBeNull();
    expect(r.whereYouDiffer).toBeNull();
  });

  /* Changed with decision 75, item 25: Kwame's first 90 days is an evaluation check-in now, like the plan, so
     Grace, who was given access to neither, reads neither line. Before, she read the first 90 days' line. */
  it('Grace, an admin not given access to the plan or the first 90 days, reads no line from either', async () => {
    const { svc, as, id } = await started();
    const r: any = await svc.one(as('u-grace'), id);
    expect(r.reader).toBe('admin');
    expect(r.noticed.map((x: any) => x.says)).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('He needs another month on the supermarket accounts');
    expect(JSON.stringify(r)).not.toContain('The stock delay was not his doing');
  });

  it('Aisha, a colleague, is refused the review', async () => {
    const { svc, as, id } = await started();
    await expect(svc.one(as('u-aisha'), id)).rejects.toThrow(ForbiddenException);
  });

  it('Wairimu reads the suggestion if one was reached on a check-in she runs, with the count behind it (decision 86); nobody else does', async () => {
    const w = await started();
    const label = labelsForParties(participants as any).get('pp-k')!;
    const made = aSuggestionFromTheRecord('g1', {
      aboutParticipantId: 'pp-k', aboutLabel: label, commitmentsSettledRecently: { kept: 2, of: 8 }, ownWords: 'Onboarding stock took three weeks.',
    }, DEFAULT_SUGGESTION_THRESHOLDS)!;
    w.suggestions.push({
      id: 's-1', organizationId: ORG, groundId: 'g1', aboutParticipantId: 'pp-k', verdict: 'support', headline: made.headline, why: made.why,
      whatWouldChangeIt: made.whatWouldChangeIt, theirOwnAnswer: made.theirOwnAnswer, ifYouAgree: made.ifYouAgree, otherChoices: made.otherChoices,
      forTheEnding: null, factsForThem: made.factsForThem, whatWouldChangeItForThem: made.whatWouldChangeItForThem,
      decision: null, decisionReason: null, decidedById: null, decidedAt: null, theirSide: null, theirSideAt: null, appeal: null, appealedAt: null,
      appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null, createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    /* CHANGED 2 October: Kwame's first 90 days is an evaluation check-in (decision 75, item 25), so the review
       serves the suggestion reached there, as the prototype does. On 1 October it served none on it. */
    const w1: any = await w.svc.one(w.as('u-wairimu'), w.id);
    expect(w1.suggestion).toMatchObject({ headline: 'Groundwork suggests extra support for Kwame', why: 'In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support.' });
    /* Decision 86: the count Wairimu reads is the one in the suggestion's why, never the person's own "of your" count. */
    expect(JSON.stringify(w1)).not.toMatch(/ of your |\d+ in 100/);
    expect((await w.svc.one(w.as('u-grace'), w.id) as any).suggestion).toBeNull();
    expect(JSON.stringify(await w.svc.one(w.as('u-kwame'), w.id))).not.toContain('Groundwork suggests');
  });

  it('says nothing when there is nothing in the record, rather than making something up', async () => {
    const w = setup();
    await w.proposer.whenACheckInEnds('g1', TODAY);
    const due = (await w.svc.board(w.as('u-wairimu'), TODAY)).next[0];
    const { id } = await w.svc.start(w.as('u-wairimu'), due.dueId);
    expect(((await w.svc.one(w.as('u-wairimu'), id)) as any).noticed).toEqual([]);
  });
});
