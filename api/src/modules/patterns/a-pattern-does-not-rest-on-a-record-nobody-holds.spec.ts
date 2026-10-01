import { restsOnARecordNobodyHolds } from './a-pattern-does-not-rest-on-a-record-nobody-holds';

/** The three observations stored in api/journey/all-24/re-a/loans.json, and what Chinedu and Grace actually said. */
describe('a pattern does not rest on a record nobody holds', () => {
  const CHINEDU = ["I haven't needed any support. Everything has been going well with the tricycle.", "I haven't fallen behind on repayments. I've repaid every installment on time.", 'I have been making my weekly repayments. There is nothing that has prevented me.'];
  const GRACE = ['Now I understand that repayments start immediately after receiving the asset.', 'I am making payments now. I am behind by seven payments, but I am paying.'];

  it.each([
    'Reported that all loan repayments were on time, while records showed the opposite.',
    'Repayments claimed to be on time, contrary to the payment record.',
  ])('drops, for Chinedu: %s', (o) => {
    expect(restsOnARecordNobodyHolds(o, CHINEDU)).toBe(true);
  });

  it('drops, for Grace: the system of record shows no payments', () => {
    expect(restsOnARecordNobodyHolds('Claims to be making payments, but the system of record shows no payments have been received.', GRACE)).toBe(true);
  });

  it('keeps a record claim the person gave themselves', () => {
    expect(restsOnARecordNobodyHolds('Said the work was finished, while the records showed otherwise.', ['My records are in the shared folder, you can read them.'])).toBe(false);
  });

  it('keeps an observation that makes no record claim', () => {
    expect(restsOnARecordNobodyHolds('Said the files have been with the credit committee for 34 days and chased four times.', CHINEDU)).toBe(false);
  });
});
