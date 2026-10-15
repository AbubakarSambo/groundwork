import { GroundScenario } from '@prisma/client';
import { ReportsService } from './reports.service';
import { theSentencesOf } from './the-mark-on-every-line';
import { peersAreNamedOn } from './peers-are-named';
import { boardAs, RUKIA, AMINA, BARAKA, commitment } from '../board/the-switchboards-sections-harness';

/**
 * DECISION 17 WINS OVER THE LEAD'S SWITCH (the 1 October review).
 *
 * A lead can switch "people see each other" on for a check-in. On a performance plan, a promotion
 * or recognition round, or a contract renewal, that switch still named a colleague to the person
 * being reviewed. Decision 17 says that never happens. These tests read the real report and the
 * real board as the person reviewed, with the switch on, and prove no colleague's name reaches
 * them. The lead still reads every name. Away from evaluation check-ins the switch still works in
 * both directions.
 */

const THE_SUBJECTS_LINE = 'Closed 14 support tickets this week and started the new onboarding flow.';
const THE_COLLEAGUES_LINE = 'The rollout slipped by two weeks because the data was late.';
const SENTENCES = [
  'All three people have answered.',
  'Participant B says the rollout slipped by two weeks.',
  `Participant A says "${THE_SUBJECTS_LINE}"`,
];
const PICTURE = SENTENCES.join(' ');

function makeParticipant(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'p1', userId: 'user-1', partyType: 'INITIATOR', email: 'p1@test.com',
    soloArtifact: null, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
    managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null,
    createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Njoroge' },
    ...overrides,
  };
}

function makeGround(scenario: string, opts: { createdByUserId?: string | null; peers?: boolean | null } = {}) {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: opts.createdByUserId ?? null,
    whoSeesTargets: 'THEIR_OWN',
    scenario,
    peersVisibleToEachOther: opts.peers ?? null,
    objectives: [],
    participants: [
      makeParticipant({ id: 'lead', userId: 'user-1', partyType: 'INITIATOR' }),
      makeParticipant({
        id: 'subject', userId: 'user-2', partyType: 'PARTICIPANT', email: 'ade@test.com',
        createdAt: new Date('2026-09-01T09:05:00Z'), user: { firstName: 'Ade', lastName: 'Bello' },
      }),
      makeParticipant({
        id: 'colleague', userId: 'user-3', partyType: 'PARTICIPANT', email: 'chidi@test.com',
        createdAt: new Date('2026-09-01T09:10:00Z'), user: { firstName: 'Chidi', lastName: 'Okoro' },
      }),
    ],
    report: {
      id: 'r1', groundId: 'g1',
      sharedPicture: PICTURE,
      theOpening: null,
      agreements: ['Both agree the onboarding flow is now live.'],
      divergences: [], centralQuestion: 'What does success look like?',
      releasedAt: new Date('2026-09-23T17:00:00Z'), engagement: { marksOnItsLines: { sharedPicture: theSentencesOf(PICTURE).map(() => ({ mark: 'said', markSays: 'Only someone\u2019s word' })), agreements: [{ mark: 'said', markSays: 'Only someone\u2019s word' }], divergences: [], findings: [] } }, findings: [], overTime: null,
      networkPicture: null, sharedAs: null, theJudgement: null,
      createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
    },
  };
}

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER', untold: any[] = []) {
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
    personObjective: { findMany: jest.fn(async () => untold) },
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



const served = (r: any) => JSON.stringify(r);
const EVALUATIONS: [string, string][] = [
  ['a performance plan', 'PIP'],
  ['a recognition or promotion round', 'RECOGNITION'],
  ['a contract renewal', 'CONTRACT_RENEWAL'],
];

describe.each(EVALUATIONS)('on %s, with the lead\'s switch "people see each other" on', (_label, scenario) => {
  it('Ade, the person reviewed, is never told the colleague\'s name in the report', async () => {
    const r: any = await makeService(makeGround(scenario, { peers: true })).get('g1', 'user-2', 'org-1');
    expect(served(r)).not.toMatch(/Chidi|Okoro/);
    /* The report still reads, and still says what was said. */
    expect(r.sharedPicture).toContain('All three people have answered.');
    expect(r.sharedPicture).toMatch(/A colleague/);
  });

  it('the lead, who runs it, still reads the colleague\'s name', async () => {
    const r: any = await makeService(makeGround(scenario, { peers: true })).get('g1', 'user-1', 'org-1');
    expect(r.sharedPicture).toContain('Chidi');
  });

  it('Rukia, the person reviewed, is never told a colleague\'s name on the board', async () => {
    const b = await boardAs({
      scenario: (GroundScenario as any)[scenario], peersVisibleToEachOther: true,
      commitments: [commitment('k-1', 'p-baraka', 'I will send the pricing sheet.'), commitment('k-2', 'p-rukia', 'I will send the Westgate quote.')],
    }, ...RUKIA);
    expect(served(b)).not.toMatch(/Baraka/);
    expect(served(b)).toContain('Westgate quote');
  });

  /* A colleague giving a view is not the person reviewed, so the lead's switch still names people to
     them. Before the board said who was reading, it hid everybody from everybody on these check-ins. */
  it('Baraka, a colleague giving a view, still reads who is on it on the board, as the lead chose', async () => {
    const b = await boardAs({
      scenario: (GroundScenario as any)[scenario], peersVisibleToEachOther: true,
      commitments: [commitment('k-1', 'p-baraka', 'I will send the pricing sheet.'), commitment('k-2', 'p-rukia', 'I will send the Westgate quote.')],
    }, ...BARAKA);
    /* Who is on it is read from the list of people. Since request 105 (the prototype's B5) a person who checks in
       is not served the grid of who checked in, which is the lead's; before, Baraka read the names there. */
    expect((b.participants as any[]).map((r) => r.name)).toEqual(['Amina Wanjiru', 'Rukia Mwangi', 'Baraka Otieno']);
    expect(b.checkInGrid).toBeUndefined();
    /* What each person said they would do stays with them on an evaluation check-in (request 78), whatever the switch. */
    expect(served(b)).not.toContain('Westgate quote');
  });

  it('Amina, who runs it, still reads the colleague on the board', async () => {
    const b = await boardAs({
      scenario: (GroundScenario as any)[scenario], peersVisibleToEachOther: true,
      commitments: [commitment('k-1', 'p-baraka', 'I will send the pricing sheet.')],
    }, ...AMINA);
    expect(served(b)).toContain('pricing sheet');
  });
});

describe('everywhere else, the lead\'s switch still decides', () => {
  it('an ordinary check-in with the switch on names the colleague to Ade', async () => {
    const r: any = await makeService(makeGround('OKR_ALIGNMENT', { peers: true })).get('g1', 'user-2', 'org-1');
    expect(r.sharedPicture).toContain('Chidi');
  });

  it('an ordinary check-in with the switch off does not', async () => {
    const r: any = await makeService(makeGround('OKR_ALIGNMENT', { peers: false })).get('g1', 'user-2', 'org-1');
    expect(served(r)).not.toMatch(/Chidi|Okoro/);
  });

  it('the rule itself: evaluation never, a cohort and an ordinary check-in follow the switch', () => {
    for (const s of ['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL']) {
      for (const v of [true, false, null]) expect(peersAreNamedOn({ scenario: s, peersVisibleToEachOther: v })).toBe(false);
    }
    expect(peersAreNamedOn({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: true })).toBe(true);
    expect(peersAreNamedOn({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null })).toBe(false);
    expect(peersAreNamedOn({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null })).toBe(true);
    expect(peersAreNamedOn({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: false })).toBe(false);
  });
});
