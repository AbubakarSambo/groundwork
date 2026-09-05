/**
 * "SOLIDIFYING THE PRODUCT MEANS EVERY BUG FIXED AND USE CASE IS WORKING WELL.
 * NO BOTTLENECKS."
 *
 * The roadmap item said "Solidify the core product" and carried a status
 * somebody could move to done. "The product is solid" is exactly the kind of
 * thing everybody agrees with in a meeting and nobody has measured, so it now
 * carries three counts instead — and all three are already in this system.
 */
import { isSolid, whatIsLeftToSay } from './what-solid-means';

const NOTHING_LEFT = { bugsOpen: 0, useCasesNotWorking: 0, bottlenecks: 0 };

describe('whether the product is solid', () => {
  it('is true only when all three are zero', () => {
    expect(isSolid(NOTHING_LEFT)).toBe(true);
  });

  it.each([
    ['a bug', { ...NOTHING_LEFT, bugsOpen: 1 }],
    ['a use case that does not work', { ...NOTHING_LEFT, useCasesNotWorking: 1 }],
    ['a blocked company', { ...NOTHING_LEFT, bottlenecks: 1 }],
  ])('is false while there is %s', (_what, left) => {
    /*
     * DELIBERATELY UNFORGIVING. Not "most bugs" or "the important use cases" —
     * a definition with a threshold in it is one somebody negotiates on the
     * day, and writing it down in September is what stops that argument
     * happening in October.
     */
    expect(isSolid(left)).toBe(false);
  });
});

describe('what it says', () => {
  it('says it plainly when it is done', () => {
    expect(whatIsLeftToSay(NOTHING_LEFT)).toMatch(/The product is solid/);
  });

  it('names which part is not done, rather than a percentage', () => {
    /* "Eighty per cent solid" sounds like progress and answers nothing. The
       question is which use case still does not work, and for whom. */
    const said = whatIsLeftToSay({ bugsOpen: 2, useCasesNotWorking: 1, bottlenecks: 0 });
    expect(said).toBe('Not yet: 2 bugs open, 1 use case does not work yet.');
    expect(said).not.toMatch(/%/);
  });

  it('leaves out the parts that are done', () => {
    expect(whatIsLeftToSay({ bugsOpen: 0, useCasesNotWorking: 0, bottlenecks: 3 })).toBe(
      'Not yet: 3 companies are blocked.',
    );
  });

  it('counts one of each correctly, because a plural against a one is how a board stops being read', () => {
    expect(whatIsLeftToSay({ bugsOpen: 1, useCasesNotWorking: 1, bottlenecks: 1 })).toBe(
      'Not yet: 1 bug open, 1 use case does not work yet, 1 company is blocked.',
    );
  });
});

describe('the standing items on the roadmap', () => {
  const SEED = require('fs')
    .readFileSync(require('path').join(__dirname, 'seed-the-foundations.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('are the two that are not proposals', () => {
    expect((SEED.match(/standing: true/g) ?? []).length).toBe(2);
  });

  it('wait for no decision, because there is nothing to approve', () => {
    /* Leaving them waiting would put a permanent "waiting" against the one
       thing nobody is deciding. */
    expect(SEED).toContain('approvalRequired: !(item.standing ?? false)');
  });

  it('and the seed does not re-assert whether an item is standing... it does, and that is right', () => {
    /* Unlike a role or a sprint's dates, "is this the frame or a proposal" is
       not a per-item decision somebody makes on the board — it is what the item
       IS. So this one stays authoritative in the seed. */
    expect(SEED).toMatch(/update: \{[^}]*standing: item\.standing/);
  });
});
