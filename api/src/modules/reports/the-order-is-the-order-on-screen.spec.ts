import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_ORDER, WHAT_THE_BLOCK_IS_CALLED } from './the-four-reports';

/**
 * THE ORDER WAS DECLARED AND NOTHING READ IT.
 *
 * `THE_ORDER` names the blocks of each of the four reports, in the order they are read, with three
 * rules written above it about why that order and not another. It was imported by exactly one file:
 * the spec that asserts the order is internally consistent. No screen read it, and every surface
 * still held its own order in its own JSX - which is the state the declaration was written to end.
 *
 * So the order is checked against the screens. A block moved on a page without being moved here
 * fails, and a block moved here without the page fails too. That is what "design in code" has to
 * mean for a thing whose whole job is that eight surfaces agree.
 *
 * WHERE IT STOPS, SAID OUT LOUD. The two rebuilt session surfaces are joined. The run surfaces are
 * not, because their blocks are not yet one-to-one with a label. Claiming to cover them would be
 * the same fault this file exists to fix.
 */
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');
const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const SURFACES: { cell: keyof typeof THE_ORDER; file: string; skip?: string[] }[] = [
  { cell: 'A_SESSION', file: join(CLIENT, 'components', 'gw', 'TheCheckInYouJustFinished.tsx') },
  /* 'whatThisSitsUnder' draws only on a cascade, so it is not always on the page. */
  { cell: 'B_SESSION', file: join(CLIENT, 'components', 'gw', 'TheSessionsReport.tsx'), skip: ['whatThisSitsUnder'] },
];

describe('the order on the page is the order that was declared', () => {
  for (const s of SURFACES) {
    it(`${s.cell} draws its blocks in the declared order`, () => {
      const src = strip(readFileSync(s.file, 'utf8'));
      const wanted = THE_ORDER[s.cell].filter((b) => !(s.skip ?? []).includes(b));

      const at = wanted.map((block) => {
        const label = WHAT_THE_BLOCK_IS_CALLED[block];
        expect(`${block} -> ${label ?? 'NO LABEL'}`).not.toContain('NO LABEL');
        /*
         * THE LABEL WHERE IT IS DRAWN, not wherever the words appear. Matching anywhere found
         * "Where things stand" in a list of theme names near the top of the file and reported three
         * blocks out of order that were in perfect order on the page. A guard that cries wolf is a
         * guard somebody deletes.
         */
        const i = src.search(new RegExp(`(?:label|summary)=["']${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`));
        expect(`${s.cell} draws "${label}": ${i > -1}`).toContain('true');
        return { block, i };
      });

      const outOfOrder = at.filter((x, k) => k > 0 && x.i < at[k - 1].i).map((x) => x.block);
      expect({ surface: s.cell, drawnBeforeTheyShouldBe: outOfOrder }.drawnBeforeTheyShouldBe).toEqual([]);
    });
  }

  it('and every block in a checked order has a label, so the join cannot rot', () => {
    for (const s of SURFACES) {
      for (const block of THE_ORDER[s.cell]) {
        if ((s.skip ?? []).includes(block)) continue;
        expect(`${block} -> ${WHAT_THE_BLOCK_IS_CALLED[block] ?? 'NO LABEL'}`).not.toContain('NO LABEL');
      }
    }
  });
});
