import { readFileSync } from 'fs';
import { join } from 'path';
import { aPromiseTheyNeverMade, whatItSaysTheySaid, withoutThePromise } from './a-promise-they-never-made';

/*
 * Live, session 2, a check-in about selling tea in Abuja:
 *
 *   "You said you would send the rota by Friday. Your report is ready now, and nothing in it needs
 *    acting on today. Speak soon."
 *
 * The rota does not exist. The sentence is the engine's own worked example of a closing turn, in
 * prompt-library.ts, copied word for word into a real person's last turn of the session.
 */
describe('a promise they never made', () => {
  const hers = [
    'We are at 1,200 units sold so far. Abuja retail is slower than I expected.',
    'The hold up is that our distributor in Wuse has not restocked since August.',
    'I have the August and September sales reports from the CRM if that helps.',
  ];

  it('catches the sentence that started this', () => {
    const reply = 'You said you would send the rota by Friday. Your report is ready now. Speak soon.';
    expect(aPromiseTheyNeverMade(reply, hers)).toBe('You said you would send the rota by Friday.');
  });

  it('and lets a true one through on a single word of overlap', () => {
    for (const true_ of [
      'You said you would speak to the Wuse distributor this week.',
      'You mentioned the September sales reports, so that is where this rests.',
      'You told me Abuja retail has been slower than expected.',
    ]) {
      expect(aPromiseTheyNeverMade(true_, hers)).toBeNull();
    }
  });

  it('and a promise made in an earlier session is not an invention', () => {
    /* What is on the record counts as theirs. Recalling session 1 in session 2 is the product
       working, and it is the whole point of the opener. */
    const recalled = 'You said you would give Sahar and Amina their numbers by Friday the 25th.';
    expect(aPromiseTheyNeverMade(recalled, hers)).not.toBeNull();
    expect(aPromiseTheyNeverMade(recalled, [...hers, 'I will give Sahar and Amina numbers by Friday the 25th'])).toBeNull();
  });

  it('only reads sentences that attribute something to them', () => {
    expect(whatItSaysTheySaid('What is making it slower? You said the Wuse distributor stopped.'))
      .toEqual(['You said the Wuse distributor stopped.']);
    expect(whatItSaysTheySaid('What would exist that does not exist today?')).toEqual([]);
  });

  it('cuts the sentence and leaves the rest readable', () => {
    const reply = 'You said you would send the rota by Friday. Your report is ready now. Speak soon.';
    const out = withoutThePromise(reply, 'You said you would send the rota by Friday.');
    expect(out).toBe('Your report is ready now. Speak soon.');
    expect(out).not.toMatch(/rota/);
  });

  it('and it is the last guard in the chain, cutting rather than asking again', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const cut = src.indexOf('aPromiseTheyNeverMade(screened.text');
    expect(cut).toBeGreaterThan(-1);
    /* After the banned-words guard, which is the one that used to be last and can replace the whole
       reply: a replacement carrying an invented promise would otherwise ship unchecked. */
    expect(cut).toBeGreaterThan(src.indexOf('const notOurWords = wordsWeDoNotUse'));
    /* And what it is checked against is everything they have said AND everything on their record. */
    expect(src).toMatch(/aPromiseTheyNeverMade\(screened\.text, \[\.\.\.theirWords, \.\.\.known\]\)/);
  });
});
