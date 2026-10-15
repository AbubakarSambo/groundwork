import { theQuestionsTheLeadWants } from './what-the-context-already-holds';

/** B-017: the question Wairimu confirmed for Amani was never asked in Amani's first check-in. */
describe('a confirmed question is asked in this check-in, before it closes', () => {
  it('the block every turn of Amani\'s check-in reads says so, and keeps the exact words', () => {
    const q = 'How many shops have you signed on the coast so far, and what is stopping you from reaching 15 a week?';
    const block = theQuestionsTheLeadWants([q]);
    expect(block).toContain(`- "${q}"`);
    expect(block).toContain('Ask it in this check-in. If the conversation is about to close and it has not been asked yet, ask it before you close.');
  });
});
