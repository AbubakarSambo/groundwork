import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ONE WORD THE PRODUCT BANS, IN A QUESTION IT ASKS PEOPLE.
 *
 * Seen on the Context page: "How long is this ground for?" - and, a question later, "the report can
 * only speak about the ground as a whole". `VOCABULARY_RULE` says never say "ground" to a person,
 * and `oneWordForTheThing` strips it from model replies on the way out. These are not model replies.
 * They are hardcoded questions in this file, so nothing was ever going to catch them.
 *
 * It matters more here than in a stray sentence. This chat is what a lead meets when the check-in
 * says something is missing, so the internal name for the thing is the first word they read about
 * it - on the page whose whole job is explaining what this is.
 */
const SRC = readFileSync(join(__dirname, 'the-context-chat.ts'), 'utf8')
  /* Comments out first: the note above quotes the banned word, and a guard a comment satisfies is
     not a guard. The prose in this file discusses "grounds" as a concept freely; what must not
     carry it is anything shown to a person. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Every string this file will actually say to somebody. */
const SPOKEN = [...SRC.matchAll(/(?:ask|says|label|title):\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);

describe('the context chat says check-in', () => {
  it('found the questions, or this proves nothing', () => {
    expect(SPOKEN.length).toBeGreaterThanOrEqual(5);
  });

  it('never says "ground" to a person', () => {
    const offenders = SPOKEN.filter((s) => /\bgrounds?\b/i.test(s));
    expect(offenders).toEqual([]);
  });

  it('and does not reach for the other internal words either', () => {
    /* The same list VOCABULARY_RULE holds. "Contributor" and "party" are ours, not theirs. */
    const offenders = SPOKEN.filter((s) => /\bcontributors?\b/i.test(s));
    expect(offenders).toEqual([]);
  });
});
