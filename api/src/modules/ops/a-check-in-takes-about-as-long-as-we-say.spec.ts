import { readFileSync } from 'fs';
import { join } from 'path';
import { METRICS_BY_KEY } from './a-number-you-can-open';
import { BOARDS_BY_KEY } from './what-each-person-opens-to';
import { medianOf, saysTheTruth, whatTheMedianSays, WHAT_WE_SAY_MINUTES, A_FAIR_RANGE } from './a-check-in-takes-about-as-long-as-we-say';

/** "A check-in takes about ten minutes" is said on the site and in the product. This is what measures it. */
describe('the median', () => {
  it('is the middle value, or the mean of the two middles, or nothing over nothing', () => {
    expect(medianOf([3, 9, 12])).toBe(9);
    expect(medianOf([3, 9, 12, 20])).toBe(10.5);
    expect(medianOf([])).toBeNull();
  });

  it('the copy\'s number sits inside the range the copy is judged by', () => {
    expect(WHAT_WE_SAY_MINUTES).toBe(10);
    expect(WHAT_WE_SAY_MINUTES).toBeGreaterThanOrEqual(A_FAIR_RANGE[0]);
    expect(WHAT_WE_SAY_MINUTES).toBeLessThanOrEqual(A_FAIR_RANGE[1]);
    expect(saysTheTruth(11)).toBe(true);
    expect(saysTheTruth(34)).toBe(false);
    expect(saysTheTruth(null)).toBeNull();
    expect(whatTheMedianSays(34, 12)).toMatch(/does not hold/);
    expect(whatTheMedianSays(null, 0)).toMatch(/no duration to give/);
  });
});

describe('the metric', () => {
  it('exists, is on the product board, and computes from real sessions only', async () => {
    const metric = METRICS_BY_KEY.get('product.session_minutes_median')!;
    expect(metric).toBeTruthy();
    expect(BOARDS_BY_KEY.get('product')!.metrics).toContain('product.session_minutes_median');
    const prisma = {
      checkIn: {
        findMany: jest.fn(async ({ where }: any) => {
          expect(where.isSetup).toBe(false);
          expect(where.ground.organization.isInternal).toBe(false);
          return [
            { id: 'a', sessionNumber: 1, startedAt: new Date('2026-09-01T10:00:00Z'), completedAt: new Date('2026-09-01T10:08:00Z') },
            { id: 'b', sessionNumber: 1, startedAt: new Date('2026-09-01T11:00:00Z'), completedAt: new Date('2026-09-01T11:14:00Z') },
            { id: 'c', sessionNumber: 2, startedAt: new Date('2026-09-02T11:00:00Z'), completedAt: new Date('2026-09-02T11:11:00Z') },
          ];
        }),
      },
    } as any;
    const r = await metric.compute(prisma, { from: new Date('2026-09-01'), to: new Date('2026-09-30') });
    expect(r.value).toBe(11);
    expect(r.rows.length).toBe(3);
    expect(r.says).toMatch(/Median 11 minutes over 3 sessions/);
  });

  it('the sentence the product says matches the number the metric is judged against', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const chat = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw', 'GroundChat.tsx'), 'utf8'));
    expect(chat).toContain('about ten minutes');
    expect(WHAT_WE_SAY_MINUTES).toBe(10);
  });
});
