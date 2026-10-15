import { ReportsService } from './reports.service';

/**
 * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026, ON QUOTES IN THE TEAM REPORT.
 *
 * Every quote a person is served is already the record's exact words (a-quote-is-what-they-said,
 * a-quote-built-at-the-read). On an evaluation check-in, a quote of a COLLEAGUE's words in the team
 * report (`GET /grounds/:id/report`: `sharedPicture`, `theOpening`, `findings[].text`,
 * `agreements`) becomes a plain statement of the fact for the subject, never touching a quote of
 * the subject's own words. The manager and an admin read both quotes, as now. A control ground on
 * an ordinary team check-in is unchanged.
 */

const THE_SUBJECTS_LINE = 'Closed 14 support tickets this week and started the new onboarding flow.';
const THE_COLLEAGUES_LINE = 'Ade has been slow to answer two escalations, and I had to step in on the Kessler account.';

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'p1@test.com',
    soloArtifact: null, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Njoroge' },
    ...overrides,
  };
}

function makeGround(scenario: string, opts: { createdByUserId?: string | null } = {}) {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: opts.createdByUserId ?? null,
    whoSeesTargets: 'THEIR_OWN',
    scenario,
    peersVisibleToEachOther: true,
    objectives: [],
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
    report: {
      id: 'r1', groundId: 'g1',
      sharedPicture: `Ade says "${THE_SUBJECTS_LINE}" Chidi says "${THE_COLLEAGUES_LINE}"`,
      theOpening: null,
      agreements: ['Both agree the onboarding flow is now live.'],
      divergences: [], centralQuestion: 'What does success look like?',
      releasedAt: new Date('2026-09-23T17:00:00Z'), engagement: {}, findings: [], overTime: null,
      networkPicture: null, sharedAs: null, theJudgement: null,
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const clone = () => structuredClone(ground);
  const entries = [
    { id: 'e1', text: THE_SUBJECTS_LINE, saidWordForWord: true, participantId: 'subject' },
    { id: 'e2', text: THE_COLLEAGUES_LINE, saidWordForWord: true, participantId: 'colleague' },
  ];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => clone()) },
    user: {
      findUnique: jest.fn(async ({ select }: any) => {
        if (select && 'awaitingOrgApproval' in select) return { awaitingOrgApproval: false };
        return { role: userRole, organizationId: 'org-1' };
      }),
    },
    groundDocument: { findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })), count: jest.fn(async () => 0) },
    reportActivation: { findUnique: jest.fn(async () => ({ status: 'ACTIVATED' })), findMany: jest.fn(async () => []) },
    recordEntry: { findMany: jest.fn(async () => entries), count: jest.fn(async () => entries.length) },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => []) },
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

describe.each([
  ['a performance plan (PIP)', 'PIP'],
])('on %s, a quote of a colleague\'s words in the team report becomes a plain fact for the subject', (_label, scenario) => {
  it('the subject keeps their own quote, and loses the colleague\'s', async () => {
    const service = makeService(makeGround(scenario));
    const result: any = await service.get('g1', 'user-2', 'org-1');
    expect(result.sharedPicture).toContain(THE_SUBJECTS_LINE);
    expect(result.sharedPicture).not.toContain(THE_COLLEAGUES_LINE);
    expect(result.sharedPicture).not.toContain('the Kessler account');
    /* Still readable, not blank: the sentence about the colleague became a plain one. */
    expect(result.sharedPicture).toContain('A colleague described this differently.');
  });

  it('the manager reads both quotes, as now', async () => {
    const service = makeService(makeGround(scenario));
    const result: any = await service.get('g1', 'user-1', 'org-1');
    expect(result.sharedPicture).toContain(THE_SUBJECTS_LINE);
    expect(result.sharedPicture).toContain(THE_COLLEAGUES_LINE);
  });

  /**
   * DECISION 60 POINT 4, 30 September 2026: an admin is treated like the manager only WITH access
   * to this specific check-in - the admin who set it up for the lead (`createdByUserId`), the same
   * per-check-in grant decision 58 reads for patterns. Never every admin of the organisation.
   */
  it('an admin who set this check-in up reads both quotes too - treated like the manager', async () => {
    const service = makeService(makeGround(scenario, { createdByUserId: 'user-admin' }), 'ADMIN');
    const result: any = await service.get('g1', 'user-admin', 'org-1');
    expect(result.sharedPicture).toContain(THE_SUBJECTS_LINE);
    expect(result.sharedPicture).toContain(THE_COLLEAGUES_LINE);
  });

  it('an admin WITHOUT access to this check-in never reads the colleague\'s quote', async () => {
    /* Changed with request 78: refused outright, not served in a redacted form. */
    const service = makeService(makeGround(scenario), 'ADMIN');
    await expect(service.get('g1', 'user-admin', 'org-1')).rejects.toThrow();
  });
});

describe('control: an ordinary team check-in (OKR_ALIGNMENT) is unchanged', () => {
  it('the non-lead party reads both quotes exactly as before - this ruling does not apply', async () => {
    const service = makeService(makeGround('OKR_ALIGNMENT'));
    const result: any = await service.get('g1', 'user-2', 'org-1');
    expect(result.sharedPicture).toContain(THE_SUBJECTS_LINE);
    expect(result.sharedPicture).toContain(THE_COLLEAGUES_LINE);
  });
});
