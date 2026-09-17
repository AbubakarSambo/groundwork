/**
 * READS COMMENTS ON PURPOSE - DO NOT ADD COMMENT-STRIPPING TO THIS FILE.
 *
 * SIXTY-SEVEN GUARDS COULD BE SATISFIED BY PROSE.
 *
 * A large share of this repository's specs assert on SOURCE TEXT rather than behaviour, deliberately:
 * they pin lessons whose defect was WHERE code lived rather than what it computed. That works only if
 * they match code. This codebase quotes code verbatim inside long explanatory comments - a virtue for
 * a reader, a trap for a scanner - so a spec that does not strip comments first can pass because a
 * sentence matched, while the protection it names has been deleted.
 *
 * That is not theoretical. It happened four times inside this repository's own audit, and once inside
 * a guard being written the same day to protect a Critical fix: deleting the verification call left
 * every assertion green, because `indexOf` returns -1 and `-1 < n` is true.
 *
 * This file is the ratchet. It does not fix anything; it stops the problem regrowing while the
 * remainder is migrated.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** Specs whose PURPOSE is to hold a comment to account. Stripping would remove what they test. */
const COMMENT_ACCURACY_BY_DESIGN = [
  'no-domain-landgrab.spec.ts',
  'nothing-before-verification.spec.ts',
  'participant-ground-context.spec.ts',
  'cadence-from-what-they-said.spec.ts',
  'an-approval-nobody-can-pre-empt.spec.ts',
  'activation-comments-accurate.spec.ts',
  'no-method-in-here-is-dead.spec.ts',
  'a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts',
  /*
   * ASSERTS THE PROMPT ITSELF, WHICH IS PROSE IN A TEMPLATE LITERAL RATHER THAN CODE.
   *
   * What it pins is the wording the model is given - "READ WHAT THEY HAVE ALREADY TYPED BEFORE YOU
   * ASK ANYTHING" and the rest - and stripping comments would not change a character of it. It is
   * on this list for the same reason as the others: the thing under test is words.
   */
  'the-setup-conversation-reads-you-first.spec.ts',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.spec\.ts$/.test(e)) out.push(p);
  }
  return out;
}

const OFFENDERS = walk(join(__dirname))
  .filter((p) => !COMMENT_ACCURACY_BY_DESIGN.some((n) => p.endsWith(n)))
  .filter((p) => {
    const t = readFileSync(p, 'utf8');
    if (!t.includes('readFileSync')) return false;
    return !t.includes('[\\s\\S]*?\\*\\/');
  });

describe('a source-assertion spec strips comments before it matches', () => {
  it('and the number that do not is zero on the API side', () => {
    /**
     * If this fails on a spec you have just written, add the two replaces the others use rather than
     * adding your file to the allow-list. The allow-list is for specs that test PROSE, not for specs
     * that are inconvenient to fix.
     */
    expect(OFFENDERS.map((p) => p.replace(__dirname, ''))).toEqual([]);
  });

  it('the by-design allow-list stays small and every entry still exists', () => {
    /** An allow-list nobody prunes becomes the loophole. */
    expect(COMMENT_ACCURACY_BY_DESIGN.length).toBeLessThanOrEqual(10);
    const all = walk(join(__dirname));
    for (const name of COMMENT_ACCURACY_BY_DESIGN) {
      expect(all.some((p) => p.endsWith(name))).toBe(true);
    }
  });
});
