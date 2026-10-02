import { ReportsService } from '../reports/reports.service';
import { BoardService } from './board.service';
import { prismaFor } from '../reports/__fixtures__/today-sales-team';

/**
 * WEEK 16: TODAY NEVER SAYS NOTHING NEEDS THE LEAD WHILE THEIR BOARD SHOWS SOMEBODY WAITING ON THEM,
 * AND THE BOARD NEVER SAYS IT EITHER. A row whose person is waiting on the reader said "has checked
 * in, and nothing here needs you this week" until the wait was a fortnight old; Today's `forTheLead`
 * lists it from the first day. Now the row says what they are waiting for.
 */
describe('week 16: the board never says nothing needs the lead while somebody is waiting on them', () => {
  it('the lead’s row for Brian says he is waiting on them, as Today does', async () => {
    const { prisma } = prismaFor();
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
    const b: any = await svc.get('g-sales', 'u-wairimu');
    const rows = [...(b.eachPerson ?? []), ...(b.eachPersonToday ?? [])].map((x: any) => `${x.says ?? x.line}`);
    const brian = rows.filter((l) => /^Brian/.test(l));
    expect(brian.length).toBeGreaterThan(0);
    for (const l of brian) expect(l).not.toMatch(/nothing here needs you/);
    expect(brian.join(' ')).toMatch(/waiting on you for a decision on whether a price range counts as a budget since 20 September\./);
  });
});
