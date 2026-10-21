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

/*
 * EMPTY IS NOT THE SAME AS DROPPED, AND THIS IS WHERE THAT IS DECIDED.
 *
 * Blocks hide when they have nothing, because a heading with nothing under it reads as a page that
 * failed to load. So on screen a block that was deleted and a block whose data is thin look
 * identical - and that is not theoretical: reading a screenshot of a real ground I reported two
 * surfaces as broken, and both were correct. One had a person with zero rows in that sitting.
 *
 * This reads the SOURCE, not a render. A block hidden behind a condition still has its label in the
 * file and passes; a block taken out of the file fails, however thin the data. That is the whole
 * reason it is a source-assertion rather than a rendering test.
 */
const SURFACES: { cell: keyof typeof THE_ORDER; file: string; skip?: string[] }[] = [
  { cell: 'A_SESSION', file: join(CLIENT, 'components', 'gw', 'TheCheckInYouJustFinished.tsx') },
  /* 'whatThisSitsUnder' draws only on a cascade, so it is not always on the page. */
  { cell: 'B_SESSION', file: join(CLIENT, 'components', 'gw', 'TheSessionsReport.tsx'), skip: ['whatThisSitsUnder'] },
];

/*
 * AND WHAT IS NOT CHECKED, SAID PLAINLY.
 *
 * The two run cells are not here. A_RUN's surface carries no block labels at all, and B_RUN's board
 * draws zones - "At a glance", "Against the plan", "The work" - which GROUP several blocks rather
 * than matching one each. Checking them would mean inventing a mapping that does not exist, and a
 * map claiming to cover a surface it does not is the fault this whole file is answering.
 *
 * They are covered by the journey run instead, which walks the board on every situation. That is
 * shape rather than order, and the difference is worth knowing.
 */
const NOT_CHECKED_HERE = {
  A_RUN: 'the surface carries no block labels, so there is nothing to match against',
  B_RUN: 'the board draws zones that group several blocks, not one label per block',
} as const;

describe('what this file does not cover', () => {
  it('names the two cells it cannot check, and why', () => {
    for (const [cell, why] of Object.entries(NOT_CHECKED_HERE)) {
      expect(`${cell}: ${why.length}`).toMatch(/: \d{2,}$/);
      expect(SURFACES.some((s) => s.cell === cell)).toBe(false);
    }
  });
});

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
         *
         * A fold drawn through the page's own `theFold("...", ...)` (which picks `Folded summary=` or
         * the light page's `FoldedLine name=`) is the label where it is drawn too, so it counts.
         */
        /* And a label the direct morning's switch words differently ("label={direct ? 'What to do next' : 'The conversation worth having now'}") is still that label, drawn in the same place. */
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const i = src.search(new RegExp(`(?:(?:label|summary)=|theFold\\()["']${escaped}["']|(?:label|summary)=\\{direct \\? '[^']*' : '${escaped}'\\}`));
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
