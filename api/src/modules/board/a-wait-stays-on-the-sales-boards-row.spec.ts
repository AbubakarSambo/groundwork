import { whereEachPersonIs, type PersonRow } from './where-each-person-is-against-their-number';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-10). On Tuesday Wairimu's sales board read, for Amani, "On Sunday 22 November, Amani said, “Mama
 * Njeri Duka in Kilimani signed the order ...” Not in yet." and nothing of her wait on Baraka for the delivery date. The sales board's line
 * from somebody's last check-in takes the place of the row's `says`, and the wait went with it. The row now carries its wait in the same
 * words (`theWait`, from aWaitInWords), and the sales board's line says it after whatever it says.
 */
const row = (over: Partial<PersonRow>): PersonRow => ({
  participantId: 'p-amani', who: 'Amani Wekesa', nameIsTheirRole: false, target: null, count: 0, roundsSoFar: 3,
  answeredThisRound: false, saidAnythingCheckable: true, inTheWay: [], ...over,
} as PersonRow);

describe('a wait is said on the row of somebody who has not answered yet', () => {
  it('Amani, waiting on Baraka for the delivery date', () => {
    const [r] = whereEachPersonIs([row({ inTheWay: [{ what: 'The delivery date for Mama Njeri', owner: 'Baraka', days: 2, tried: 'asked-once', since: '22 November' }] })], 12);
    expect(r.says).toBe('Amani Wekesa has not checked in yet, and has been waiting on Baraka for the delivery date for Mama Njeri since 22 November.');
    expect(r.theWait).toBe('Amani Wekesa has been waiting on Baraka for the delivery date for Mama Njeri since 22 November.');
  });
  it('Sade, waiting on the reader for the price list', () => {
    const [r] = whereEachPersonIs([row({ participantId: 'p-sade', who: 'Sade Balogun', inTheWay: [{ what: 'the price list', owner: 'Wairimu', onTheReader: true, days: 1, tried: 'nothing', since: '22 November' }] })], 12);
    expect(r.theWait).toBe('Sade Balogun has been waiting on you for the price list since 22 November.');
  });
  it('nobody waiting is no wait', () => {
    const [r] = whereEachPersonIs([row({})], 12);
    expect(r.theWait).toBeNull();
  });
});
