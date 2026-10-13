import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * AN ADMIN WHO IS THE PERSON A PLAN IS ABOUT CANNOT READ IT WHILE IT WAITS FOR APPROVAL (decision 110, P11; decision 75 item 2).
 *
 * Funmi leads a performance plan about Grace, who is an admin. While it waits, every admin is asked to approve it and reads it, and nothing named the
 * person, so Grace could read her own plan's setup. The lead names the person when she sets it up (they are on it, held, with the address she gave).
 * Read as Grace: refused, as if there were no such check-in. Read as Hana, another admin: asked to approve, reads it. Read as Funmi: reads it.
 */
const LEAD = 'u-lead';
const TOBI = 'u-tobi';
const COLLEAGUE = 'u-colleague';
const THE_ADMIN = 'u-admin-who-set-it-up';
const NOTE = 'LEAD-PRIVATE-NOTE: told him over lunch, he did not look sure.';
const UNTOLD = 'Build a pipeline for larger engagements and show progress on key prospects.';
const TOLD = 'Have at least one significant proposal out, or a strong lead moving through';
const TOLD_WITH_A_NUMBER = 'Bring in 8 proposals in his first year.';

const EMAIL: Record<string, string> = { 'u-grace': 'grace@x.test', 'u-hana': 'hana@x.test' };
const person = (id: string, userId: string, partyType: PartyType, first: string, managingOnly = false) => ({
  id, userId, email: `${first}@x.test`, partyType, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly,
  invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false,
  createdAt: new Date('2026-09-01'), user: { firstName: first, lastName: 'Test' },
});
const people = () => [
  person('p-lead', LEAD, PartyType.INITIATOR, 'Funmi', true),
  person('p-tobi', TOBI, PartyType.PARTICIPANT, 'Tobi'),
  /* Named at setup, held: the address the lead typed, and no account linked yet. */
  { ...person('p-grace', null as any, PartyType.PARTICIPANT, 'Grace'), email: 'GRACE@x.test', userId: null },
];
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: UNTOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
  { id: 'o3', groundId: 'g1', participantId: 'p-tobi', text: TOLD_WITH_A_NUMBER, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03') },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: NOTE, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];

function pageFor(userId: string, role: string, whoSeesTargets = 'THEIR_OWN', scenario = 'PIP') {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario, status: scenario === 'PIP' ? 'AWAITING_APPROVAL' : 'ACTIVE', approvedById: null, initiatorId: LEAD, createdByUserId: THE_ADMIN, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
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
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role, organizationId: 'org1', email: EMAIL[where.id] ?? `${where.id}@x.test` })) },
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



describe('a performance plan waiting for approval, about an admin', () => {
  it('Grace, whom it is about, cannot read it: it is not found for her', async () => {
    await expect(pageFor('u-grace', 'ADMIN')).rejects.toThrow('That check-in could not be found, so go back to your check-ins and open it from the list.');
  });

  it('Hana, another admin, is asked to approve it and reads it', async () => {
    const page = await pageFor('u-hana', 'ADMIN');
    expect(page.id).toBe('g1');
  });

  it('Funmi, who leads it, reads it', async () => {
    const page = await pageFor(LEAD, 'LEAD');
    expect(page.id).toBe('g1');
  });

  it('a check-in that is not an evaluation is read by every admin, the person named or not', async () => {
    const page = await pageFor('u-grace', 'ADMIN', 'EVERYBODY', 'OKR_ALIGNMENT');
    expect(page.id).toBe('g1');
  });
});
