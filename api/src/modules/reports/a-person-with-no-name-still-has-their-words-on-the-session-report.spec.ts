import { ReportsService } from './reports.service';

/**
 * E1, Riverbank Trading: seven of its twelve people have never given a name. On the session report, a
 * lead read "This person has answered, and nothing specific enough to record came out of it." beside
 * each of them, while their lines were on record: the lines were filed under one label and the row was
 * named another. The old code showed the lines under the address; an address is never a name (decision
 * 115), so the row says "One colleague", and the lines go with it. A person's words must not vanish
 * because they have no name.
 */
const THE_NAMELESS_WORDS = 'I asked twice about the on-call list and got told to check the shared drive, which I cannot find.';
const THE_OTHER_NAMELESS_WORDS = 'Nobody has shown me the escalation process, I have been guessing.';
const THE_LEADS_WORDS = 'What I am less sure about is whether he feels part of the team.';

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'p1@test.com',
    managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Njoroge' },
    detectedFunction: null, detectedFunctionConfidence: null,
    ...overrides,
  };
}


function makeGround(scenario: string) {
  return {
    id: 'g1', organizationId: 'org-1', initiatorId: 'user-1', createdByUserId: null, scenario, cadence: 'WEEKLY', timelineDays: 90,
    brief: 'Check in on how the work is going.', peersVisibleToEachOther: true, objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-23T17:00:00Z'), findings: [] },
    participants: [
      makeParticipant({ id: 'lead', userId: 'user-1', partyType: 'INITIATOR', user: { firstName: 'Ines', lastName: 'Barros' } }),
      makeParticipant({ id: 'nameless', userId: 'user-2', partyType: 'PARTICIPANT', email: 'fo4@riverbank.test', createdAt: new Date('2026-09-01T09:05:00Z'), user: { firstName: '', lastName: '' } }),
      makeParticipant({ id: 'other', userId: 'user-3', partyType: 'PARTICIPANT', email: 'lu8@riverbank.test', createdAt: new Date('2026-09-01T09:10:00Z'), user: { firstName: '', lastName: '' } }),
    ],
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const clone = () => structuredClone(ground);
  const entries = [
    { id: 'e1', type: 'WORRY', text: THE_NAMELESS_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'nameless', confirmedAt: null, anchoredDocumentId: null },
    { id: 'e2', type: 'WORRY', text: THE_LEADS_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'lead', confirmedAt: null, anchoredDocumentId: null },
    { id: 'e3', type: 'WORRY', text: THE_OTHER_NAMELESS_WORDS, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId: 'other', confirmedAt: null, anchoredDocumentId: null },
  ];
  const checkIns = [
    { id: 'c1', participantId: 'nameless', sessionNumber: 1, status: 'COMPLETED' },
    { id: 'c2', participantId: 'other', sessionNumber: 1, status: 'COMPLETED' },
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


const rowsOf = (r: any): any[] => (Array.isArray(r?.whatEachPersonSaid) ? r.whatEachPersonSaid : []);

describe.each([['a team check-in', 'OKR_ALIGNMENT'], ['a new starter', 'NEW_HIRE']])('on %s, the lead reads the words of people with no name', (_l, scenario) => {
  it('under a plain stand-in, with the lines, and never under an address', async () => {
    const result: any = await makeService(makeGround(scenario)).sessionReport('g1', 1, 'user-1', 'org-1');
    const rows = rowsOf(result);
    const theirs = rows.filter((r) => !r.isYou);
    expect(theirs.map((r) => r.who).sort()).toEqual(['Another colleague', 'One colleague']);
    expect(theirs.map((r) => r.lines).flat().sort()).toEqual([THE_OTHER_NAMELESS_WORDS, THE_NAMELESS_WORDS].sort());
    expect(rows.find((r) => r.isYou).lines).toEqual([THE_LEADS_WORDS]);
    expect(JSON.stringify(rows)).not.toContain('@');
    expect(JSON.stringify(rows)).not.toContain('nothing specific enough');
  });
});
