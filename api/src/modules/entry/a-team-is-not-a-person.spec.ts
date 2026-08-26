import * as fs from 'fs';
import * as path from 'path';

/**
 * A TEAM IS NOT A PERSON, AND THE OPENER MAY NOT BE THEIRS.
 *
 * Two things the setup extraction was getting wrong, both proven against the live endpoint.
 *
 * ONE: `whoInvolved` is a free string, so ANY string satisfies it. "My team" came back as the answer
 * to who is involved - three people, no names - and `ready` went true on it. The interview then goes
 * on to ask what is expected of each person, with no roster to go through. `peopleNamed` is the
 * countable version: one entry per individual, so zero is visibly zero.
 *
 * TWO: setup usually opens with a sentence the PRODUCT wrote, picked from a list of situations and
 * phrased in the first person. For a party that is near enough to what they meant. For somebody
 * setting this up for other people it is the product writing an account in their voice about a
 * situation they never described - and goals were being extracted from it as though they had said
 * them. Observed: two goals returned, both traceable to the canned sentence.
 */
const SRC = fs
  .readFileSync(path.join(__dirname, 'entry.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('a team is not a person, and the opener may not be theirs', () => {
  it('extracts the people as a countable list, not only as a phrase', () => {
    expect(SRC).toContain("peopleNamed: { type: 'array'");
  });

  /** The rule has to say what does NOT count, or "my team" is one entry again. */
  it('tells it plainly that a team is zero people', () => {
    expect(SRC).toMatch(/"my team" is zero people, not one/i);
  });

  it('warns the lead who has named nobody, and only the lead', () => {
    expect(SRC).toContain("extracted.yourRole === 'a_party' && !extracted.peopleNamed?.length");
  });

  it('stops reading the product’s own opening sentence as a coordinator’s account', () => {
    expect(SRC).toMatch(/treat that opening sentence as a TOPIC THEY PICKED/);
  });
});
