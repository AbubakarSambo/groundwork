import { readFileSync } from 'fs';
import { join } from 'path';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = join(__dirname, '..');
const read = (p: string) => strip(readFileSync(join(SRC, p), 'utf8'));

/**
 * "[VERIFIABILITY:HIGH]" REACHED A PAGE TWICE.
 *
 * It lived on the front of the text, and the code that put it there said why: "the RecordEntry
 * schema does not yet have a dedicated column - this preserves the signal without a migration."
 * A reasonable IOU. It came due twice: once under people's names on the board, and once inside the
 * line a lead is shown when accepting a number off the record - in code written the same evening as
 * the second sighting.
 *
 * Every reader had to remember to strip it. The fifth reader did not, and there is no reason to
 * think the sixth would have.
 *
 * WHAT ACTUALLY ENDS IT is not another stripper. It is that new rows do not carry the marker at
 * all: a thing that is not in the text cannot be printed by somebody who forgot it was there. The
 * strippers stay for the rows written before the column, which still have it.
 */
describe('the marker is a column, not a prefix', () => {
  it('the write stores the column and leaves the text alone', () => {
    const SERVICE = read('conversation/conversation.service.ts');
    const at = SERVICE.indexOf('await this.prisma.recordEntry.createMany');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 900);
    expect(block).toContain('verifiability: v');
    expect(block).toContain('text: e.text.trim()');
    /* The prefix is not built any more. This is the line that ends the class. */
    expect(block).not.toMatch(/\[VERIFIABILITY:\$\{/);
  });

  it('and the read prefers the column over the old marker', () => {
    const READS = read('board/reads.ts');
    const at = READS.indexOf('const rawTier');
    expect(at).toBeGreaterThan(-1);
    const fn = READS.slice(at, at + 300);
    expect(fn).toContain('if (stored) return stored;');
    /* The fallback stays: every row written before the column still carries the marker inline, and
       reading those as LOW would flatten the specificity read on all of them. */
    expect(fn).toMatch(/VERIFIABILITY:\(HIGH\|MEDIUM\|LOW\)/);
  });

  it('and the board actually selects the column, or the fallback is all there is', () => {
    /*
     * A column nobody selects is a column that does nothing: the read would fall through to parsing
     * a marker that new rows no longer have, and every new line would read as LOW.
     */
    const BOARD = read('board/board.service.ts');
    const at = BOARD.indexOf('this.prisma.recordEntry.findMany');
    const near = BOARD.slice(at, BOARD.indexOf('workMention', at));
    expect(near).toContain('verifiability: true');
  });
});
