import { PromptsService } from './prompts.service';

/**
 * ITEM 19: THE PLATFORM PANEL COUNTS WHAT THE RECORD HOLDS (2 October 2026).
 *
 * Each number on /admin was read against the local test database after the week's changes. Where the
 * served number and the record parted, the rows that made them part are seeded here and the served
 * number is checked. These tests read what the endpoint sends, not the query that builds it.
 */

/** A fake Prisma with every read the System tab makes, answering with the rows a test seeds. */
function theSystemTab(seed: { recent?: any[] } = {}) {
  const prisma: any = {
    organization: { count: jest.fn().mockResolvedValue(3) },
    ground: {
      count: jest.fn().mockResolvedValue(4),
      groupBy: jest.fn().mockResolvedValue([{ status: 'ACTIVE', _count: { id: 4 } }]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    checkIn: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn(async (args: any) => (args?.take === 15 ? seed.recent ?? [] : [])),
    },
    promptVersion: { findMany: jest.fn().mockResolvedValue([]) },
    outcome: { findMany: jest.fn().mockResolvedValue([]) },
    outcomeFeedback: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, svc: new PromptsService(prisma, {} as any) };
}

describe('the System tab', () => {
  it('opens when a session is marked complete with no completion time, and that session is not in the feed', async () => {
    /* One row like this on the test database ("PROVE the trade", Audit Test Ltd) took the whole tab down. */
    const { prisma, svc } = theSystemTab({
      recent: [
        { completedAt: null, sessionNumber: 1, ground: { label: 'PROVE the trade', organization: { slug: 'audit-test' } } },
        { completedAt: new Date('2026-10-01T09:00:00Z'), sessionNumber: 2, ground: { label: 'Sales team, Q3', organization: { slug: 'baridi' } } },
      ],
    });
    const served = await svc.platformDashboard('all');

    expect(served.checkIns.totalCompleted).toBe(5);
    expect(served.recentActivity).toEqual([
      { type: 'checkin_completed', at: new Date('2026-10-01T09:00:00Z'), orgSlug: 'baridi', groundLabel: 'Sales team, Q3', detail: 'Session 2' },
    ]);
    const feed = prisma.checkIn.findMany.mock.calls.find(([a]: any[]) => a?.take === 15)[0];
    expect(feed.where.completedAt).toEqual({ not: null });
  });
});

describe('how long a session takes', () => {
  /** The funnel's reads; the raw query answers as Postgres would over the seeded sessions. */
  function theFunnel(sessions: { n: number; minutes: number; closedReason: string | null }[]) {
    const raws: any[] = [];
    const prisma: any = {
      checkIn: { count: jest.fn().mockResolvedValue(0) },
      ground: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      $queryRaw: jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join('?');
        raws.push({ sql, values });
        if (!sql.includes('avg_minutes')) return [{ avg_days: null, n: 0 }];
        /* Postgres's own reading of the one condition this test is about. */
        const leftOut = sql.includes('closed_reason IS DISTINCT FROM') ? values.find((v) => v === 'auto_closed') : undefined;
        const kept = sessions.filter((s) => leftOut === undefined || s.closedReason !== leftOut);
        const byN = new Map<number, number[]>();
        for (const s of kept) byN.set(s.n, [...(byN.get(s.n) ?? []), s.minutes]);
        return [...byN].map(([n, m]) => ({ session_number: n, avg_minutes: m.reduce((a, b) => a + b, 0) / m.length, n: m.length }));
      }),
    };
    return { svc: new PromptsService(prisma, {} as any), raws };
  }

  it('averages only the sessions a person finished, not those the clock closed a day later', async () => {
    const { svc } = theFunnel([
      { n: 1, minutes: 12, closedReason: null },
      { n: 1, minutes: 14, closedReason: null },
      { n: 1, minutes: 1440, closedReason: 'auto_closed' },
    ]);
    const served = await svc.usageFunnel('all');
    /* It served 489 here: the clock's session counted as a day-long session. */
    expect(served.avgSessionMinutes).toEqual([{ session: 1, avgMinutes: 13, n: 2 }]);
  });
});
