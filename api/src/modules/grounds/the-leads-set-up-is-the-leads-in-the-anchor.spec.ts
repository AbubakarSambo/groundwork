import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * THE ANCHOR CHECK-IN: THE LEAD'S SET-UP IS THE LEAD'S (decision 96, item 8; screens request 168 item 1; known issue P13).
 *
 * Rehema leads an anchor check-in (`startedFrom` is "anchor"). Her aim, "Rehema is aiming for the sales and production teams to
 * coordinate on timelines", is stored as the check-in's objective, with what it will cover and what a complete answer holds. A member
 * read all three on the check-in page. Read as a member, a colleague in it, the lead and an admin. The wall holds with the anchor
 * switched off, because it is about who may read the lead's set-up.
 *
 * (Fixture borrowed from the privacy sweep's finding 4.)
 */
/* ORIGINAL NOTE: PRIVACY SWEEP 5 OCTOBER 2026, FINDING 4 (decision 93, row 24; decisions 5 and 56).
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

function pageFor(userId: string, role: string, startedFrom: string | null = 'anchor') {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: LEAD, createdByUserId: THE_ADMIN, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY', startedFrom,
    subjectsToCover: [{ subject: 'ONE-LATE-JOB-CAN-COST-THE-NEXT-THREE-ORDERS' }], whatACompleteAnswerHolds: [{ field: 'WHAT-A-COMPLETE-ANSWER-HOLDS' }],
    participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [{ id: 'go1', name: 'Rehema is aiming for the sales and production teams to coordinate on timelines', target: null, ownerParticipantId: null, assumes: null, isADecisionAboutAPerson: false }],
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


const SECRETS = /Rehema is aiming|ONE-LATE-JOB|WHAT-A-COMPLETE-ANSWER/;

describe('an anchor check-in, read as each person', () => {
  it('a member and a colleague read none of the lead\'s set-up', async () => {
    for (const who of [TOBI, COLLEAGUE]) {
      const page = await pageFor(who, 'MEMBER');
      expect(JSON.stringify(page)).not.toMatch(SECRETS);
      expect(page.objectives).toEqual([]);
      expect(page.subjectsToCover ?? null).toBeNull();
      expect(page.whatACompleteAnswerHolds ?? null).toBeNull();
    }
  });

  it('the lead reads it whole, and so does an admin who runs it', async () => {
    for (const [who, role] of [[LEAD, 'LEAD'], [THE_ADMIN, 'ADMIN']] as const) {
      const page = await pageFor(who, role);
      expect((page.objectives ?? []).map((o: any) => o.name)).toEqual(['Rehema is aiming for the sales and production teams to coordinate on timelines']);
      expect(JSON.stringify(page)).toContain('ONE-LATE-JOB');
      expect(JSON.stringify(page)).toContain('WHAT-A-COMPLETE-ANSWER');
    }
  });

  it('a check-in that was not started from the anchor reads as it did, for a member', async () => {
    const page = await pageFor(TOBI, 'MEMBER', null);
    expect((page.objectives ?? []).map((o: any) => o.name)).toEqual(['Rehema is aiming for the sales and production teams to coordinate on timelines']);
  });
});
