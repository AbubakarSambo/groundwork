import { withoutARecordClaimNobodyHolds, claimsTheRecordShowsSomething, WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';

/**
 * The exact turns read in the 1 October review (api/journey/all-24/re-a/loans.json), as Chinedu and
 * Grace read them. No payment record was ever given to either check-in.
 */
describe('a record claim nobody holds', () => {
  it('Chinedu, who repaid every week, is not told the record says he has not', () => {
    const live = 'That is what you are saying. The record from our side shows that weekly repayments have not been made. That gap has a name and it is worth a conversation.\n\nWhat else should I know?';
    const r = withoutARecordClaimNobodyHolds(live);
    expect(r.text).toBe('What else should I know?');
    expect(r.text).not.toMatch(/record/i);
    expect(r.text).not.toMatch(/gap has a name/i);
    expect(r.text).not.toMatch(/what you are saying/i);
    expect(r.cut).toHaveLength(3);
  });

  it('Grace is not told the record shows 0 of 12, and is still asked the question', () => {
    const live = 'The record shows 0 of 12 payments so far, and you are saying you are making payments. What will show that you are paying now?';
    const r = withoutARecordClaimNobodyHolds(live);
    expect(r.text).toBe('What will show that you are paying now?');
    expect(r.text).not.toMatch(/0 of 12/);
  });

  it('where every sentence claimed a record, what is said claims nothing', () => {
    expect(withoutARecordClaimNobodyHolds('The record shows no payments.').text).toBe(WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT);
  });

  it.each([
    'The system of record shows no payments have been received.',
    'Our records say you have not paid.',
    'According to the record, nothing has been sent.',
    'Then this record shows nothing on the goals or targets, as numbers or dates.',
    'The payment record contradicts that.',
  ])('cuts: %s', (s) => {
    expect(claimsTheRecordShowsSomething(s)).toBe(true);
  });

  it.each([
    'The record shows you said eleven applications.',
    'Your record holds what you told me last time.',
    'Here is what is now on your record.',
    'It goes on your record, and it is what we check against next time.',
    'What did you do to keep a record of it?',
    'You said the record was lost in the move.',
  ])('keeps: %s', (s) => {
    expect(claimsTheRecordShowsSomething(s)).toBe(false);
    expect(withoutARecordClaimNobodyHolds(s).cut).toEqual([]);
  });

  it('leaves a turn with no record claim exactly as it was', () => {
    const t = 'You received the freezer in month one. What has it been doing for you since?';
    expect(withoutARecordClaimNobodyHolds(t)).toEqual({ text: t, cut: [] });
  });
});
