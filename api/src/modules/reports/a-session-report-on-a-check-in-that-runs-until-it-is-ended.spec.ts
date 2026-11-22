import { ReportsService } from './reports.service';

/**
 * REQUEST 37: A SESSION REPORT ON A CHECK-IN THAT RUNS UNTIL THE LEAD ENDS IT.
 *
 * Served through the route, for the lead and for a participant. There is no total, so nothing says how
 * far through it is: no "of 12", no halfway, no final session. Where a count is shown it is plain.
 */
describe('a session report on a check-in that runs until the lead ends it', () => {
  const ground = (g: { timelineDays: number; runsUntilEnded: boolean }) => ({
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null, objectives: [], ...g,
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
    report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
  });
  const serve = async (g: { timelineDays: number; runsUntilEnded: boolean }, reader: string, session = 3) => {
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: {
        ...reads,
        findUnique: async (q: any) => {
          const row: any = ground(g);
          if (!q?.select) return row;
          return Object.fromEntries(Object.keys(q.select).filter((k) => k in row).map((k) => [k, row[k]]));
        },
      },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => false;
    return svc.sessionReport('g-1', session, reader, 'org-1');
  };

  it('says "Check-in 3. It runs until you end it." to the lead and gives no total', async () => {
    const served = await serve({ timelineDays: 0, runsUntilEnded: true }, 'u-lead');
    expect(served.runsUntilEnded).toBe(true);
    expect(served.plannedSessions).toBeNull();
    expect(served.position).toBe('Check-in 3. It runs until you end it.');
    expect(JSON.stringify(served)).not.toMatch(/halfway|final session|session \d+ of \d+|the last one/i);
  });

  it('tells a participant who ends it, because only the person running it can', async () => {
    const served = await serve({ timelineDays: 0, runsUntilEnded: true }, 'u-miriam');
    expect(served.plannedSessions).toBeNull();
    expect(served.position).toMatch(/^Check-in 3\. It runs until (Wairimu Kamau|the person running it) ends it\.$/);
    expect(served.position).not.toContain('you end it');
  });

  it.each(['u-lead', 'u-miriam'])('still says "Check-in 3 of 12." to %s where the check-in has a length', async (reader) => {
    const served = await serve({ timelineDays: 84, runsUntilEnded: false }, reader);
    expect(served.runsUntilEnded).toBe(false);
    expect(served.plannedSessions).toBe(12);
    expect(served.position).toBe('Check-in 3 of 12.');
  });
});
