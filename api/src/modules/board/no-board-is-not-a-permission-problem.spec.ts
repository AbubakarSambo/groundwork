import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ORDER OF TWO GATES, WHICH IS THE WHOLE BUG.
 *
 * Walking `/grounds/:id/board` as three roles on one private-mode ground:
 *
 *   PARTICIPANT: "This is a private alignment ground. Accounts are never shown to other parties, so
 *                 there is no shared board. Read your report instead."
 *   ORG ADMIN:   "You are not a party to this ground" plus a red Access denied toast.
 *
 * There is no board on that ground at all, for anybody. The person with the least authority was the
 * only one told the truth, and the admin was shown a permission problem that does not exist - one
 * tab after a banner saying "You can see everything here, which is the point of being an admin".
 *
 * WHY ANSWERING FIRST IS SAFE, and the reason this is not a privacy regression: whether this KIND of
 * ground has a board is a fact about the ground's mode and scenario. It does not depend on who is
 * asking, contains none of the accounts, and is already visible to every party. Where a ground DOES
 * have a board, the authorisation check still runs and still refuses.
 */
const SRC = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
/** Comments stripped: the strings below appear in the explanatory comments too. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const get = CODE.slice(CODE.indexOf('async get('), CODE.indexOf('async get(') + 4000);

describe('the board answers "is there one" before "who are you"', () => {
  it('both gates are still there', () => {
    expect(get).toMatch(/if \(!boardRendersFor\(ground\.scenario, ground\.mode\)\)/);
    expect(get).toMatch(/throw new ForbiddenException\('You are not a party to this ground'\)/);
  });

  it('and the mode gate comes FIRST', () => {
    const mode = get.indexOf('if (!boardRendersFor(');
    const authz = get.indexOf("throw new ForbiddenException('You are not a party to this ground')");
    expect(mode).toBeGreaterThan(-1);
    expect(authz).toBeGreaterThan(-1);
    /**
     * The assertion the whole file exists for. Reversed, an org admin on a board-less ground gets a
     * permission error instead of the sentence explaining there is nothing to permit.
     */
    expect(mode).toBeLessThan(authz);
  });

  it('the honest sentence is still the one a private ground returns', () => {
    expect(get).toMatch(/renders: false/);
    expect(SRC).toMatch(/there is no shared board\. Read your report instead\./);
  });

  it('and authorisation still guards everything after it', () => {
    /**
     * Asserted as "the accounts are read after the throw", not just "a throw exists" - moving the
     * gate down is only safe while nothing between the two gates touches a participant's words.
     */
    const authz = get.indexOf("throw new ForbiddenException('You are not a party to this ground')");
    const sections = get.indexOf('const sections = sectionsFor(');
    expect(sections).toBeGreaterThan(-1);
    expect(authz).toBeLessThan(sections);
  });
});
