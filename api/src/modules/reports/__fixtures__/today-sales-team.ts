import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/** The sales team of week 16's Today tests: two rounds, two people waiting on the lead for one decision. Shared by the report's and the board's specs. */
const LEAD = {
  id: 'p-lead', userId: 'u-wairimu', partyType: PartyType.INITIATOR, email: 'w@baridi.test',
  roleAsDescribed: 'runs the sales team', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const person = (id: string, userId: string, first: string, last: string) => ({
  id, userId, partyType: PartyType.PARTICIPANT, email: `${userId}@baridi.test`, roleAsDescribed: 'sales',
  nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: first, lastName: last },
});
const BRIAN = person('p-brian', 'u-brian', 'Brian', 'Otieno');
const MIRIAM = person('p-miriam', 'u-miriam', 'Miriam', 'Wanjiku');

const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
/* Round 1 finished on 15 September, round 2 on 22 September. "Since last" is since 15 September. */
const CHECK_INS = ['p-brian', 'p-miriam'].flatMap((pid) => [1, 2].map((n) => ({
  id: `c-${pid}-${n}`, participantId: pid, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: at(n === 1 ? '15' : '22'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
})));

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYONE', label: 'Sales team, Q3',
  participants: [LEAD, BRIAN, MIRIAM],
  checkIns: CHECK_INS,
  report: null,
  objectives: [
    { id: 'o1', groundId: 'g-sales', name: 'Freezers sold', target: 25, count: 21, prevCount: 18, ownerParticipantId: null, sortOrder: 0 },
    { id: 'o2', groundId: 'g-sales', name: 'Quotes sent', target: 10, count: 6, prevCount: 4, ownerParticipantId: 'p-miriam', sortOrder: 1 },
  ],
  dependencies: [
    /* Brian and Miriam both raised it this round, and only the lead can settle it. */
    { id: 'd1', groundId: 'g-sales', fromParticipantId: 'p-brian', onParticipantId: 'p-lead', onLabel: null, blockerKind: 'DECISION',
      what: 'Whether a price range counts as a budget', status: 'WAITING', then: 'it changes how 4 deals are counted',
      triedSaid: null, escalatedAt: null, clearedAt: null, sourceCheckInId: 'c-p-brian-2', createdAt: at('20'), updatedAt: at('20') },
    { id: 'd2', groundId: 'g-sales', fromParticipantId: 'p-miriam', onParticipantId: 'p-lead', onLabel: null, blockerKind: 'DECISION',
      what: 'whether a price range counts as a budget', status: 'WAITING', then: null,
      triedSaid: null, escalatedAt: null, clearedAt: null, sourceCheckInId: 'c-p-miriam-2', createdAt: at('21'), updatedAt: at('21') },
    /* Miriam's price list came through this round. */
    { id: 'd3', groundId: 'g-sales', fromParticipantId: 'p-miriam', onParticipantId: null, onLabel: 'Finance', blockerKind: null,
      what: 'the price list', status: 'CLEARED', then: null,
      triedSaid: 'I asked finance', escalatedAt: null, clearedAt: at('20'), sourceCheckInId: 'c-p-miriam-1', createdAt: at('14'), updatedAt: at('20') },
  ],
  poll: null,
};
const SNAPSHOTS: Record<number, { objectiveId: string; count: number }[]> = {
  1: [{ objectiveId: 'o1', count: 18 }, { objectiveId: 'o2', count: 4 }],
  2: [{ objectiveId: 'o1', count: 21 }, { objectiveId: 'o2', count: 6 }],
};
const NOTES = [{ id: 'n1', text: 'Decide whether Kito Foods stays on the list', kind: 'DECISION', audience: 'LEAD_ONLY', closedAt: null }];

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

export function prismaFor(viewerRole = 'MEMBER') {
  const writes: string[] = [];
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
  };
  const model = (name: string, own: Record<string, any> = {}) => new Proxy({ ...reads, ...own }, {
    get(target: any, prop: string) {
      if (WRITES.includes(prop)) return jest.fn(async () => { writes.push(`${name}.${prop}`); return {}; });
      return target[prop];
    },
  });
  const prisma: any = new Proxy({
    ground: model('ground', { findUnique: jest.fn(async () => structuredClone(GROUND)) }),
    user: model('user', { findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model('checkIn', { findMany: jest.fn(async () => structuredClone(CHECK_INS)) }),
    groundContextItem: model('groundContextItem', { findMany: jest.fn(async () => structuredClone(NOTES)) }),
    /* Where each count stood as each round closed: what moved is read from these, on every surface. */
    groundObjectiveSnapshot: model('groundObjectiveSnapshot', { findMany: jest.fn(async (args: any) => structuredClone(SNAPSHOTS[args?.where?.sessionNumber] ?? [])) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model(prop);
      return target[prop];
    },
  });
  return { prisma, writes };
}

