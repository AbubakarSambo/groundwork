import { ReportsService } from './reports.service';

/**
 * PART 3, HAFSAH'S RULING, 30 SEPTEMBER 2026, ON SERVED OUTPUT.
 *
 * "In an evaluation check-in, the person being reviewed sees the facts, and the decision with its
 * reasons, not colleagues' exact words. Those go only to the manager." An admin is treated like the
 * manager (morning report, 29 September, item 4). A colleague who gave a view reads what they read
 * today.
 *
 * These tests read a real PIP and a real renewal (CONTRACT_RENEWAL) through
 * `ReportsService.sessionReport()`, as four real readers - the subject, the manager, an admin, and
 * a colleague who gave a view - and prove what each of them actually reads in `whatEachPersonSaid`.
 * A control ground on an ordinary team check-in (OKR_ALIGNMENT) proves nothing changes there.
 *
 * `peersVisibleToEachOther` is set TRUE throughout, on purpose: this ruling holds regardless of
 * that toggle. The pre-existing "peers hidden by default on an evaluation ground" rule
 * (peers-are-named.ts) would have hidden the colleague's words anyway with the toggle at its
 * default - the point of this test is that the wall holds even when a lead has switched peers on.
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

function rowsFor(result: any): any[] {
  return Array.isArray(result?.whatEachPersonSaid) ? result.whatEachPersonSaid : [];
}

describe.each([
  ['a performance plan (PIP)', 'PIP'],
  ['a renewal (CONTRACT_RENEWAL)', 'CONTRACT_RENEWAL'],
])('on %s, colleagues\' exact words stay with the manager', (_label, scenario) => {
  it('the subject reads the facts, never the colleague\'s exact words - and keeps their own words in full', async () => {
    const service = makeService(makeGround(scenario));
    const result: any = await service.sessionReport('g1', 1, 'user-2', 'org-1');
    const rows = rowsFor(result);
    expect(JSON.stringify(rows)).not.toContain(THE_COLLEAGUES_WORDS);
    expect(JSON.stringify(rows)).toContain(THE_SUBJECTS_WORDS);
    const colleagueRow = rows.find((r) => !r.isYou);
    expect(colleagueRow.lines).toEqual([]);
    expect(colleagueRow.saying).toBeTruthy();
    const ownRow = rows.find((r) => r.isYou);
    expect(ownRow.lines).toContain(THE_SUBJECTS_WORDS);
  });

  it('the manager reads the colleague\'s exact words, as now', async () => {
    const service = makeService(makeGround(scenario));
    const result: any = await service.sessionReport('g1', 1, 'user-1', 'org-1');
    expect(JSON.stringify(rowsFor(result))).toContain(THE_COLLEAGUES_WORDS);
  });

  /**
   * DECISION 60 POINT 4, 30 September 2026: an admin is treated like the manager only WITH access
   * to this specific check-in - the admin who set it up for the lead (`createdByUserId`), the same
   * per-check-in grant decision 58 reads for patterns. Never every admin of the organisation.
   */
  it('an admin who set this check-in up reads the colleague\'s exact words too - treated like the manager', async () => {
    const service = makeService(makeGround(scenario, { createdByUserId: 'user-admin' }), 'ADMIN');
    const result: any = await service.sessionReport('g1', 1, 'user-admin', 'org-1');
    expect(JSON.stringify(rowsFor(result))).toContain(THE_COLLEAGUES_WORDS);
  });

  it('an admin WITHOUT access to this check-in never reads the colleague\'s exact words', async () => {
    /* Changed with request 78: an admin without access no longer reads a redacted copy; the check-in is not
       theirs to read at all, so the report is refused. The colleague's words still never reach them. */
    const service = makeService(makeGround(scenario), 'ADMIN');
    await expect(service.sessionReport('g1', 1, 'user-admin', 'org-1')).rejects.toThrow('That report could not be found, so go back to the check-in and open it from there.');
  });

  it('a colleague who gave a view reads what they read today - including the subject\'s own words', async () => {
    const service = makeService(makeGround(scenario));
    const result: any = await service.sessionReport('g1', 1, 'user-3', 'org-1');
    expect(JSON.stringify(rowsFor(result))).toContain(THE_SUBJECTS_WORDS);
  });
});

