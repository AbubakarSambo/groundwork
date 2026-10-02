import { METRICS_BY_KEY, SESSION_CLOSED_BY_THE_CLOCK } from './a-number-you-can-open';
import { CLOSED_BY_THE_CLOCK } from '../conversation/conversation.service';

/**
 * ITEM 19: HOW LONG A SESSION TAKES IS READ OVER SESSIONS A PERSON FINISHED (2 October 2026).
 *
 * The sweep closes a session somebody walked away from about a day later and marks it complete. On
 * the test database 470 such sessions took 1,450 minutes on average, against 12.8 for the 5,903 that
 * people finished. The ops number "How long a session takes" timed them with the rest.
 */
describe('product.session_minutes_median', () => {
  it('leaves out a session the clock closed, and says so in what it counts', async () => {
    const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 9, min));
    const seeded = [
      { id: 'a', sessionNumber: 1, startedAt: at(0), completedAt: at(8), closedReason: null },
      { id: 'b', sessionNumber: 1, startedAt: at(0), completedAt: at(10), closedReason: null },
      { id: 'c', sessionNumber: 1, startedAt: at(0), completedAt: new Date(at(0).getTime() + 1440 * 60000), closedReason: 'auto_closed' },
      { id: 'd', sessionNumber: 2, startedAt: at(0), completedAt: new Date(at(0).getTime() + 1500 * 60000), closedReason: 'auto_closed' },
    ];
    const prisma: any = {
      checkIn: {
        /* Applies the one condition this test is about, the way Postgres would. */
        findMany: jest.fn(async ({ where }: any) => {
          const ok = (r: any) => !where.OR || where.OR.some((c: any) => (c.closedReason === null ? r.closedReason === null : r.closedReason !== null && r.closedReason !== c.closedReason.not));
          return seeded.filter(ok);
        }),
      },
    };
    const metric = METRICS_BY_KEY.get('product.session_minutes_median')!;
    const served = await metric.compute(prisma, { from: at(0), to: new Date('2026-10-03T00:00:00Z') });

    expect(served.rows.map((r) => r.session)).toEqual(['a', 'b']);
    expect(served.value).toBe(9);
    expect(metric.counts).toContain('leaving out those the clock closed');
  });

  it('names a clock-closed session with the product\'s own word for it', () => {
    expect(SESSION_CLOSED_BY_THE_CLOCK).toBe(CLOSED_BY_THE_CLOCK);
  });
});
