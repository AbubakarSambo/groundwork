import { ReportsService } from './reports.service';

/**
 * REQUEST 55: THE SESSION REPORT SAYS WHICH SESSION OF HOW MANY.
 *
 * The session report's read left the check-in's length out of what it asked the database for, so
 * `plannedSessions` was null on every read and "Session 37 of 65" could never show. Served through
 * the route, for the lead and a participant, from a ground that has a length and a rhythm.
 */
describe('a session report knows how many sessions there are', () => {
  const ground = (timelineDays: number | null, cadence = 'WEEKLY') => ({
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence, brief: null, objectives: [], timelineDays,
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
    report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
  });
  const serve = async (timelineDays: number | null, reader: string, cadence = 'WEEKLY', session = 2) => {
    let asked: any = null;
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: {
        ...reads,
        /* Answers only what was asked for, as the database does. */
        findUnique: async (q: any) => {
          const g: any = ground(timelineDays, cadence);
          if (!q?.select) return g;
          if (!asked && q.select.participants) asked = q.select;
          return Object.fromEntries(Object.keys(q.select).filter((k) => k in g).map((k) => [k, g[k]]));
        },
      },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => false;
    const served = await svc.sessionReport('g-1', session, reader, 'org-1');
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

  /*
   * ONE RULE FOR HOW MANY (12 October). The header worked the count out inline from the length over the rhythm,
   * which has no step for a one-time check-in, so the report read "Session 1." while the board read "of 1".
   * The report now asks the same `totalSessionsFor` the board and the engine ask.
   */
  it.each(['u-lead', 'u-miriam'])('a one-time check-in, read by %s, is "Session 1 of 1."', async (reader) => {
    const { served } = await serve(null, reader, 'ONE_TIME', 1);
    expect(served.plannedSessions).toBe(1);
    expect(JSON.stringify(served)).toContain('Session 1 of 1.');
  });
});
