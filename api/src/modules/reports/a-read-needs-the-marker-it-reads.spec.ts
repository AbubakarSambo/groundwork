import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE READS DECIDE FROM A MARKER THE CALLER WAS STRIPPING OFF.
 *
 * Every record entry is stored with the extraction's verifiability tier on the front:
 * `[VERIFIABILITY:HIGH] I gave Kwame the supplier contact list on 4 September`. `buildContribution`
 * and `buildCoverage` read exactly that prefix to decide how checkable somebody's account is, and
 * they strip it themselves before any of it is shown.
 *
 * The picture builder handed them `cleanText(e.text)`, which removes the prefix. So the tier fell
 * back to LOW for every row, for every person, on every ground - and the shared picture told a
 * person who had given five dates, three names and a count of twenty three items: "Nothing named so
 * far could be checked by anyone else - no named people, organisations, numbers or dates."
 *
 * The board passes the same rows through untouched, which is why the two surfaces disagreed about
 * the same record. Pinned at the source line, because the mistake is invisible at the call site: it
 * is a helper that looks like tidying.
 */
/* Comments stripped before matching: the doc comment above quotes the line it forbids, and a guard
   a comment can satisfy is not a guard. */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));

describe('the entries handed to the reads keep their verifiability marker', () => {
  it('the read input passes the raw text, not the cleaned text', () => {
    const at = SRC.indexOf('entries: everyEntry.map(');
    expect(at).toBeGreaterThan(-1);
    const line = SRC.slice(at, SRC.indexOf('\n', at + 40));
    expect(line).toContain('text: e.text');
    expect(line).not.toContain('cleanText');
  });

  it('and the reads still strip it themselves before anything is shown', () => {
    const reads = strip(readFileSync(join(__dirname, '..', 'board', 'reads.ts'), 'utf8'));
    expect(reads).toMatch(/replace\(\/\^\\\[VERIFIABILITY:/);
  });
});
