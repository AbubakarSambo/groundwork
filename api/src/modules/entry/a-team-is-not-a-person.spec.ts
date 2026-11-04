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

  it('warns anybody who has named nobody', () => {
    /*
     * IT USED TO WARN ONLY A PARTY, because a coordinator's roster belonged to the lead they were
     * handing to. There is no hand-off any more, and setup no longer asks the role - so the old
     * condition would sit permanently false and the warning would vanish for everyone, which is
     * worse than either behaviour it was choosing between.
     */
    /* Read from the one reading of setup now (what-setup-knows, fix plan group 5), which holds this turn's people and those known before. */
    expect(SRC).toContain('needsPeople: !known.peopleNamed?.length');
  });

  it('stops reading the product’s own opening sentence as anybody’s account', () => {
    /*
     * IT USED TO SAY "as a COORDINATOR's account", conditional on `yourRole` not being a_party.
     * The rule is unconditional now and applies to everyone, which is stricter and simpler: the
     * sentence a card posts is phrased in the first person and nobody typed a word of it, so it is
     * a topic they picked whoever they are. The conditional version also could not survive the role
     * question moving to the end - there is no role to condition on while the opener is being read.
     */
    expect(SRC).toMatch(/Treat it as a TOPIC THEY PICKED/);
    expect(SRC).toMatch(/Never extract goals from it/);
  });
});
