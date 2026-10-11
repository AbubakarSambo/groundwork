import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * THE LEAD'S PRIVATE NOTE ON WHETHER A GOAL WAS TOLD STAYS THE LEAD'S (reviewer's audit, 7 October; the check-in page's own comment).
 *
 * `awarenessDetail` is what the lead wrote about how she told Tobi his goal ("told him over lunch, he did not look sure"). Read as Tobi, a
 * colleague, the lead and an admin who runs it, on a check-in where each reads only their own numbers and on one where everybody reads
 * everybody's: only whoever runs it reads the note. That the lead says it was told (`awareness`) is still shown to Tobi, because the gap
 * being visible is the point.
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
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: LEAD, createdByUserId: THE_ADMIN, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets,
    participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [{ id: 'go1', name: 'Eight proposals out', target: 8, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false }],
    report: null,
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
    leadContextNote: { findMany: async () => [] },
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


describe('the lead\'s private note on whether a goal was told', () => {
  for (const setting of ['THEIR_OWN', 'EVERYBODY']) {
    it(`Tobi and a colleague read none of it (${setting})`, async () => {
      for (const who of [TOBI, COLLEAGUE]) {
        const page = await pageFor(who, 'MEMBER', setting);
        expect(JSON.stringify(page)).not.toContain('LEAD-PRIVATE-NOTE');
      }
    });

    it(`the lead and an admin who runs it read it (${setting})`, async () => {
      for (const [who, role] of [[LEAD, 'LEAD'], [THE_ADMIN, 'ADMIN']] as const) {
        const page = await pageFor(who, role, setting);
        expect(JSON.stringify(page)).toContain('LEAD-PRIVATE-NOTE');
      }
    });
  }

  it('Tobi still reads that the lead says it was told, which is the point of it being visible', async () => {
    const page = await pageFor(TOBI, 'MEMBER');
    const row = (page.participants ?? []).find((p: any) => p.id === 'p-tobi');
    expect(row.objective.awareness).toBe('TOLD');
    expect(row.objective.awarenessDetail).toBeNull();
  });
});
