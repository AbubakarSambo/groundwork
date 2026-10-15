import { ReportsService } from './reports.service';

/**
 * DECISION 117, D16 (Hafsah, 8 October): ON A PERFORMANCE OR OTHER EVALUATION CHECK-IN, THE PERSON REVIEWED READS THE MANAGER'S WORDS
 * on the session report, as decisions 3 and 6 say. Only a colleague's exact words stay hidden from them (decision 17).
 * Read as the person reviewed, a colleague who gave a view, and the manager, on a performance plan, a renewal and a recognition round.
 */
const THE_COLLEAGUES_WORDS = 'Ade has been slow to answer two escalations, and I had to step in on the Kessler account.';
const THE_SUBJECTS_WORDS = 'Closed 14 support tickets this week and started the new onboarding flow.';
const THE_MANAGERS_WORDS = 'We agreed the response time would be under four hours, and it has been nine.';

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
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: opts.createdByUserId ?? null,
    scenario,
    cadence: 'WEEKLY',
    timelineDays: 90,
    brief: 'Check in on how the role is going.',
    peersVisibleToEachOther: true,
    objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-23T17:00:00Z'), findings: [] },
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
    { id: 'e3', type: 'PROGRESS', text: THE_MANAGERS_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'lead', confirmedAt: null, anchoredDocumentId: null },
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

function rowsFor(result: any): any[] {
  return Array.isArray(result?.whatEachPersonSaid) ? result.whatEachPersonSaid : [];
}


describe.each([
  ['a performance plan', 'PIP'],
  ['a renewal', 'CONTRACT_RENEWAL'],
  ['a recognition round', 'RECOGNITION'],
])('on %s, the session report as each person reads it', (_label, scenario) => {
  it('the person reviewed reads the manager\'s words word for word, and their own', async () => {
    const result: any = await makeService(makeGround(scenario)).sessionReport('g1', 1, 'user-2', 'org-1');
    const served = JSON.stringify(rowsFor(result));
    expect(served).toContain(THE_MANAGERS_WORDS);
    expect(served).toContain(THE_SUBJECTS_WORDS);
  });

  it('the person reviewed still reads no colleague\'s exact words', async () => {
    const result: any = await makeService(makeGround(scenario)).sessionReport('g1', 1, 'user-2', 'org-1');
    expect(JSON.stringify(rowsFor(result))).not.toContain(THE_COLLEAGUES_WORDS);
    expect(rowsFor(result).find((r) => !r.isYou && r.lines.length === 0 && /colleague/i.test(r.who ?? ''))).toBeTruthy();
  });

  it('a colleague who gave a view reads what they read before, nothing less and nothing new', async () => {
    const result: any = await makeService(makeGround(scenario)).sessionReport('g1', 1, 'user-3', 'org-1');
    const served = JSON.stringify(rowsFor(result));
    expect(served).toContain(THE_MANAGERS_WORDS);
    expect(served).toContain(THE_COLLEAGUES_WORDS);
  });

  it('the manager reads every row, as now', async () => {
    const served = JSON.stringify(rowsFor(await makeService(makeGround(scenario)).sessionReport('g1', 1, 'user-1', 'org-1')));
    expect(served).toContain(THE_MANAGERS_WORDS);
    expect(served).toContain(THE_COLLEAGUES_WORDS);
    expect(served).toContain(THE_SUBJECTS_WORDS);
  });
});
