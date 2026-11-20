import { aRoundCouldHaveBeenAnswered } from '../grounds/a-round-that-could-be-answered';
import { theirClosedSessions } from '../grounds/missed-check-ins';
import { thePausesThatAreOver, whenTheseOrganisationsPaused } from './the-trial-grace';

/**
 * N51. An organisation that chose a plan again had the rounds of its pause counted as missed, because the pause was only ever read while it ran.
 * It is kept as a stretch now: written when first seen, closed when first seen over, and read by every count of misses.
 */
const D = (s: string) => new Date(`${s}T08:00:00Z`);
const over = [{ from: D('2026-11-10'), until: D('2026-11-17') }];

describe('a pause that is over', () => {
  it('a round that opened inside it could not have been answered; one before or after it could', () => {
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-12'), { pausesOver: over })).toBe(false);
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-05'), { pausesOver: over })).toBe(true);
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-18'), { pausesOver: over })).toBe(true);
    expect(aRoundCouldHaveBeenAnswered(D('2026-11-12'), {})).toBe(true);
  });
  it('a round that ended inside it with nothing said is no miss, and one outside still is', () => {
    const row = (n: number, from: string, to: string) => ({ participantId: 'p', sessionNumber: n, status: 'COMPLETED', isSetup: false, optional: false, availableFrom: D(from), createdAt: D(from), completedAt: D(to), closedReason: 'auto_closed', missedReason: null, turns: [] as any[] });
    const rows = [row(1, '2026-11-03', '2026-11-04'), row(2, '2026-11-11', '2026-11-12'), row(3, '2026-11-18', '2026-11-19')];
    const now = D('2026-11-20');
    const without = theirClosedSessions(rows as any, [], now, {}).filter((c) => c.missed).map((c) => c.sessionNumber);
    const withIt = theirClosedSessions(rows as any, [], now, { pausesOver: over }).filter((c) => c.missed).map((c) => c.sessionNumber);
    expect(without).toContain(2);
    expect(withIt).not.toContain(2);
    expect(withIt).toEqual(without.filter((n) => n !== 2));
  });
  it('with none kept reads as before, and nothing is written for an organisation that is not paused', async () => {
    const rows: any[] = [];
    const prisma: any = {
      organization: { findUnique: async () => ({}) },
      platformSetting: { findUnique: async () => null },
      organizationPause: {
        findFirst: async ({ where }: any) => rows.find((r) => r.organizationId === where.organizationId && r.resumedAt === null) ?? null,
        create: async ({ data }: any) => { rows.push({ id: `r${rows.length}`, resumedAt: null, ...data }); },
        update: async ({ where, data }: any) => { Object.assign(rows.find((r) => r.id === where.id), data); },
        findMany: async ({ where }: any) => rows.filter((r) => where.organizationId.in.includes(r.organizationId) && r.resumedAt),
      },
    };
    expect((await thePausesThatAreOver(prisma, ['o1'])).size).toBe(0);
    /* Not paused: nothing is written. */
    await whenTheseOrganisationsPaused(prisma, ['o1'], D('2026-11-12'));
    expect(rows).toHaveLength(0);
  });
});