describe('control: an ordinary team check-in (OKR_ALIGNMENT) is unchanged', () => {
  it('the non-lead party reads a colleague\'s exact words exactly as before - this ruling does not apply', async () => {
    const service = makeService(makeGround('OKR_ALIGNMENT'));
    const result: any = await service.sessionReport('g1', 1, 'user-2', 'org-1');
    expect(JSON.stringify(rowsFor(result))).toContain(THE_COLLEAGUES_WORDS);
  });
});

/*
 * HAFSAH'S DECISION, 22 NOVEMBER 2026 ("great do you recommendation"): exact words go only to the people in that check-in. Anybody else, an admin or a
 * manager, reads what was said in Groundwork's own words. Release test of 21 November, case #45: Grace, an admin in none of Sales Q4, was given three of
 * Amani's exact quotes by Ask, which reads these same served rows.
 */
describe('on an ordinary team check-in, exact words go only to the people in it (22 November 2026)', () => {
  it('an admin who is not in the check-in reads no one\'s exact words on the report', async () => {
    const service = makeService(makeGround('OKR_ALIGNMENT'), 'ADMIN');
    const rows = rowsFor(await service.sessionReport('g1', 1, 'user-admin', 'org-1'));
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(THE_COLLEAGUES_WORDS);
    expect(JSON.stringify(rows)).not.toContain(THE_SUBJECTS_WORDS);
    for (const r of rows) expect(r.lines).toEqual([]);
  });
  it('an admin who is not in the check-in reads the themed sections without anybody\'s words, and each section still says what came up', async () => {
    const asAdmin: any = await makeService(makeGround('OKR_ALIGNMENT'), 'ADMIN').sessionReport('g1', 1, 'user-admin', 'org-1');
    const asLead: any = await makeService(makeGround('OKR_ALIGNMENT')).sessionReport('g1', 1, 'user-1', 'org-1');
    const progress = (r: any) => r.sections.find((x: any) => x.title === 'Progress and priorities');
    console.log(`THE ADMIN READS\n${JSON.stringify(progress(asAdmin))}\n\nTHE LEAD READS\n${JSON.stringify(progress(asLead))}`);
    expect(JSON.stringify(asAdmin.sections)).not.toContain(THE_COLLEAGUES_WORDS);
    expect(JSON.stringify(asAdmin.sections)).not.toContain(THE_SUBJECTS_WORDS);
    expect(progress(asLead).items.length).toBeGreaterThan(0);
    expect(progress(asAdmin).saying).toBe(`${progress(asLead).items.length === 1 ? 'One thing' : `${progress(asLead).items.length} things`} came up here in this check-in. What each person said is told in Groundwork's own words under their name.`);
    expect(JSON.stringify(asLead.sections)).toContain(THE_COLLEAGUES_WORDS);
  });
  it('the people in it read the exact words as before: the lead and each person on it', async () => {
    for (const reader of ['user-1', 'user-2', 'user-3']) {
      const rows = rowsFor(await makeService(makeGround('OKR_ALIGNMENT')).sessionReport('g1', 1, reader, 'org-1'));
      expect(JSON.stringify(rows)).toContain(THE_COLLEAGUES_WORDS);
    }
  });
  it('the admin who set it up for its lead runs it, and reads it as the lead does (decision 60 point 4)', async () => {
    const rows = rowsFor(await makeService(makeGround('OKR_ALIGNMENT', { createdByUserId: 'user-admin' }), 'ADMIN').sessionReport('g1', 1, 'user-admin', 'org-1'));
    expect(JSON.stringify(rows)).toContain(THE_COLLEAGUES_WORDS);
  });
  it('keeps Groundwork\'s own sentence for each person and drops only the lines', async () => {
    const { whatEachPersonSaidInOurWords } = await import('./colleagues-exact-words-stay-with-the-manager');
    expect(whatEachPersonSaidInOurWords([{ who: 'Amani', isYou: false, lines: ['AMANI-EXACT'], lineMarks: ['x'], saying: 'Amani says Kilele paid on Monday.', finding: 'Amani has proof for one sale.' }]))
      .toEqual([{ who: 'Amani', isYou: false, lines: [], saying: 'Amani says Kilele paid on Monday.', finding: 'Amani has proof for one sale.' }]);
  });
});
