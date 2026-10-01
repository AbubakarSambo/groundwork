import { ReportsService } from './reports.service';
import { theSentencesOf } from './the-mark-on-every-line';

/**
 * WHAT A COLLEAGUE'S WORDS AND JOB LEAVE BEHIND, SENTENCE BY SENTENCE (the 1 October review, part 1).
 *
 * The team report is served twice: as one text, and as its sentences with a mark beside each (`sharedPictureLines`).
 * The first had a colleague's quote taken out for the person reviewed; the second kept it, and kept a sentence
 * that says what the colleague's job is ("A colleague is the account manager."), which gives them away
 * (decision 17). Both are read here, through the real report read, as each reader.
 */

const THE_SUBJECTS_LINE = 'Closed 14 support tickets this week and started the new onboarding flow.';
const THE_COLLEAGUES_LINE = 'Ade has been slow to answer two escalations, and I had to step in on the Kessler account.';

const THE_JOB = 'Participant B is the account manager.';
const THE_QUOTED_CONFIRMATION = 'ongoing discussions, mainly regarding handover times';
const SENTENCES = [
  'All three people have answered.',
  THE_JOB,
  `Participant B confirms there have been "${THE_QUOTED_CONFIRMATION}".`,
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

function makeGround(scenario: string, opts: { createdByUserId?: string | null } = {}) {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    createdByUserId: opts.createdByUserId ?? null,
    whoSeesTargets: 'THEIR_OWN',
    scenario,
    peersVisibleToEachOther: null,
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

function makeService(ground: any, userRole: 'ADMIN' | 'MEMBER' = 'MEMBER') {
  const clone = () => structuredClone(ground);
  const entries = [
    { id: 'e1', text: THE_SUBJECTS_LINE, saidWordForWord: true, participantId: 'subject' },
    { id: 'e2', text: THE_COLLEAGUES_LINE, saidWordForWord: true, participantId: 'colleague' },
    { id: 'e3', text: `There have been ${THE_QUOTED_CONFIRMATION}.`, saidWordForWord: true, participantId: 'colleague' },
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


const linesOf = (r: any) => (r.sharedPictureLines ?? []).map((l: any) => l.text).join(' | ');

describe('on a renewal, the person reviewed reads no colleague\'s words and no colleague\'s job, in the picture or in its lines', () => {
  it('the person reviewed', async () => {
    const r: any = await makeService(makeGround('CONTRACT_RENEWAL')).get('g1', 'user-2', 'org-1');
    for (const read of [r.sharedPicture, linesOf(r)]) {
      expect(read).not.toContain(THE_QUOTED_CONFIRMATION);
      expect(read).not.toMatch(/account manager/i);
      expect(read).not.toMatch(/there have been\.|confirms there have been/);
    }
    /* Their own words and the facts stay, and no sentence is left in pieces. */
    expect(linesOf(r)).toContain(THE_SUBJECTS_LINE);
    expect(linesOf(r)).toContain('All three people have answered.');
    expect(linesOf(r)).toContain('A colleague described this differently.');
    /* Every line still has its mark. */
    expect((r.sharedPictureLines as any[]).every((l) => l.mark)).toBe(true);
  });

  it('the lead reads the same lines as they were written', async () => {
    const r: any = await makeService(makeGround('CONTRACT_RENEWAL')).get('g1', 'user-1', 'org-1');
    expect(linesOf(r)).toContain(THE_QUOTED_CONFIRMATION);
    expect(linesOf(r)).toContain('account manager');
  });

  it('a colleague who gave a view reads what they read before', async () => {
    const r: any = await makeService(makeGround('CONTRACT_RENEWAL')).get('g1', 'user-3', 'org-1');
    expect(linesOf(r)).toContain('says');
  });

  it('an ordinary check-in is unchanged', async () => {
    const r: any = await makeService(makeGround('OKR_ALIGNMENT')).get('g1', 'user-2', 'org-1');
    expect(linesOf(r)).toContain(THE_QUOTED_CONFIRMATION);
    expect(linesOf(r)).toContain('account manager');
  });
});
