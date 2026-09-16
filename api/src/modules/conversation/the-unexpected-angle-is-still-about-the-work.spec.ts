import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE UNEXPECTED ANGLE IS STILL A QUESTION ABOUT THE WORK.
 *
 * When two sessions come back thin, the opener shifts to an angle the person is not expecting. That
 * is a good idea and it had drifted somewhere else: session 3 asked "what has been hardest to talk
 * about in this process - not the situation itself, what has been hard to say".
 *
 * Read live on a tea distribution check-in, 17 September 2026. Three things wrong with it, and the
 * third is the one that matters. It says the same thing twice. It reads as therapy on a screen
 * somebody opened to report on shops and margin. And it asks a person at work to account for their
 * own reticence, which is not something this product is owed and not something a colleague would
 * ask. The angle should be unexpected; the subject is always the work.
 *
 * The other half of the same run: "Today we're going to dig into what's actually happening on the
 * check-in with those shops." The check-in is where they are standing. It does not have shops.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = strip(readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8'));

describe('the shifted opener', () => {
  /*
   * The phrase survives in one place on purpose: inside the rule that bans it, as the quotation of
   * what was wrong. A rule that cannot quote the fault it exists for is a worse rule. So this
   * asserts it is never the question being ASKED - every occurrence sits after the ban.
   */
  it('never asks what has been hard to say', () => {
    const banAt = SRC.indexOf('NOT A QUESTION ABOUT THE CONVERSATION ITSELF');
    expect(banAt).toBeGreaterThan(-1);
    for (const phrase of ['hardest to talk about', 'what has been hard to say']) {
      let at = SRC.indexOf(phrase);
      while (at !== -1) {
        /* If this fails: the phrase appears somewhere other than inside the rule that bans it,
           which means something is asking it again. */
        expect(at).toBeGreaterThan(banAt);
        at = SRC.indexOf(phrase, at + 1);
      }
    }
  });

  it('asks about the work instead, and names what kind of question that is', () => {
    const three = SRC.slice(SRC.indexOf('SESSION 3 CONTINUITY (SHIFTED APPROACH)'));
    expect(three.slice(0, 700)).toMatch(/not put in writing yet|expected to be true by now|somebody else would say is going wrong/);
  });

  it('and tells the opener to name the work rather than this product', () => {
    const two = SRC.slice(SRC.indexOf('SESSION 2 OPENING STRUCTURE (SHIFTED APPROACH)'));
    expect(two.slice(0, 2000)).toMatch(/check-in, record or session/i);
  });
});
