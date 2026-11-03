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
    /* The rows are built from the assessment since F5 (theRecordLinesFromTheAssessment), for the record and the end card alike. */
    const at = SERVICE.indexOf('return aTypedReferenceBacksItsLine(lines.map((l) =>');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 1400);
    expect(block).toContain('verifiability: l.verifiability');
    /*
     * The text goes in as the person said it, with no marker built onto the front of it - which is
     * what this spec is for. It used to pin the exact call `e.text.trim()`; the trim now happens
     * inside theLineWithoutItsDanglingJoin, which takes a leading "and" off the half of a split
     * sentence that kept it and changes nothing else. Pinning the rule rather than the call, so a
     * tidy-up that leaves her words alone does not read as a marker coming back.
     */
    /* Since 6331337b the line is also given back the quotation marks the person typed, and stored
       as `line` - still only their own words, with no marker on the front. The rule is the same. */
    expect(block).toMatch(/const text = theirQuotationMarksBack\(theLineWithoutItsDanglingJoin\(l\.text\), whatTheyTyped\)/);
    expect(block).toMatch(/\btext, saidWordForWord/);
    expect(block).not.toMatch(/text: `/);
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
