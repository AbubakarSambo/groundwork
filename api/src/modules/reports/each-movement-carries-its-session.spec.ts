import { ReportsService } from './reports.service';

/**
 * REQUEST 59: EACH LINE OF "HOW THIS HAS MOVED" CARRIES ITS SESSION NUMBER.
 *
 * The rounds are stored with `sessionNumber`, and the sequence read `round`, so every movement came
 * back without one and the page printed "At the end of session undefined". Served through the
 * route, to the lead, a participant and an admin, as the JSON the client gets.
 */
describe('each movement carries its session', () => {
  const ground = {
    organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true,
    report: { releasedAt: new Date('2026-09-27') },
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
  };
  /* Stored newest first here on purpose: the sequence must still come back oldest first. */
  const kept = [
    { sessionNumber: 3, sharedPicture: 'Both people have answered. They agree on the target.', agreements: [], divergences: [], centralQuestion: null, takenAt: new Date('2026-09-27T10:00:00Z'), amendedAt: null, amendedNote: null },
    { sessionNumber: 2, sharedPicture: 'Both people have answered. They disagree on one thing.', agreements: [], divergences: [{ topic: 'x' }], centralQuestion: null, takenAt: new Date('2026-09-20T10:00:00Z'), amendedAt: null, amendedNote: null },
  ];
  const serve = async (reader: string, admin = false) => {
    const svc = Object.create(ReportsService.prototype) as any;
    svc.logger = { log() {}, warn() {} };
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: { ...reads, findUnique: async () => ground, findFirst: async () => ground },
      reportRound: { ...reads, findMany: async () => kept },
      user: { ...reads, findUnique: async () => ({ id: reader, platformRole: null }) },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async () => admin;
    return JSON.parse(JSON.stringify(await svc.rounds('g-1', reader, 'org-1')));
  };

  it.each([['the lead', 'u-lead', false], ['a participant', 'u-miriam', false], ['an admin', 'u-admin', true]] as const)('%s reads each movement with its session, oldest first', async (_who, reader, admin) => {
    const served = await serve(reader, admin);
    expect(served.moved.map((m: any) => m.round)).toEqual([2, 3]);
    expect(served.moved[0].takenAt).toBe('2026-09-20');
    expect(JSON.stringify(served)).not.toContain('undefined');
  });
});
