import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 4 (decision 93, row 24; decisions 5 and 56).
 *
 * On a check-in where each person reads only their own numbers (`whoSeesTargets` THEIR_OWN, the default), the admin
 * who set it up was served "Nobody has said what success looks like for this person." for Tobi on the check-in page,
 * though the lead had set goals for him and the admin's own board carried them. The page asked "is this the lead?",
 * and everywhere else asks "does this reader run the check-in?". An admin runs it, so the page now reads whole.
 * Tobi, who the goals are about, and a colleague, keep reading only what they read before.
 */
const LEAD = 'u-lead';
const TOBI = 'u-tobi';
const COLLEAGUE = 'u-colleague';
const THE_ADMIN = 'u-admin-who-set-it-up';
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
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: UNTOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
  { id: 'o3', groundId: 'g1', participantId: 'p-tobi', text: TOLD_WITH_A_NUMBER, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03') },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];

function pageFor(userId: string, role: string) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: LEAD, createdByUserId: THE_ADMIN, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
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

const tobisRow = (page: any) => (page.participants ?? []).find((p: any) => p.id === 'p-tobi');

describe('the check-in page, where each person reads only their own numbers', () => {
  it('the admin who set it up reads Tobi\'s goals, the one not told yet marked as not told', async () => {
    const page = await pageFor(THE_ADMIN, 'ADMIN');
    const objective = tobisRow(page).objective;
    expect(objective.described).not.toBe('Nobody has said what success looks like for this person.');
    const all = (objective.all ?? []).map((o: any) => o.text);
    expect(all).toEqual(expect.arrayContaining([TOLD, UNTOLD]));
    expect((objective.all ?? []).find((o: any) => o.text === UNTOLD)?.notToldYet).toBe(true);
  });

  it('the admin who set it up reads a goal that carries Tobi\'s number; an admin who only reads does not', async () => {
    const setter = await pageFor(THE_ADMIN, 'ADMIN');
    expect((tobisRow(setter).objective.all ?? []).map((o: any) => o.text)).toContain(TOLD_WITH_A_NUMBER);
    const reader = await pageFor('u-admin-who-only-reads', 'ADMIN');
    expect(JSON.stringify(reader)).not.toContain(TOLD_WITH_A_NUMBER);
    /* and is not left a goal with no words in it */
    expect((tobisRow(reader).objective.all ?? []).every((o: any) => (o.text ?? '').trim().length > 0)).toBe(true);
  });

  it('the lead reads the same', async () => {
    const page = await pageFor(LEAD, 'LEAD');
    expect((tobisRow(page).objective.all ?? []).map((o: any) => o.text)).toEqual(expect.arrayContaining([TOLD, UNTOLD]));
  });

  it('a colleague reads nothing of Tobi\'s goals, and Tobi never reads the one not told', async () => {
    const colleague = await pageFor(COLLEAGUE, 'MEMBER');
    expect(JSON.stringify(colleague)).not.toContain(UNTOLD);
    expect(JSON.stringify(colleague)).not.toContain(TOLD);
    expect((colleague.objectives ?? []).map((o: any) => o.name)).not.toContain('Eight proposals out');
    const tobi = await pageFor(TOBI, 'MEMBER');
    expect(JSON.stringify(tobi)).not.toContain(UNTOLD);
  });
});
