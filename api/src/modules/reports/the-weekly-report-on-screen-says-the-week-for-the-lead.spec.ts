jest.mock('../email/the-leads-weekly-letter', () => ({
  theWeekForTheLead: jest.fn(async () => ({
    theTarget: '75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.',
    movedWithProof: ['On Monday 19 October Kevin said “Roysambu Gym signed an order for 3 units.” The signed order is on file.'],
    needsYou: [{ says: 'Joseph has said three sales with nothing on file, and Groundwork’s asking has not moved it.', evidence: ['On Wednesday 14 October Joseph said “she paid a deposit.” Nothing on file shows it yet.'] }],
  })),
}));
import { TheWeeklyReportController } from './the-weekly-report.controller';
import { theWeekForTheLead } from '../email/the-leads-weekly-letter';

/**
 * THE ON-SCREEN WEEKLY REPORT SAYS THE WEEK FOR THE LEAD (browser test, 21 October 2026). #396 gave the weekly letter three parts: where the
 * target stands, what moved this week with what shows it, and who needs the lead with the evidence. The weekly report on the screen now
 * carries the same three, read by the same function, for the person who runs the check-in, where the direct morning is on, for the
 * latest week. A person in the check-in, an organisation with it off, and an earlier week read the report as before.
 */
const GRACE = 'u-grace';
const KEVIN = 'u-kevin';
function aController(directMorningOn: boolean) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Sales team, Q4', initiatorId: GRACE, organizationId: 'o1' })) },
    organization: { findUnique: jest.fn(async () => ({ directMorningOn })) },
  };
  const weekly: any = { read: jest.fn(async () => ({ heading: 'This week, 19 Oct, so far', weekStart: '2026-10-19', eachPerson: [], inNumbers: [] })), noteTheLeadRead: jest.fn(async () => undefined) };
  return new TheWeeklyReportController(weekly, prisma, undefined);
}

describe('the weekly report on the screen, for the lead', () => {
  beforeEach(() => (theWeekForTheLead as jest.Mock).mockClear());

  it('Grace, who runs it, reads where the target stands, what moved with proof, and who needs her', async () => {
    const r: any = await aController(true).week('g1', GRACE, 'ADMIN', 'o1');
    expect(r.forTheLead).toEqual({
      target: '75 of 120 sold, 47 paid, 45 short, and the open deals cover 40.',
      movedWithProof: ['On Monday 19 October Kevin said “Roysambu Gym signed an order for 3 units.” The signed order is on file.'],
      needsYou: [{ says: 'Joseph has said three sales with nothing on file, and Groundwork’s asking has not moved it.', evidence: ['On Wednesday 14 October Joseph said “she paid a deposit.” Nothing on file shows it yet.'] }],
    });
  });

  it('Kevin, in the check-in, reads none of it, and it is not even worked out for him', async () => {
    const r: any = await aController(true).week('g1', KEVIN, 'MEMBER', 'o1');
    expect(r.forTheLead).toBeUndefined();
    expect(theWeekForTheLead).not.toHaveBeenCalled();
  });

  it('an earlier week is served as before', async () => {
    const r: any = await aController(true).week('g1', GRACE, 'ADMIN', 'o1', '2026-10-12');
    expect(r.forTheLead).toBeUndefined();
  });
});
