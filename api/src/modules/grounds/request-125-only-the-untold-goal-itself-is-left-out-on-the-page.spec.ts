import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * REQUEST 125, FINDING 5, ON `GET /grounds/:id`. Amina set Tobi two goals and has told him one. Tobi lost both, and Chidi,
 * a colleague who sees everybody's targets, lost both. Now only the goal not told is left out.
 */
const AMINA = 'u-amina', TOBI = 'u-tobi', CHIDI = 'u-chidi', ADMIN = 'u-admin';
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string) => ({ id, userId, email: `${id}@x.test`, partyType, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: partyType === PartyType.INITIATOR, invitedAt: new Date('2026-09-01'), notifiedAt: new Date('2026-09-01'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: first, lastName: last } });
const people = () => [person('p-amina', AMINA, PartyType.INITIATOR, 'Amina', 'Bello'), person('p-tobi', TOBI, PartyType.PARTICIPANT, 'Tobi', 'Adewale'), person('p-chidi', CHIDI, PartyType.PARTICIPANT, 'Chidi', 'Okafor')];
const RECENT = new Date(Date.now() - 2 * 86400000);
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: 'Close eight renewals a quarter.', kind: 'TARGET', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: null, dueSaid: null, createdAt: RECENT, updatedAt: RECENT },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: 'Lead the client conversations fully.', kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: true, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: RECENT, updatedAt: RECENT },
];

export function pageFor(userId: string, role: string, createdBy = AMINA, goals: any[] = GOALS): Promise<any> {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: AMINA, createdByUserId: createdBy, createdAt: new Date('2026-09-20'), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY', participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [
      { id: 'go1', name: 'Tobi to close 8 renewals per quarter.', target: 8, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
      { id: 'go2', name: 'Lead the client conversations fully.', target: 3, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
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
  const prisma: any = new Proxy(own, { get(t: any, p: string) { if (!(p in t) && typeof p === 'string' && !p.startsWith('$') && p !== 'then') t[p] = { ...reads }; return t[p]; } });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any).get('g1', 'org1', userId) as Promise<any>;
}
const names = (page: any): string[] => (page.objectives ?? []).map((o: any) => o.name);

describe('on the check-in page only the goal not told is left out', () => {
  it.each([['Tobi', TOBI, 'MEMBER', AMINA], ['Chidi, a colleague who sees everybody\'s targets', CHIDI, 'MEMBER', AMINA]] as [string, string, string, string][])('%s reads the goal Amina told Tobi about, and not the other', async (_n, u, r, c) => {
    const page = await pageFor(u, r, c);
    expect(names(page)).toContain('Lead the client conversations fully.');
    expect(JSON.stringify(page)).not.toContain('8 renewals');
  });

  it('Amina reads both', async () => {
    expect(names(await pageFor(AMINA, 'MEMBER')).join(' | ')).toContain('8 renewals');
  });
});

describe('the admin who set the check-in up runs it, so she reads the goal not told', () => {
  it('reads both goals on the check-in page when she created it, and also when she only reads, since every admin of the organisation reads it (decisions 5 and 86)', async () => {
    const setUp = await pageFor(ADMIN, 'ADMIN', ADMIN);
    expect(names(setUp).join(' | ')).toContain('Lead the client conversations fully.');
    expect(names(setUp).join(' | ')).toContain('8 renewals');
    const reads = await pageFor(ADMIN, 'ADMIN', AMINA);
    expect(names(reads).join(' | ')).toContain('Lead the client conversations fully.');
    expect(names(reads).join(' | ')).toContain('8 renewals');
  });
});
