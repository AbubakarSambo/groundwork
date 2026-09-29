import { ReportsService, A_PICTURE_IS_FORMING } from './reports.service';

/**
 * Screens request 51, 28 September 2026: GET /grounds/:id/report/session/:n gave a participant who
 * had not checked in the session's team findings, while /report correctly withheld them.
 */
describe('a session report waits until you have answered, as the main report does', () => {
  const ground = (released: boolean) => ({
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-lead', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', brief: null,
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    ],
    report: { releasedAt: released ? new Date('2026-09-23') : null, agreements: ['Aisha sold 4.'], divergences: [], centralQuestion: null, findings: [], direction: null },
  });
  const serviceFor = (released: boolean, miriamAnswered: boolean) => {
    const svc = Object.create(ReportsService.prototype) as any;
    const reads = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {} }) };
    svc.prisma = new Proxy({
      ground: { ...reads, findUnique: async () => ground(released) },
      checkIn: { ...reads, count: async () => (miriamAnswered ? 1 : 0) },
    } as any, { get: (t: any, k: string) => t[k] ?? reads });
    svc.isAnAdminOf = async (userId: string) => userId === 'u-admin';
    return svc;
  };
  const read = async (userId: string, released: boolean, answered: boolean) => {
    try { return await serviceFor(released, answered).sessionReportAsBuilt('g-1', 2, userId, 'org-1'); } catch (e) { return { threw: String(e) }; }
  };

  it('a participant who has not answered, before release, is told why and given nothing else', async () => {
    expect(await read('u-miriam', false, false)).toEqual({ sessionNumber: 2, withheldUntilYouAnswer: true, saying: A_PICTURE_IS_FORMING });
  });

  it('a participant who has answered is not held back', async () => {
    expect((await read('u-miriam', false, true) as any)?.withheldUntilYouAnswer).toBeUndefined();
  });

  it('once the report is released, nobody is held back', async () => {
    expect((await read('u-miriam', true, false) as any)?.withheldUntilYouAnswer).toBeUndefined();
  });

  it('and the lead reads as before', async () => {
    expect((await read('u-lead', false, false) as any)?.withheldUntilYouAnswer).toBeUndefined();
  });

  it('and an admin of the organisation reads as the lead does', async () => {
    expect((await read('u-admin', false, false) as any)?.withheldUntilYouAnswer).toBeUndefined();
  });

  it('the route itself, not only the builder, withholds it from somebody who has not answered', async () => {
    const served = await serviceFor(false, false).sessionReport('g-1', 2, 'u-miriam', 'org-1');
    expect(served).toEqual({ sessionNumber: 2, withheldUntilYouAnswer: true, saying: A_PICTURE_IS_FORMING });
    expect(JSON.stringify(served)).not.toContain('Aisha sold 4');
  });
});
