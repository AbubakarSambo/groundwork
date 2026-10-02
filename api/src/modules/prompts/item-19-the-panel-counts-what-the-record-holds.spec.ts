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
