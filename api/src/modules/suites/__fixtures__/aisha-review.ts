import { ReviewsService } from '../the-reviews.service';

/**
 * AISHA'S REVIEW AT BARIDI APPLIANCES, read from a record kept in memory, for the specs that serve the
 * review as each reader reads it (build steps 12 and 13). The story is told at the top of
 * the-record-in-a-review-as-each-reader-reads-it.spec.ts and the-briefing-for-a-review-as-each-reader-reads-it.spec.ts.
 */

export const ORG = 'org-baridi';
export const NOW = new Date('2026-10-01T09:00:00Z');
const roles: Record<string, string> = {
  'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-juma': 'LEAD', 'u-kamau': 'LEAD', 'u-aisha': 'MEMBER', 'u-miriam': 'MEMBER',
};
const p = (u: string, ext: string, name: string, department: string, manager: string | null) => {
  const [givenName, familyName] = name.split(' ');
  return { externalId: ext, linkedUserId: u, displayName: name, givenName, familyName, department, managerExternalId: manager, active: true };
};
const directory = [
  p('u-grace', 'p-grace', 'Grace Achieng', 'Finance', null),
  p('u-wairimu', 'p-wairimu', 'Wairimu Kamau', 'Sales', null),
  p('u-juma', 'p-juma', 'Juma Mwangi', 'Sales', null),
  p('u-kamau', 'p-kamau', 'Kamau Njenga', 'Operations', null),
  p('u-aisha', 'p-aisha', 'Aisha Otieno', 'Sales', 'p-wairimu'),
  p('u-miriam', 'p-miriam', 'Miriam Wanjiku', 'Sales', 'p-wairimu'),
];
const firstNames: Record<string, string> = { 'u-wairimu': 'Wairimu', 'u-kamau': 'Kamau', 'u-aisha': 'Aisha', 'u-grace': 'Grace', 'u-juma': 'Juma', 'u-miriam': 'Miriam' };
export const at = (s: string) => new Date(`${s}T10:00:00.000Z`);

