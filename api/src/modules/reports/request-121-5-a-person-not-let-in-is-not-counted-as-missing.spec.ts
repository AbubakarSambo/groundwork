import { ReportsService } from './reports.service';

/**
 * REQUEST 121, PART 5: THE REPORT'S "WHAT THIS CANNOT TELL YOU" DOES NOT COUNT SOMEBODY WHO IS NOT LET IN.
 *
 * Faraji Odhiambo is waiting to be let in, so he cannot answer, and the header already counts "4 of 5".
 * This sentence counted six people on the same check-in: "2 of 6 people have not answered yet".
 */
const party = (id: string, managingOnly = false) => ({ id, roleAsDescribed: null, managingOnly, remitAsGiven: null });
const PARTIES = [party('p-rukia'), party('p-amani'), party('p-baraka'), party('p-neema'), party('p-faraji')];
const LABELS = new Map(PARTIES.map((p) => [p.id, p.id]));

function service(awaiting: string[]) {
  const svc: any = Object.create(ReportsService.prototype);
  svc.prisma = {
    checkIn: { findMany: jest.fn(async () => ['p-rukia', 'p-amani', 'p-neema'].map((participantId) => ({ participantId, sessionNumber: 1 }))) },
    groundParticipant: {
      findMany: jest.fn(async () => PARTIES.map((p) => ({ id: p.id, userId: `u-${p.id}`, user: { awaitingOrgApproval: awaiting.includes(p.id) } }))),
    },
  };
  return svc;
}

describe('request 121 (5): who has not answered, when somebody is not let in', () => {
  it('counts four people, not five, when Faraji is waiting to be let in', async () => {
    const read = await service(['p-faraji'])['readTheRecordOverTime']('g-1', PARTIES, LABELS);
    expect(read.cannotTellYou).toContain('1 of 4 people has not answered yet, so anything about them is missing rather than absent.');
    expect(JSON.stringify(read.cannotTellYou)).not.toMatch(/of 5 people/);
  });

  it('counts everybody when nobody is waiting, as before', async () => {
    const read = await service([])['readTheRecordOverTime']('g-1', PARTIES, LABELS);
    expect(read.cannotTellYou).toContain('2 of 5 people have not answered yet, so anything about them is missing rather than absent.');
  });
});
