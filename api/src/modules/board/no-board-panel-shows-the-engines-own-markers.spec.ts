import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A LIVE BOARD SHOWED "[VERIFIABILITY:HIGH] We need to hit 270 units this year." UNDER A NAME.
 *
 * The engine writes its own markers into `recordEntry.text` - `[VERIFIABILITY:...]`,
 * `[INFERRED:...]` - and the tiering in reads.ts is the thing that reads them back. They are
 * bookkeeping. `cleanText` takes them off, and every panel that renders an entry for a person calls
 * it. `whoOwnsWhat` did not, so the one panel whose whole job is to show what somebody said showed
 * the bookkeeping too.
 *
 * The rule this file holds: a board field named `text` that a person reads is cleaned. The one
 * exception is `loadReadInput`, which feeds the tiering and therefore must keep the marker - it
 * builds the input to a computation, not a screen.
 */
const SERVICE = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
/** Comments first. A guard that a comment satisfies is not a guard. */
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the board does not hand the engine its own markers back', () => {
  it('every raw `text: e.text` in the file is the one inside loadReadInput', () => {
    const raw = [...CODE.matchAll(/text: e\.text\b/g)].map((m) => m.index ?? 0);
    const readInput = CODE.indexOf('private async loadReadInput(');
    expect(readInput).toBeGreaterThan(-1);
    for (const at of raw) {
      expect(at).toBeGreaterThan(readInput);
    }
  });

  it('whoOwnsWhat cleans what it shows', () => {
    const panel = CODE.slice(CODE.indexOf("if (has('whoOwnsWhat'))"), CODE.indexOf("if (has('dependencies'))"));
    expect(panel).toContain('text: cleanText(e.text)');
  });
});
