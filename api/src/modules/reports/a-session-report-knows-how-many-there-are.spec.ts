import { ReportsService } from './reports.service';

/**
 * REQUEST 55: THE SESSION REPORT SAYS WHICH SESSION OF HOW MANY.
 *
 * The session report's read left the check-in's length out of what it asked the database for, so
 * `plannedSessions` was null on every read and "Session 37 of 65" could never show. Served through
 * the route, for the lead and a participant, from a ground that has a length and a rhythm.
 */
describe('a session report knows how many sessions there are', () => {
  const ground = (timelineDays: number | null) => ({
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null, objectives: [], timelineDays,
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
    report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
  });
  const serve = async (timelineDays: number | null, reader: string) => {
    let asked: any = null;
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: {
        ...reads,
        /* Answers only what was asked for, as the database does. */
        findUnique: async (q: any) => {
          const g: any = ground(timelineDays);
          if (!q?.select) return g;
          if (!asked && q.select.participants) asked = q.select;
          return Object.fromEntries(Object.keys(q.select).filter((k) => k in g).map((k) => [k, g[k]]));
        },
      },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => false;
    const served = await svc.sessionReport('g-1', 2, reader, 'org-1');
    return { served, asked };
  };

  it.each(['u-lead', 'u-miriam'])('twelve weeks, weekly, read by %s, is 12 sessions', async (reader) => {
    const { served, asked } = await serve(84, reader);
    expect(asked.timelineDays).toBe(true);
    expect(served.plannedSessions).toBe(12);
  });

  it('with no length set, it stays null rather than invent one', async () => {
    const { served } = await serve(null, 'u-lead');
    expect(served.plannedSessions).toBeNull();
  });
});
