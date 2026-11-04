import { theCollectionsDirectMorning } from './the-direct-morning';
import { twoMissedDaysSaid, theirDay } from './who-answers-and-when';
import { lenderLoanItems, LENDER_PEOPLE } from '../grounds/__fixtures__/a-small-lender';

/**
 * A LENDER'S MORNING SAYS LOANS AS THE BORROWERS' (browser test, 21 October 2026). Halima, the credit lead of Pesa Ndogo Lenders (test),
 * read on her board: "KES 24,000 is owed on 2 invoices.", "loan for loan, KES 12,000, fell due on 28 September, and nothing is paid yet.
 * Peter follows it up." and "Peter hasn't checked in for 4 days, since Monday 28 September". Each loan is a borrower's, it is repaid, not
 * followed up by the borrower, and a check-in that opens each Monday is missed in weeks.
 */
const NOW = new Date('2026-10-21T05:00:00Z');
const ZONE = 'Africa/Nairobi';
const people = Object.values(LENDER_PEOPLE).map((p) => ({ id: p.participantId, name: `${p.firstName} ${p.lastName}`, isTheLead: p.partyType === 'INITIATOR' }));
const bills = lenderLoanItems().map((b: any) => ({ ...b, proof: b.id === 'w-loan-achieng' ? [{ readAs: 'A payment' }] : [], saidIn: [] }));
const morning = () => theCollectionsDirectMorning({
  groundId: 'g-lender-loans', label: 'Freezer loans, cohort 1', billWord: 'invoice', loans: true, bills: bills as any, served: null, people, hers: new Set([LENDER_PEOPLE.halima.participantId]),
  waits: [], lastCheckIn: {}, firstOpened: {}, workingDays: [1], now: NOW, zone: ZONE,
});
const lines = () => morning().parts.flatMap((p) => p.lines.map((l) => l.text));

describe('a lender’s morning says each loan as the borrower’s', () => {
  it('counts loans, not invoices', () => {
    expect(lines()[0]).toBe('KES 24,000 is owed on 2 loans. KES 12,000 is paid with proof.');
  });
  it('says whose loan fell due, and never that the borrower follows their own loan up', () => {
    expect(lines()).toContain('Peter’s loan, KES 12,000, fell due on 28 September, and nothing is paid yet.');
    expect(lines().join(' ')).not.toMatch(/loan for loan|Peter follows it up|Musa follows it up/);
  });
  it('a borrower who stopped checking in each Monday is missed in weeks', () => {
    const mondays = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];
    const sessions = mondays.map((d, i) => ({ participantId: 'p-peter', sessionNumber: i + 1, status: i === 0 ? 'COMPLETED' : 'NOT_STARTED', availableFrom: new Date(`${d}T06:00:00Z`), completedAt: i === 0 ? new Date(`${d}T09:00:00Z`) : null }));
    const d = theirDay('p-peter', sessions as any, NOW, ZONE);
    expect(twoMissedDaysSaid('Peter', d, [1])).toBe('Peter hasn\'t checked in for 4 weeks, since Monday 28 September, so call Peter.');
  });
});
