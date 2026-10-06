import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * WHAT EACH PERSON'S ROW SAYS NAMES NO HIDDEN NUMBER TO AN ADMIN. Screens request 63.
 *
 * Read live as an admin who only reads: `eachPerson[].says` named Rukia's target, which `objectives`
 * withheld from the same reader. Here Aisha is behind the pace of a target only she and the lead may
 * see (THEIR_OWN). The lead reads "Aisha Otieno is at 1 of 40 ...". Since decision 86, an admin who
 * only reads, the chief executive included, reads the same row with the same number.
 */
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT, managingOnly = false) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly, signedOffAt: null, createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-lead', 'u-rukia', 'Rukia', 'Mwangi', PartyType.INITIATOR, true), person('p-aisha', 'u-aisha', 'Aisha', 'Otieno')];
const CHECK_INS = [1, 2, 3].map((n) => ({
  id: `c${n}`, participantId: 'p-aisha', sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
}));

function boardAs(userId: string, role: string, whoSeesTargets: string) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-rukia', createdByUserId: 'u-rukia', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 28, cadence: 'WEEKLY', totalSessions: 4,
    whoSeesTargets, label: 'Sales team, Q3', participants: PEOPLE, checkIns: CHECK_INS, report: null, dependencies: [], poll: null,
    objectives: [{ id: 'o-1', name: 'Shops signed', target: 40, count: 1, prevCount: 1, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: [],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') }],
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
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

const aishasRow = (board: any) => (board.eachPerson ?? []).find((r: any) => r.participantId === 'p-aisha');

describe("each person's row, where each target is seen only by its owner and the lead", () => {
  it('the lead reads that Aisha is behind, with her number', async () => {
    const row = aishasRow(await boardAs('u-rukia', 'MEMBER', 'THEIR_OWN'));
    expect(row.reason).toBe('behind the pace');
    expect(row.says).toBe('Aisha Otieno is at 1 of 40, and 3 of the 4 rounds have gone. At this pace, 40 would not be reached by the end.');
  });

  /*
   * Decision 86 reverses decision 73 for admins: an admin, the chief executive included, sees the
   * figures. This test used to pin that the admin read "Aisha Otieno has checked in." and no 40
   * anywhere. The admin now reads what the lead reads.
   */
  it('an admin who only reads is served her row with her number, as the lead reads it', async () => {
    const board = await boardAs('u-grace', 'ADMIN', 'THEIR_OWN');
    const row = aishasRow(board);
    expect(row.reason).toBe('behind the pace');
    expect(row.says).toBe('Aisha Otieno is at 1 of 40, and 3 of the 4 rounds have gone. At this pace, 40 would not be reached by the end.');
    expect((board.objectives ?? []).map((o: any) => o.target)).toEqual([40]);
  });
});
