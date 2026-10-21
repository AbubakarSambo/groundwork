import { aDealThatMoved, whatChangedInTheSalesWeek } from './what-a-sales-week-shows';
import { aWholeClause } from './what-today-reads-from-the-record';
import { theDaysAnOpenDailySessionWasMissed } from '../board/the-persons-record';

/**
 * GRACE'S WEEKLY REPORT, AS THE FINAL REAL-MODEL CHECK SERVED IT (item 14; Hafsah, 21 October 2026). The lines are the run's: "Mama Pima
 * Stores bought." (Joseph said "It's not signed yet", and Grace's rule counts a sale only with a payment or a signed order), "Kevin Omondi
 * sold 6 units, paid, to Savannah Cafe." (a deposit), "13 of the 14 check-ins due this week were made." (15 were due: Peter's Tuesday
 * session stayed open on Wednesday), and "Once it is settled, it to close this week for sure."
 */
const sayAs = (pid: string | null) => (pid === 'p-joseph' ? 'Joseph Kariuki' : pid === 'p-kevin' ? 'Kevin Omondi' : 'Somebody');

describe('what moved this week', () => {
  it('a sale her rule does not count is never "bought", and a deposit is said as a deposit', () => {
    expect(aDealThatMoved({ name: 'Mama Pima Stores', ownerParticipantId: 'p-joseph', from: null, to: 'Won', won: true, paid: false, proven: false, notCounted: true }, sayAs))
      .toBe('Mama Pima Stores is on record as sold, and nothing written shows a payment or a signed order, so it is not counted as sold.');
    expect(aDealThatMoved({ name: 'Savannah Cafe', ownerParticipantId: 'p-kevin', from: 'Quoted', to: 'Won', won: true, paid: true, proven: true, mpesaCode: 'RBT7Y3KQ2P', deposit: { paid: 15000, of: 30000, currency: 'KES' } }, sayAs))
      .toBe('Savannah Cafe bought on a deposit, and M-Pesa code RBT7Y3KQ2P shows it. Deposit paid, KES 15,000 of KES 30,000.');
  });
  it('a sale not counted is not one of the week’s sales, and a deposit is not one paid', () => {
    const w: any = { moves: [
      { name: 'Kilele Hotel', ownerParticipantId: 'p-kevin', from: null, to: 'Won', won: true, paid: true, proven: true },
      { name: 'Savannah Cafe', ownerParticipantId: 'p-kevin', from: 'Quoted', to: 'Won', won: true, paid: true, proven: true, deposit: { paid: 15000, of: 30000, currency: 'KES' } },
      { name: 'Mama Pima Stores', ownerParticipantId: 'p-joseph', from: null, to: 'Won', won: true, paid: false, proven: false, notCounted: true },
    ] };
    expect(whatChangedInTheSalesWeek(w, { whole: true, me: null } as any, sayAs)!.result).toEqual(['2 sales so far this week, 1 with proof of payment.']);
  });
});

describe('the check-ins due this week', () => {
  it('Peter’s session opened on Tuesday 13 October and still open on Wednesday evening is due on Wednesday too', () => {
    const peter2 = { id: 'peter-2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: new Date('2026-10-13T05:00:00Z'), createdAt: new Date('2026-10-12T11:12:00Z') };
    /* Counted through today for the week's check-ins due (13 made of 15 on Wednesday evening); a missed day is only one before today. */
    expect(theDaysAnOpenDailySessionWasMissed(peter2 as any, new Date('2026-10-14T17:00:00Z'), 'Africa/Nairobi', { workingDays: [1, 2, 3, 4, 5] }, true)).toEqual(['2026-10-14']);
    expect(theDaysAnOpenDailySessionWasMissed(peter2 as any, new Date('2026-10-14T17:00:00Z'), 'Africa/Nairobi', { workingDays: [1, 2, 3, 4, 5] })).toEqual([]);
  });
});

describe('what changes once it is settled', () => {
  it.each([
    ['it to close this week for sure', false],
    ['file the affidavit', false],
    ['the school lead will convert', true],
    ['it will count as 20 units sold', true],
  ])('"%s" is a whole clause: %s', (t, yes) => {
    expect(aWholeClause(t as string)).toBe(yes);
  });
});

describe('a name that starts a sentence takes a capital', () => {
  it('"A shop in Githurai is on record as sold"', () => {
    expect(aDealThatMoved({ name: 'a shop in Githurai', ownerParticipantId: 'p-joseph', from: null, to: 'Won', won: true, paid: false, proven: false, notCounted: true }, sayAs))
      .toBe('A shop in Githurai is on record as sold, and nothing written shows a payment or a signed order, so it is not counted as sold.');
  });
});
