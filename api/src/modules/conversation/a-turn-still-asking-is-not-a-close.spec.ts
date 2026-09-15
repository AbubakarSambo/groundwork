import { readFileSync } from 'fs';
import { join } from 'path';
import { isAnEssay, A_REPLY_IS_ABOUT } from './a-reply-is-not-an-essay';
import { stillAsking } from './one-question-per-turn';

/*
 * A close may run to a hundred and forty words because the last turn names what now exists. A reply
 * that carries the close marker and then asks one more thing is not that turn - the product already
 * refuses to complete the session on it, because a finish button under an unanswered question is
 * wrong. Both readings were using the same flag, so a turn that was still asking inherited the
 * close's allowance.
 *
 * Read live on a second check-in: a hundred and twenty seven words of restating, a compliment, then
 * the question.
 */
describe('a turn that is still asking is not a close', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the length guard is handed the close-and-not-asking flag, not the raw marker', () => {
    expect(src).toMatch(/const thisIsTheClosingTurn = closingNow && !stillAsking\(screened\.text\)/);
    expect(src).toMatch(/isAnEssay\(screened\.text, thisIsTheClosingTurn\)/);
    expect(src).not.toMatch(/isAnEssay\(screened\.text, closingNow\)/);
  });

  it('and the retry is judged against the same bar it was asked to meet', () => {
    expect(src).toMatch(/!isAnEssay\(second\.text, thisIsTheClosingTurn\)/);
  });

  it('says so whenever a long reply ships, so the next one is not a guess', () => {
    expect(src).toMatch(/shipping \$\{shipping\} words/);
  });

  it('a reply that gives a verdict and then asks is over the bar at sixty, not a hundred and forty', () => {
    const askingAtTheEnd =
      `${'word '.repeat(A_REPLY_IS_ABOUT + 10)}and what would have to change for that to hold?`;
    expect(stillAsking(askingAtTheEnd)).toBe(true);
    expect(isAnEssay(askingAtTheEnd, false)).toBe(true);
  });

  it('and a real close still passes, now that a close is three sentences', () => {
    /*
     * This used to build a 120-word close and assert it fit, because a close was allowed 140. That
     * allowance is gone - Hafsah took the three sentences on 15 September - so the fixture is now
     * what a close is actually meant to be. See a-reply-is-not-an-essay.
     */
    const closing = 'You said you will speak to Rita on Thursday. That is on your board, and the report is yours now. Speak soon.';
    expect(stillAsking(closing)).toBe(false);
    expect(isAnEssay(closing, true)).toBe(false);
  });
});
