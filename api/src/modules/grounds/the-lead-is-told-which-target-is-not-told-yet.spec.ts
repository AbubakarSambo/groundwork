import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * (Final check, 9 October.) THE LEAD'S CONTEXT PAGE SAYS WHICH TARGET IS KEPT FROM THE PEOPLE. The target the lead has not told Tobi
 * about reached her page with nothing to tell it from the others, and the screen said "Seen by everyone" of it. It now carries
 * `notToldYet` for whoever runs the check-in, and for nobody else. Original header of the file this copies its set-up from:
 *
 * REQUEST 125, ITEM 1 (decisions 48 and 56). The board hid Tobi's target that Amina had not told him
 * about; `GET /grounds/:id` sent it to him in full under `objectives`. Read here as the lead (Amina),
 * the new hire (Tobi) and an admin who only reads, on the check-in page.
 */
const AMINA = 'u-amina';
const TOBI = 'u-tobi';
const ADMIN = 'u-admin';
const UNTOLD = 'Manage the renewal process for at least one of the clients.';
/* The lead's stored goal and the objective the engine wrote from it are in different words, as in the running product. */
const UNTOLD_AS_THE_LEAD_WROTE_IT = 'Take the renewals over from Amina.';
const TOLD = 'Lead the client conversations fully.';
const WEEK_AGO_PLUS = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const people = () => [
  { id: 'p-amina', userId: AMINA, email: 'a@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Dr', lastName: 'Amina Bello' } },
  { id: 'p-tobi', userId: TOBI, email: 't@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date('2026-09-02T09:00:00Z'), notifiedAt: new Date('2026-09-02T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Tobi', lastName: 'Adewale' } },
];
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: UNTOLD_AS_THE_LEAD_WROTE_IT, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: null, dueSaid: null, createdAt: WEEK_AGO_PLUS, updatedAt: WEEK_AGO_PLUS },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];

function pageFor(userId: string, role: string, goals: any[] = GOALS) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: AMINA, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY',
    participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [
      { id: 'go1', name: UNTOLD, target: null, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
      { id: 'go2', name: TOLD, target: null, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
      { id: 'go3', name: 'Keep the team on one calendar.', target: null, ownerParticipantId: null, assumes: null, isADecisionAboutAPerson: false },
    ],
    report: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const own: any = {
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => JSON.parse(JSON.stringify(goals))) },
    wordedLine: { findUnique: async () => ({ text: 'the renewals' }), findFirst: async () => ({ text: 'the renewals' }) },
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


const flag = (page: any, name: string) => (page.objectives ?? []).find((o: any) => o.name === name)?.notToldYet;

describe('the targets the lead has not told anybody about are marked, for the people who run the check-in', () => {
  it('the lead reads the untold target marked, and the told ones not', async () => {
    const page = await pageFor(AMINA, 'MEMBER');
    expect(flag(page, UNTOLD)).toBe(true);
    expect(flag(page, TOLD)).toBeUndefined();
    expect(flag(page, 'Keep the team on one calendar.')).toBeUndefined();
  });
  it('an admin who reads it is told too', async () => {
    expect(flag(await pageFor(ADMIN, 'ADMIN'), UNTOLD)).toBe(true);
  });
  it('the person it is for is not sent the target at all, and nothing says it exists', async () => {
    const page = await pageFor(TOBI, 'MEMBER');
    expect(JSON.stringify(page.objectives)).not.toContain('notToldYet');
  });
});
