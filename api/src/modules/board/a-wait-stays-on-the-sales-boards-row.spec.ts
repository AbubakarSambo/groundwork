import { whereEachPersonIs, type PersonRow } from './where-each-person-is-against-their-number';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-10), AND THE PAGE AUDIT OF 24 NOVEMBER (ROW 11).
 *
 * On 22 November the sales board's "The team today" line lost Amani's wait on Baraka, so the row carried a second copy of it
 * (`theWait`) to put after her last check-in's line. On 24 November the lead read the same wait three times: in "The team today",
 * under Blockers and under "The signals behind them". Hafsah approved saying each blocker once, under Blockers, so that second copy is
 * gone. The row's own sentence still says the wait, for the boards that draw `says`.
 */
const row = (over: Partial<PersonRow>): PersonRow => ({
  participantId: 'p-amani', who: 'Amani Wekesa', nameIsTheirRole: false, target: null, count: 0, roundsSoFar: 3,
  answeredThisRound: false, saidAnythingCheckable: true, inTheWay: [], ...over,
} as PersonRow);

describe('a wait is said on the row of somebody who has not answered yet', () => {
  it('Amani, waiting on Baraka for the delivery date', () => {
    const [r] = whereEachPersonIs([row({ inTheWay: [{ what: 'The delivery date for Mama Njeri', owner: 'Baraka', days: 2, tried: 'asked-once', since: '22 November' }] })], 12);
    expect(r.says).toBe('Amani Wekesa has not checked in yet, and has been waiting on Baraka for the delivery date for Mama Njeri since 22 November.');
  });
  it('no second copy of the wait is served for the team-today line', () => {
    const [r] = whereEachPersonIs([row({ inTheWay: [{ what: 'the price list', owner: 'Wairimu', onTheReader: true, days: 1, tried: 'nothing', since: '22 November' }] })], 12);
    expect('theWait' in r).toBe(false);
  });
});
