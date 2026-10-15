import { ReportsService } from './reports.service';

/**
 * THE SESSION REPORT COUNTS WHO IS IN THE ROUND THE WAY THE HEADER AND THE BOARD DO (requests 56
 * and 69). Walked live: "4 of 5" in the session report beside "4 of 6" on the check-in's header.
 * Zawadi, invited and never joined, was left out of the report's `counting` and still named, by her
 * email address, elsewhere. Served through the route, as the lead and a participant.
 */
const person = (id: string, first: string | null, extra: Record<string, any> = {}) => ({
  id, userId: first ? `u-${id}` : null, partyType: 'PARTICIPANT', managingOnly: false, email: `${id}.u8@example.test`,
  nameGiven: null, organisationGiven: null, roleAsDescribed: null, createdAt: new Date('2026-09-20'),
  invitedAt: new Date('2026-09-20'), inviteTokenExpiresAt: new Date('2026-09-21'),
  user: first ? { firstName: first, lastName: 'Test' } : null, ...extra,
});

const ground = () => ({
  id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null, objectives: [], timelineDays: 84,
  peersVisibleToEachOther: true,
  participants: [
    { ...person('lead', 'Rukia'), userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true },
    person('amani', 'Amani'), person('juma', 'Juma'), person('neema', 'Neema'), person('baraka', 'Baraka'), person('halima', 'Halima'),
    /* Invited, never joined, and her invitation has lapsed. */
    person('zawadi', null),
  ],
  report: { releasedAt: new Date('2026-09-23'), agreements: [], divergences: [], centralQuestion: null, findings: [], direction: null },
});

async function serve(reader: string) {
  const svc = Object.create(ReportsService.prototype) as any;
  const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 1, aggregate: async () => ({ _max: {} }) };
  const answered = ['amani', 'juma', 'neema', 'baraka'].map((participantId) => ({ participantId, status: 'COMPLETED' }));
  svc.prisma = new Proxy({
    ground: {
      ...reads,
      findUnique: async (q: any) => {
        const g: any = ground();
        if (!q?.select) return g;
        return Object.fromEntries(Object.keys(q.select).filter((k) => k in g).map((k) => [k, g[k]]));
      },
    },
    checkIn: { ...reads, findMany: async (q: any) => (q?.where?.sessionNumber === 2 && q?.where?.status ? answered : []) },
  } as any, { get: (t: any, k: string) => t[k] ?? reads });
  svc.isAnAdminOf = async () => false;
  return svc.sessionReport('g-1', 2, reader, 'org-1');
}

describe.each([['the lead', 'u-lead'], ['a participant', 'u-amani']])('as %s', (_who, reader) => {
  it('counts six in the round, the same as the header, and four of them answered', async () => {
    const served = await serve(reader);
    expect(served.counting).toHaveLength(6);
    expect(served.counting.filter((c: any) => c.answered)).toHaveLength(4);
  });

  it('and names nobody by an email address', async () => {
    const served = await serve(reader);
    expect(JSON.stringify(served.counting)).not.toMatch(/@example\.test/);
  });
});
