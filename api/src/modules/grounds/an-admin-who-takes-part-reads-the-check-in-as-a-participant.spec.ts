import { GroundsService } from './grounds.service';
import { GroundMode, PartyType } from '@prisma/client';

/**
 * DECISION 121, ITEM 7, on GET /grounds/:id. An admin who takes part in a check-in is served exactly what a participant is served (not the lead's
 * brief, the lead's own words about a person, or the lead-only parts), unless she also runs it. An admin who is not in it is served as before.
 */
const LEAD = 'u-lead';
const NOW = new Date('2026-10-08T09:00:00Z');
const party = (id: string, userId: string, type: PartyType, n: number, extra: Record<string, unknown> = {}) => ({
  id, userId, email: `${id}@x.test`, partyType: type, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  invitedAt: NOW, notifiedAt: NOW, soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date(`2026-09-0${n}`),
  user: { firstName: id.replace('p-', ''), lastName: 'X' }, ...extra,
});
const BRIEF = 'The lead wants Baraka moved off the supplier work.';

function ground(inIt: boolean) {
  return {
    id: 'g1', scenario: 'OKR_ALIGNMENT', mode: GroundMode.SHARED, organizationId: 'org1', initiatorId: LEAD, createdByUserId: LEAD, createdAt: NOW,
    label: 'Team, Q3', cadence: 'WEEKLY', timelineDays: 90, peersVisibleToEachOther: true, restrictExternalVisibility: false, brief: BRIEF, toldToParticipants: null,
    participants: [
      party('p-lead', LEAD, PartyType.INITIATOR, 1, { roleAsDescribed: 'Baraka is the weak link' }),
      party('p-baraka', 'u-baraka', PartyType.PARTICIPANT, 2, { roleAsDescribed: 'supplier work, struggling' }),
      ...(inIt ? [party('p-juma', 'u-juma', PartyType.PARTICIPANT, 3)] : []),
    ],
    checkIns: [], objectives: [], dependencies: [], poll: null, report: null, resolution: null, patternDetections: [], status: 'ACTIVE',
  };
}

function service(inIt: boolean, jumaIs: 'ADMIN' | 'MEMBER') {
  const g = ground(inIt);
  const own: any = {
    groundBaseline: { findFirst: async () => null },
    personObjective: { findMany: async () => [] },
    ground: { findFirst: jest.fn(async () => JSON.parse(JSON.stringify(g))), findUnique: jest.fn(async () => JSON.parse(JSON.stringify(g))), findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.id === 'u-juma' ? jumaIs : where.id === LEAD ? 'LEAD' : 'MEMBER', organizationId: 'org1', email: `${where.id}@x.test` })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {} }) };
      }
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
}

describe('GET /grounds/:id for an admin who takes part in the check-in', () => {
  it('Juma, an admin who takes part, is served exactly what he is served as an ordinary member', async () => {
    const asAdmin = await service(true, 'ADMIN').get('g1', 'org1', 'u-juma');
    const asMember = await service(true, 'MEMBER').get('g1', 'org1', 'u-juma');
    expect(JSON.stringify(asAdmin)).toBe(JSON.stringify(asMember));
  });

  it('he reads neither the lead\'s brief nor the lead\'s own words about a person', async () => {
    const text = JSON.stringify(await service(true, 'ADMIN').get('g1', 'org1', 'u-juma'));
    expect(text).not.toContain(BRIEF);
    expect(text).not.toContain('weak link');
    expect(text).not.toContain('struggling');
  });

  it('the lead reads the brief as before', async () => {
    const text = JSON.stringify(await service(true, 'ADMIN').get('g1', 'org1', LEAD));
    expect(text).toContain(BRIEF);
  });

  it('an admin who is not in it is unchanged: she reads the brief, as an admin did before', async () => {
    const text = JSON.stringify(await service(false, 'ADMIN').get('g1', 'org1', 'u-juma'));
    expect(text).toContain(BRIEF);
  });
});
