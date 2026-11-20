import { ReportsService } from './reports.service';

/**
 * DECISION 5, REQUEST 78: AN ADMIN READS NO PERFORMANCE PLAN, PROMOTION OR RENEWAL UNLESS GIVEN ACCESS.
 *
 * Every route that serves a report is read here for the three kinds (PIP, RECOGNITION, CONTRACT_RENEWAL) as
 * an admin of the organisation with no access, who is told the check-in does not exist; and as the admin who
 * set it up, who reads it. On an ordinary team check-in the same admin reads as before.
 */
const THE_COLLEAGUES_WORDS = 'Ade has been slow to answer two escalations, and I had to step in on the Kessler account.';
const THE_SUBJECTS_WORDS = 'Closed 14 support tickets this week and started the new onboarding flow.';

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


const routes: [string, (s: ReportsService, who: string) => Promise<any>][] = [
  ['GET /grounds/:id/report', (s, who) => s.get('g1', who, 'org-1')],
  ['GET /grounds/:id/report/check-in/1', (s, who) => s.sessionReport('g1', 1, who, 'org-1')],
  ['GET /grounds/:id/report/rounds', (s, who) => s.rounds('g1', who, 'org-1')],
  ['GET /grounds/:id/report/against-success', (s, who) => s.whereAgainstSuccess('g1', who, 'org-1')],
  ['GET /grounds/:id/report/activation-status', (s, who) => s.getActivationStatusForUser('g1', who, 'org-1')],
];

describe.each([['a performance plan', 'PIP'], ['a promotion', 'RECOGNITION'], ['a renewal', 'CONTRACT_RENEWAL']])('%s', (_l, scenario) => {
  describe.each(routes)('%s', (_route, read) => {
    it('is refused to an admin who was not given access, and nothing of it is served', async () => {
      const service = makeService(makeGround(scenario), 'ADMIN');
      let served = '';
      await read(service, 'user-admin').then((r) => { served = JSON.stringify(r); }).catch((e) => { served = `refused:${e?.status ?? e?.message}`; });
      expect(served.startsWith('refused:')).toBe(true);
      expect(served).not.toContain(THE_COLLEAGUES_WORDS);
      expect(served).not.toContain(THE_SUBJECTS_WORDS);
    });
  });

  it('is read by the admin who set it up', async () => {
    const service = makeService(makeGround(scenario, { createdByUserId: 'user-admin' }), 'ADMIN');
    const result = await service.sessionReport('g1', 1, 'user-admin', 'org-1');
    expect(JSON.stringify(result)).toContain(THE_COLLEAGUES_WORDS);
    await expect(service.get('g1', 'user-admin', 'org-1')).resolves.toBeTruthy();
  });

  it('is still read by the manager who runs it', async () => {
    const service = makeService(makeGround(scenario), 'MEMBER');
    await expect(service.get('g1', 'user-1', 'org-1')).resolves.toBeTruthy();
  });

  it('cannot be generated by an admin who was not given access', async () => {
    const service = makeService(makeGround(scenario), 'ADMIN');
    (service as any).prisma.ground.findFirst = jest.fn(async () => ({ ...makeGround(scenario) }));
    await expect(service.generateForAdmin('g1', 'org-1', 'user-admin')).rejects.toThrow('That check-in could not be found, so go back to your check-ins and open it from the list.');
  });
});

describe('an ordinary team check-in (OKR_ALIGNMENT), as a control', () => {
  it('is still read by an admin of the organisation who has no other access', async () => {
    const service = makeService(makeGround('OKR_ALIGNMENT'), 'ADMIN');
    const result = await service.sessionReport('g1', 1, 'user-admin', 'org-1');
    expect(JSON.stringify(result)).toContain(THE_COLLEAGUES_WORDS);
  });
});