const grounds = [
  { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q3', initiatorId: 'u-wairimu', createdByUserId: null },
  { id: 'g-supply', organizationId: ORG, label: 'Supplier review', initiatorId: 'u-kamau', createdByUserId: null },
];
const participants = [
  { id: 'pw-sales', userId: 'u-wairimu', groundId: 'g-sales', managingOnly: false },
  { id: 'pa-sales', userId: 'u-aisha', groundId: 'g-sales', managingOnly: false },
  { id: 'pm-sales', userId: 'u-miriam', groundId: 'g-sales', managingOnly: false },
  { id: 'pk-supply', userId: 'u-kamau', groundId: 'g-supply', managingOnly: false },
  { id: 'pa-supply', userId: 'u-aisha', groundId: 'g-supply', managingOnly: false },
];
const checkIns = [
  { participantId: 'pa-sales', status: 'COMPLETED', completedAt: at('2026-04-06') },
  { participantId: 'pa-sales', status: 'COMPLETED', completedAt: at('2026-05-04') },
  { participantId: 'pa-sales', status: 'COMPLETED', completedAt: at('2026-09-28') },
  { participantId: 'pa-supply', status: 'COMPLETED', completedAt: at('2026-06-10') },
  /* Before the period: not read. */
  { participantId: 'pa-sales', status: 'COMPLETED', completedAt: at('2026-02-02') },
];
const goals = [
  { id: 'o-accounts', ownerParticipantId: 'pa-sales', isADecisionAboutAPerson: false, name: 'New supermarket accounts', target: 4, count: 5, dueOn: null, updatedAt: at('2026-09-28'), createdAt: at('2026-04-01') },
  { id: 'o-keep', ownerParticipantId: 'pa-sales', isADecisionAboutAPerson: true, name: 'Keep Aisha on after the review', target: null, count: 0, dueOn: null, updatedAt: at('2026-09-28'), createdAt: at('2026-04-01') },
];
const c = (id: string, participantId: string, text: string, wordForWord: boolean, created: string, status: string, settled: string | null, again: number[] = [], source = 'CHECK_IN') =>
  ({ id, participantId, text, saidWordForWord: wordForWord, explicit: true, source, status, saidAgainIn: again, settledAt: settled ? at(settled) : null, createdAt: at(created) });
const commitments = [
  c('c1', 'pa-sales', 'I will call Naivas about the freezers', true, '2026-04-06', 'DONE', '2026-04-20'),
  c('c2', 'pa-sales', 'send the price list to Carrefour', false, '2026-05-04', 'NOT_DONE', '2026-05-18'),
  c('c3', 'pa-sales', "I'll visit Quickmart on Ngong Road", false, '2026-05-04', 'DONE', '2026-06-01', [3, 4]),
  c('c4', 'pa-sales', 'open a second butchery account', false, '2026-06-01', 'DROPPED', null),
  c('c5', 'pa-sales', 'I will train Kwame on quotes', true, '2026-09-28', 'UNKNOWN', null),
  c('c6', 'pa-supply', 'I will chase the freezer delivery', true, '2026-06-10', 'DONE', '2026-06-20'),
  c('c7', 'pa-sales', 'Pasted from the plan', false, '2026-04-06', 'DONE', '2026-04-08', [], 'PASTE'),
];
const waits = [
  { id: 'w1', fromParticipantId: 'pa-sales', what: 'the freezers for the first customers', onLabel: 'Operations', createdAt: at('2026-04-06'), clearedAt: at('2026-04-27'), onParticipant: null },
  { id: 'w2', fromParticipantId: 'pa-supply', what: 'the delivery dates', onLabel: null, createdAt: at('2026-06-10'), clearedAt: null, onParticipant: { userId: 'u-kamau', user: { firstName: 'Kamau' } } },
];
const subjects = [
  { id: 's-nairobi', organizationId: ORG, ownerExternalId: 'p-aisha', type: 'PROJECT', title: 'Supermarket accounts in Nairobi', dueDate: at('2026-12-31'), startDate: at('2026-04-01'), status: 'In progress', sourceDeletedAt: null },
];

export interface Options {
  /** Each check-in's assessment column, for layer 2 (F2, 2 November 2026): { participantId, sessionNumber, sessionReport }. */
  assessments?: any[];
  /** Aisha's earlier review, decided. */
  earlier?: boolean;
  /** Pattern rows in check-ins Aisha is in. */
  patterns?: any[];
  /** The goals the lead has set Aisha (PersonObjective rows), with whether she has been told. */
  personObjectives?: any[];
}

export function setup(opts: Options = {}) {
  const dues = [{ id: 'd-aisha', organizationId: ORG, personExternalId: 'p-aisha', dueOn: new Date('2026-10-15T00:00:00Z'), source: null }];
  const reviews: any[] = opts.earlier ? [{
    id: 'r-earlier', organizationId: ORG, evaluationDueId: 'd-earlier', personExternalId: 'p-aisha', startedById: 'u-wairimu', startedAt: at('2026-03-01'),
    decision: 'Aisha leads the butchery accounts.', decisionReasons: 'She closed every butchery sale she was given.', decidedById: 'u-wairimu', decidedAt: at('2026-03-15'),
  }] : [];
  const corrections: any[] = [];
  const inIds = (where: any, key: string, v: string) => !where?.[key]?.in || where[key].in.includes(v);
  const prisma: any = {
    organizationSuite: { findUnique: jest.fn(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer: 'Their manager' } })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)) },
    person: {
      findMany: jest.fn(async () => directory),
      findFirst: jest.fn(async ({ where }: any) => directory.find((x) => x.externalId === where.externalId) ?? null),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, firstName: firstNames[id] ?? null }))),
      findUnique: jest.fn(async ({ where }: any) => ({ firstName: firstNames[where.id] ?? null, lastName: null })),
    },
    evaluationDue: {
      findMany: jest.fn(async () => dues),
      findUnique: jest.fn(async ({ where }: any) => dues.find((x) => x.id === where.id) ?? null),
    },
    performanceReview: {
      findMany: jest.fn(async ({ where }: any) => reviews.filter((r) => (!where.evaluationDueId || where.evaluationDueId.in.includes(r.evaluationDueId))
        && (!where.personExternalId || r.personExternalId === where.personExternalId)
        && (!where.decidedAt || !!r.decidedAt) && (!where.startedAt || r.startedAt < where.startedAt.lt))),
      findFirst: jest.fn(async ({ where }: any) => reviews.filter((r) => r.personExternalId === where.personExternalId).sort((a, b) => b.startedAt - a.startedAt)[0] ?? null),
      findUnique: jest.fn(async ({ where }: any) => reviews.find((r) => (where.id ? r.id === where.id : r.evaluationDueId === where.evaluationDueId)) ?? null),
      create: jest.fn(async ({ data }: any) => { const r = { id: 'r-aisha', startedAt: new Date(), managersWords: null, theirView: null, decision: null, decisionReasons: null, decidedAt: null, decidedById: null, noticed: null, ...data }; reviews.push(r); return { id: r.id }; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(reviews.find((r) => r.id === where.id), data)),
    },
    performanceReviewCorrection: {
      create: jest.fn(async ({ data }: any) => { corrections.push({ ...data, createdAt: new Date(NOW.getTime() + corrections.length * 86_400_000) }); return data; }),
      findMany: jest.fn(async ({ where }: any) => corrections.filter((x) => x.reviewId === where.reviewId)),
    },
    resolution: { findMany: jest.fn(async () => []) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => grounds.filter((g) => inIds(where, 'id', g.id) && where.OR.some((o: any) => (o.initiatorId && g.initiatorId === o.initiatorId) || (o.createdByUserId && g.createdByUserId === o.createdByUserId)))),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => participants
        .filter((x) => x.userId === where.userId && inIds(where, 'groundId', x.groundId) && (where.managingOnly === undefined || x.managingOnly === where.managingOnly))
        .filter((x) => !where.ground?.OR || where.ground.OR.some((o: any) => { const g = grounds.find((y) => y.id === x.groundId)!; return (o.initiatorId && g.initiatorId === o.initiatorId) || (o.createdByUserId && g.createdByUserId === o.createdByUserId); }))
        .map((x) => ({ ...x, ground: grounds.find((g) => g.id === x.groundId) }))),
    },
    checkIn: { findMany: jest.fn(async ({ where, select }: any) => select?.sessionReport ? (opts.assessments ?? []).filter((x) => where.participantId.in.includes(x.participantId)).map((x, n) => ({ id: `ci-a-${n}`, ...x })).sort((a, b) => b.sessionNumber - a.sessionNumber) : checkIns.filter((x) => where.participantId.in.includes(x.participantId) && x.status === where.status && x.completedAt >= where.completedAt.gte && x.completedAt <= where.completedAt.lte)) },
    groundObjective: { findMany: jest.fn(async ({ where }: any) => goals.filter((o) => where.ownerParticipantId.in.includes(o.ownerParticipantId) && o.isADecisionAboutAPerson === where.isADecisionAboutAPerson)) },
    groundCommitment: { findMany: jest.fn(async ({ where }: any) => commitments.filter((x) => where.participantId.in.includes(x.participantId) && x.explicit === where.explicit && x.source !== where.source.not && x.createdAt >= where.createdAt.gte && x.createdAt <= where.createdAt.lte)) },
    groundDependency: { findMany: jest.fn(async ({ where }: any) => waits.filter((x) => where.fromParticipantId.in.includes(x.fromParticipantId) && x.createdAt >= where.createdAt.gte && x.createdAt <= where.createdAt.lte)) },
    subject: { findMany: jest.fn(async ({ where }: any) => subjects.filter((s) => s.organizationId === where.organizationId && s.ownerExternalId === where.ownerExternalId && where.type.in.includes(s.type))) },
    personObjective: { findMany: jest.fn(async ({ where }: any) => (opts.personObjectives ?? []).filter((x) => where.participantId.in.includes(x.participantId) && (!where.awareness || x.awareness === where.awareness))) },
    patternDetection: { findMany: jest.fn(async ({ where }: any) => (opts.patterns ?? []).filter((x) => where.participantId.in.includes(x.participantId))) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    suiteEvent: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
  };
  const svc = new ReviewsService(prisma);
  const as = (userId: string) => ({ userId, organizationId: ORG });
  return { svc, as, reviews, corrections };
}

