import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * THE ORDER IS A DECISION, AND IT WAS WRONG TWICE.
 *
 * Every guard here passed its own tests throughout, and the two faults measured across nineteen
 * live check-ins were both in the sequence rather than in any one of them.
 *
 * The ban check sat fourth of seven while three guards after it REPLACE the reply, so a
 * replacement never met the list: banned phrases went from two to eight the moment the restating
 * guard started succeeding more often.
 *
 * And length was judged three guards before the restatement was removed. Every over-long reply in
 * those runs was long because it summarised the person back, so the reply being measured was about
 * to lose its opening sentence anyway.
 */
describe('the order the guards run in', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const at = (needle: string) => {
    const i = src.indexOf(needle);
    expect(i).toBeGreaterThan(-1);
    return i;
  };

  const deadEnd = () => at('if (isADeadEnd(screened.text');
  const askedTwice = () => at('if (alreadyAskedTwice(screened.text');
  const verdict = () => at('if (isAVerdictAboutSomebodyElse(message, screened.text))');
  const restating = () => at('if (!anOfferIsBeingMade && opensByRepeatingThem(message, screened.text))');
  const essay = () => at('if (isAnEssay(screened.text');
  const bans = () => at('const notOurWords = wordsWeDoNotUse(screened.text');
  const ships = () => at('reply = screened.text || (isAnAcknowledgement(message) ?');

  it('the faults that change what is being said come before the ones that measure it', () => {
    expect(deadEnd()).toBeLessThan(essay());
    expect(askedTwice()).toBeLessThan(essay());
    expect(verdict()).toBeLessThan(essay());
  });

  it('length is judged after the restatement has been taken out, not before', () => {
    expect(restating()).toBeLessThan(essay());
  });

  it('the words we never use are checked on whatever actually ships', () => {
    for (const earlier of [deadEnd, askedTwice, verdict, restating, essay]) {
      expect(earlier()).toBeLessThan(bans());
    }
  });

  it('and the line that says a long one shipped is the last thing before it does', () => {
    expect(bans()).toBeLessThan(at('if (shipping > A_REPLY_IS_ABOUT)'));
    expect(at('if (shipping > A_REPLY_IS_ABOUT)')).toBeLessThan(ships());
  });

  it('every guard still runs exactly once, so none of this became a loop', () => {
    for (const needle of [
      'if (isADeadEnd(screened.text',
      'if (alreadyAskedTwice(screened.text',
      'if (isAVerdictAboutSomebodyElse(message, screened.text))',
      'if (!anOfferIsBeingMade && opensByRepeatingThem(message, screened.text))',
      'if (isAnEssay(screened.text',
      'const notOurWords = wordsWeDoNotUse(screened.text',
    ]) {
      expect(src.split(needle).length - 1).toBe(1);
    }
  });
});
