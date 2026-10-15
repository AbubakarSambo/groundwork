import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';
import { prismaFor } from '../reports/__fixtures__/today-sales-team';

/**
 * ITEM 21, THE FOUNDER'S BOARD: TWO GOALS NOT TOLD YET ARE ONE SENTENCE, NOT THE SAME SENTENCE TWICE.
 *
 * "A second founder joining" (local test database, 9a904212): Ada read, under Tunde in "The team
 * today", "Tunde Bakare has not been told about this goal yet. Talk it through together before
 * reading anything into it." twice in a row, once for each of two goals she had not told him. It is
 * now one sentence with how many. The point is the lead's only, as before.
 */
const UNTOLD = [
  { participantId: 'p-brian', text: 'Close 12 new shops in Kilimani by December', awareness: 'NOT_TOLD', authoredBy: 'lead' },
  { participantId: 'p-brian', text: 'Bring the late payments under 5 percent', awareness: 'NOT_TOLD', authoredBy: 'lead' },
];

async function boardAs(userId: string, role = 'MEMBER'): Promise<any> {
  const { prisma } = prismaFor(role);
  prisma.personObjective = { findMany: jest.fn(async (args: any) => (args?.where?.awareness === 'NOT_TOLD' ? structuredClone(UNTOLD) : [])), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0) };
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports).get('g-sales', userId);
}

describe('two goals not told yet, as each reader reads the board', () => {
  it('Wairimu, who runs it, reads one sentence under Brian, with how many', async () => {
    const b = await boardAs('u-wairimu');
    const brian = (b.eachPersonToday ?? []).find((r: any) => /^Brian/.test(String(r.who)));
    expect(brian.conversationPoints).toEqual(['Brian Otieno has not been told about 2 goals yet. Talk them through together before reading anything into them.']);
  });
  it('Brian, who checks in, is served no conversation point', async () => {
    expect(JSON.stringify(await boardAs('u-brian'))).not.toMatch(/has not been told about/);
  });
  it('an admin outside the check-in is served no conversation point', async () => {
    expect(JSON.stringify(await boardAs('u-grace', 'ADMIN'))).not.toMatch(/has not been told about/);
  });
});
