import { NO_OPEN_ISSUES_ON_RECORD } from './board.service';

/** B-164: "Open issues" read like a note to the developers: "Nothing on record follows an issue from unclear, to decided, to done and checked...". */
describe('the sentence under Open issues', () => {
  /* Changed 4 November 2026 (release batch 1): the direct morning's words are the only words, so this sentence is said as the fact, or not at all. */
  it('says nothing about how the product works', () => {
    expect(NO_OPEN_ISSUES_ON_RECORD).toBe('');
    expect(NO_OPEN_ISSUES_ON_RECORD).not.toMatch(/on record follows|unclear, to decided/);
  });
});
