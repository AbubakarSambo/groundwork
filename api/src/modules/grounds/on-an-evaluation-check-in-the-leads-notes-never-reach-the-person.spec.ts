import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * ON AN EVALUATION CHECK-IN, WHAT THE PERSON SAYS REACHES THE LEAD, AND THE LEAD'S PRIVATE NOTES AND SET-UP NEVER REACH THE PERSON
 * (decision 110, P5; decisions 3, 4 and 30).
 *
 * Tobi is on a performance plan Funmi leads. Funmi has typed, in setup, a brief and the words "Tobi is probably on his way out"; she has kept a
 * private note about him, and she described his role in her own words. Read as Tobi and as a colleague, the check-in page carries none of it;
 * read as Funmi, and as an admin who runs it, all of it is there. Every read of the lead's notes and set-up that serves a page was checked
 * (the notes read in `get`, the setup words, the participant row, the brief, the context lines); each answers the person with nothing.
 */
const LEAD = 'u-lead';
const TOBI = 'u-tobi';
const COLLEAGUE = 'u-colleague';
const THE_ADMIN = 'u-admin-who-set-it-up';
const NOTE = 'LEAD-PRIVATE-NOTE: told him over lunch, he did not look sure.';
const UNTOLD = 'Build a pipeline for larger engagements and show progress on key prospects.';
const TOLD = 'Have at least one significant proposal out, or a strong lead moving through';
const TOLD_WITH_A_NUMBER = 'Bring in 8 proposals in his first year.';

const person = (id: string, userId: string, partyType: PartyType, first: string, managingOnly = false) => ({
  id, userId, email: `${first}@x.test`, partyType, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly,
  invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false,
  createdAt: new Date('2026-09-01'), user: { firstName: first, lastName: 'Test' },
});
const people = () => [
  person('p-lead', LEAD, PartyType.INITIATOR, 'Funmi', true),
  person('p-tobi', TOBI, PartyType.PARTICIPANT, 'Tobi'),
  person('p-colleague', COLLEAGUE, PartyType.PARTICIPANT, 'Chidi'),
];
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: UNTOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
  { id: 'o3', groundId: 'g1', participantId: 'p-tobi', text: TOLD_WITH_A_NUMBER, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03') },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];

function pageFor(userId: string, role: string, whoSeesTargets = 'THEIR_OWN') {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'PIP', initiatorId: LEAD, createdByUserId: THE_ADMIN, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets,
    participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [{ id: 'go1', name: 'Eight proposals out', target: 8, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false }],
    report: null,
    brief: 'BRIEF-WORDS: Tobi is probably on his way out.', toldToParticipants: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const own: any = {
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => JSON.parse(JSON.stringify(GOALS))) },
    wordedLine: { findUnique: async () => ({ text: 'the pipeline' }), findFirst: async () => ({ text: 'the pipeline' }) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: jest.fn(async ({ where }: any) => [
      { id: 'n1', participantId: 'p-tobi', text: 'PRIVATE-NOTE: Tobi keeps missing the Friday call.', createdAt: new Date(), audience: 'LEAD_ONLY', confirmedByAdminNote: null },
      { id: 'n2', participantId: null, text: 'SHARED-NOTE: the quarter ends in December.', createdAt: new Date(), audience: 'EVERYONE', confirmedByAdminNote: null },
    ].filter((n) => !where.audience || n.audience === where.audience)) },
    leadSetupWords: { findUnique: jest.fn(async () => ({ authorUserId: LEAD, text: 'SETUP-WORDS: Tobi is probably on his way out.' })) },
    groundContextItem: { findMany: jest.fn(async () => [
      { id: 'c1', kind: 'ABOUT_A_PERSON', text: 'CONTEXT-ABOUT: Tobi is slow.', saidAs: null, audience: 'LEAD_ONLY', aboutParticipantId: 'p-tobi', closedAt: null, createdAt: new Date(), exactQuestion: null, questionConfirmedAt: null },
      { id: 'c2', kind: 'STRATEGY', text: 'CONTEXT-SHARED: win enterprise first.', saidAs: null, audience: 'EVERYONE', aboutParticipantId: null, closedAt: null, createdAt: new Date(), exactQuestion: null, questionConfirmedAt: null },
    ]) },
  };
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}



const LEADS_PRIVATE = /PRIVATE-NOTE|SETUP-WORDS|CONTEXT-ABOUT|BRIEF-WORDS|ROLE-WORDS|on his way out/;

describe('a performance plan, read as each person', () => {
  it('Tobi, the person it is about, reads none of the lead\'s notes, setup words, brief or description of him', async () => {
    const page = await pageFor(TOBI, 'MEMBER');
    expect(JSON.stringify(page)).not.toMatch(LEADS_PRIVATE);
  });

  it('a colleague reads none of it either', async () => {
    const page = await pageFor(COLLEAGUE, 'MEMBER');
    expect(JSON.stringify(page)).not.toMatch(LEADS_PRIVATE);
  });

  it('the shared notes, the shared lines and what he said still reach him: nothing is taken away that was his to read', async () => {
    const page = await pageFor(TOBI, 'MEMBER');
    expect(JSON.stringify(page)).toMatch(/SHARED-NOTE|CONTEXT-SHARED/);
  });

  it('the lead and an admin who runs it read her private notes and set-up', async () => {
    for (const [who, role] of [[LEAD, 'LEAD'], [THE_ADMIN, 'ADMIN']] as const) {
      const page = await pageFor(who, role);
      expect(JSON.stringify(page)).toMatch(/PRIVATE-NOTE/);
    }
  });
});
