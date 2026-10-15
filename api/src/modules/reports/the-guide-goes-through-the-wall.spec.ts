import { ReportsService } from './reports.service';

/**
 * RUN-29, LOANS (decision 75, item 14): Sunday's guide to the next conversation read "Take seriously that your own problem was
 * about timing, but for others, the problem is that they do not have the asset at all, either because it never arrived or
 * because it was stolen." That describes what happened to the other borrowers. The guide goes through the same wall as the
 * shared picture, so Sunday reads only his own half, and the lead, who may read it all, is not changed.
 */
const THE_SUBJECTS_WORDS = 'I closed 14 tickets this week.';
const THE_COLLEAGUES_WORDS = 'I had to step in on the Kessler account.';
const GUIDE = 'Take seriously that your own problem was about timing, but for others, the problem is that they do not have the asset at all, either because it never arrived or because it was stolen.';

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'p1@test.com',
    managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Njoroge' },
    detectedFunction: null, detectedFunctionConfidence: null,
    ...overrides,
  };
}

function makeGround(scenario: string, opts: { createdByUserId?: string | null } = {}) {
  const guide = { toAcknowledge: GUIDE };
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: opts.createdByUserId ?? null,
    scenario,
    cadence: 'WEEKLY',
    timelineDays: 90,
    brief: 'Check in on how the role is going.',
    peersVisibleToEachOther: null,
    objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-23T17:00:00Z'), findings: [], engagement: { postReportGuides: { subject: guide } } },
    participants: [
      makeParticipant({ id: 'lead', userId: 'user-1', partyType: 'INITIATOR' }),
      makeParticipant({
        id: 'subject', userId: 'user-2', partyType: 'PARTICIPANT', email: 'subject@test.com',
        createdAt: new Date('2026-09-01T09:05:00Z'), user: { firstName: 'Ade', lastName: 'Bello' },
      }),
      makeParticipant({
        id: 'colleague', userId: 'user-3', partyType: 'PARTICIPANT', email: 'colleague@test.com',
        createdAt: new Date('2026-09-01T09:10:00Z'), user: { firstName: 'Chidi', lastName: 'Okoro' },
      }),
    ],
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const clone = () => structuredClone(ground);
  const entries = [
    { id: 'e1', type: 'PROGRESS', text: THE_SUBJECTS_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'subject', confirmedAt: null, anchoredDocumentId: null },
    { id: 'e2', type: 'PROGRESS', text: THE_COLLEAGUES_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'colleague', confirmedAt: null, anchoredDocumentId: null },
  ];
  const checkIns = [
    { id: 'c1', participantId: 'subject', sessionNumber: 1, status: 'COMPLETED' },
    { id: 'c2', participantId: 'colleague', sessionNumber: 1, status: 'COMPLETED' },
    { id: 'c3', participantId: 'lead', sessionNumber: 1, status: 'COMPLETED' },
  ];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => clone()) },
    user: {
      findUnique: jest.fn(async ({ select }: any) => {
        if (select && 'awaitingOrgApproval' in select) return { awaitingOrgApproval: false };
        return { role: userRole, organizationId: 'org-1' };
      }),
    },
    recordEntry: { findMany: jest.fn(async () => entries), count: jest.fn(async () => entries.length) },
    checkIn: {
      findMany: jest.fn(async () => checkIns.map((c) => ({ participantId: c.participantId }))),
      findFirst: jest.fn(async () => ({ specificityLevel: null })),
      count: jest.fn(async () => 1),
    },
    groundParticipant: {
      findMany: jest.fn(async () => ground.participants.map((p: any) => ({
        id: p.id,
        checkIns: checkIns.filter((c) => c.participantId === p.id).map((c) => ({ status: c.status })),
      }))),
    },
    reportRound: { findUnique: jest.fn(async () => null) },
    reportActivation: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    groundBaselineEntry: { findFirst: jest.fn(async () => null) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
      }
      return target[prop];
    },
  });
  const email: any = {};
  const config: any = { get: () => 'http://localhost:5173' };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, grounds, { tell: async () => [] } as any);
}


describe('the guide to the next conversation, as each reader reads it, where people do not see each other', () => {
  it('a borrower reads the half about himself and nothing about what happened to the others', async () => {
    const result: any = await makeService(makeGround('COHORT_CHECK')).get('g1', 'user-2', 'org-1');
    expect(result.postReportGuide.toAcknowledge).toBe('Take seriously that your own problem was about timing.');
    expect(JSON.stringify(result.postReportGuide)).not.toMatch(/stolen|never arrived|for others/);
  });
});
