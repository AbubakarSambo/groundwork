import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * A CHECK-IN THAT HIDES PEOPLE FROM EACH OTHER DOES NOT LIST THEM ON THE BOARD. Screens request 50.
 *
 * The board's `participants` carried every row to every reader: on a check-in where people give
 * their accounts without seeing each other, a participant read "Another colleague", "A third
 * colleague", and whether each had signed off, so they could count their colleagues and follow each
 * one. The check-in read already refuses that. Now such a participant is served their own row and the
 * lead's, and `aTeamReportComes` says, as a yes or no, whether more than one person answers, which is
 * what the board's "only one person here" notice needs. The lead and an admin read every row.
 */
const person = (id: string, userId: string, first: string, partyType: PartyType = PartyType.PARTICIPANT, managingOnly = false) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null,
  managingOnly, signedOffAt: null, createdAt: new Date(`2026-09-01T1${id.length % 10}:00:00Z`), user: { firstName: first, lastName: 'Test' },
});
const PEOPLE = [
  person('p-lead', 'u-rukia', 'Rukia', PartyType.INITIATOR, true),
  person('p-amani', 'u-amani', 'Amani'),
  person('p-juma', 'u-juma', 'Juma'),
  person('p-neema', 'u-neema', 'Neema'),
];

function boardAs(userId: string, { hidden, role = 'MEMBER', people = PEOPLE }: { hidden: boolean; role?: string; people?: any[] }) {
  const ground: any = {
    id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-rukia', createdByUserId: 'u-rukia', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: !hidden, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'EVERYONE', label: 'Sales team, Q3', participants: people,
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

describe('on a check-in that hides people from each other', () => {
  it('a participant is served their own row and the lead\'s, and nobody else\'s', async () => {
    const board = await boardAs('u-amani', { hidden: true });
    expect(board.participants.map((p: any) => p.id)).toEqual(['p-lead', 'p-amani']);
    expect(board.participants.map((p: any) => p.name)).toEqual(['Rukia Test', 'Amani Test']);
    expect(JSON.stringify(board.participants)).not.toMatch(/p-juma|p-neema|olleague/);
  });

  it('and is told, as a yes or no, that more than one person answers', async () => {
    const board = await boardAs('u-amani', { hidden: true });
    expect(board.aTeamReportComes).toBe(true);
  });

  it('and where only they answer, that nobody else does', async () => {
    const board = await boardAs('u-amani', { hidden: true, people: PEOPLE.slice(0, 2) });
    expect(board.aTeamReportComes).toBe(false);
  });

  it('the lead reads every row', async () => {
    const board = await boardAs('u-rukia', { hidden: true });
    expect(board.participants.map((p: any) => p.name)).toEqual(['Rukia Test', 'Amani Test', 'Juma Test', 'Neema Test']);
    expect(board.aTeamReportComes).toBe(true);
  });

  it('an admin of the organisation reads every row', async () => {
    const board = await boardAs('u-grace', { hidden: true, role: 'ADMIN' });
    expect(board.participants).toHaveLength(4);
  });
});

describe('on a check-in where people see each other', () => {
  it('a participant reads every row, by name, as before', async () => {
    const board = await boardAs('u-amani', { hidden: false });
    expect(board.participants.map((p: any) => p.name)).toEqual(['Rukia Test', 'Amani Test', 'Juma Test', 'Neema Test']);
    expect(board.aTeamReportComes).toBe(true);
  });
});
