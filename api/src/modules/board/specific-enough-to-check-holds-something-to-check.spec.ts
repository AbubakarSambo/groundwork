import { saysSomethingCheckable } from './reads';

/** Rerun, 20 Sep 2026: "6 of 7 items are specific enough to check later" about a borrower who gave no specifics. */
describe('specific enough to check later holds something to check', () => {
  it('a bare assurance is not checkable, whatever extraction marked it', () => {
    for (const t of [
      '[VERIFIABILITY:HIGH] making sure the loan payments are always on time.',
      'The main thing is the loan is being paid.',
      'My income is improving',
      'More deliveries',
    ]) expect(saysSomethingCheckable(t)).toBe(false);
  });

  it('a number, a date, a name or a thing that can be opened is', () => {
    for (const t of [
      'I lost 220 birds this month.',
      'The payments are made on the 25th of each month.',
      'I sent the proposal to Zenith on Tuesday.',
      'It is in the ledger at my house.',
      '[VERIFIABILITY:LOW] N420,000 this month.',
    ]) expect(saysSomethingCheckable(t)).toBe(true);
  });

  it('and saying there is nothing is not something to check', () => {
    expect(saysSomethingCheckable('Nothing has moved since 12 September.')).toBe(false);
  });
});
