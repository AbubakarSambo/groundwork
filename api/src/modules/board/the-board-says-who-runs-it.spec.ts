import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * THE BOARD SAYS WHO RUNS THE CHECK-IN (request 38). The screens call a person with no name "a
 * colleague" and a lead with no name "the lead", and the board's people carried nothing to tell
 * them apart, so a lead with no name was counted as one more colleague. Each person the board
 * serves now carries `partyType`: INITIATOR for whoever runs it, PARTICIPANT for everybody else.
 */
const person = (id: string, userId: string | null, first: string | null, partyType: PartyType) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: null, nameGiven: null, organisationGiven: null,
  managingOnly: false, signedOffAt: null, createdAt: new Date('2026-09-01T10:00:00Z'),
  user: first ? { firstName: first, lastName: 'Test' } : null,
});
const PEOPLE = [
  person('p-lead', 'u-lead', null, PartyType.INITIATOR),
  person('p-amani', 'u-amani', 'Amani', PartyType.PARTICIPANT),
  person('p-juma', 'u-juma', 'Juma', PartyType.PARTICIPANT),
];

function boardAs(userId: string, role = 'MEMBER') {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-lead', createdByUserId: 'u-lead', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'EVERYONE', label: 'Sales team', participants: PEOPLE,
    checkIns: [], report: null, objectives: [], dependencies: [], poll: null,
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-1', userId) as Promise<any>;
}

describe.each([
  ['the lead', 'u-lead', 'MEMBER'],
  ['a participant', 'u-amani', 'MEMBER'],
  ['an admin', 'u-grace', 'ADMIN'],
])('as %s', (_who, userId, role) => {
  it('each person the board serves says whether they run the check-in', async () => {
    const board = await boardAs(userId, role);
    expect(board.participants.map((p: any) => [p.id, p.partyType])).toEqual([
      ['p-lead', 'INITIATOR'], ['p-amani', 'PARTICIPANT'], ['p-juma', 'PARTICIPANT'],
    ]);
  });
});
