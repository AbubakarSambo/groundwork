import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_TEMPLATE, NOT_THE_TEMPLATE } from './what-the-template-says';
import { THE_ORDER, WHAT_THE_BLOCK_IS_CALLED } from './the-four-reports';

/**
 * THE TEMPLATE IS A CLAIM ABOUT THE SCREENS, SO THE SCREENS ARE CHECKED.
 *
 * `report-templates.html` is gone - gitignored, never committed, unrecoverable. Nine surfaces were
 * built against it and one of them, surface 02, was still marked "not rebuilt yet" on the preview
 * page when that page was deleted. Nothing else in the repo said so, which is how a surface stays
 * unfinished while everybody believes it is done.
 *
 * What this holds is the part of the template that is structural: the finding alone at the top, the
 * four states, numbered by what is drawn, the long material folded. Whether the wording is right is
 * a human read and always will be.
 */
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src', 'components', 'gw');
const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const SHARED_HALF = strip(readFileSync(join(CLIENT, 'TheSessionsReport.tsx'), 'utf8'));
const YOUR_OWN = strip(readFileSync(join(CLIENT, 'TheCheckInYouJustFinished.tsx'), 'utf8'));

describe('the reference surface holds the template', () => {
  it('the finding is drawn alone, before the states', () => {
    expect(THE_TEMPLATE.findingFirstAndAlone).toBe(true);
    /*
     * The four states are `atAGlance`, whose labels come from the server - "Differences",
     * "Movement", "Blockers", "How much was said". Looking for those words in the component finds
     * nothing, which is the second time tonight a check has failed on where a string lives rather
     * than on what a page does.
     */
    const finding = SHARED_HALF.indexOf('{finding.text}');
    const states = SHARED_HALF.indexOf('d.atAGlance.map');
    expect(finding).toBeGreaterThan(-1);
    expect(states).toBeGreaterThan(finding);
  });

  it('and its basis is drawn under it, never above', () => {
    /*
     * A caveat above the thing it qualifies reads as a verdict on it.
     * Checked where they are DRAWN. My first version compared the first mention of each word in the
     * file, which found `basis` inside the type on the line that declares `finding` - a comparison
     * of two declarations rather than of two lines on a page.
     */
    const text = SHARED_HALF.indexOf('{finding.text}');
    const basis = SHARED_HALF.indexOf('{finding.basis}');
    expect(text).toBeGreaterThan(-1);
    expect(basis).toBeGreaterThan(text);
  });

  it('four states, and each one says what it means', () => {
    expect(THE_TEMPLATE.fourStatesInARow).toHaveLength(4);
    /*
     * `sub` is the clause saying what the number is OF. A tile that is a label and a figure alone
     * is a scoreboard, and the clause is what stops it being one.
     *
     * U.9 END-OF-MODULE API SUITE: THIS NO LONGER CHECKS FOR A BARE `{r.sub}` ON THE PAGE, BECAUSE
     * THE TILE IS NO LONGER TWO PIECES STACKED ON TOP OF EACH OTHER. The U.9 third review found
     * "Differences / 1. / still open, as the written report reads it" reading as a label, a figure
     * and a fragment rather than one thing - `{r.value}` and `{r.sub}` used to be drawn as two
     * separate lines. Each tile is now `tileSentence(r)`'s single full sentence ("People see one
     * thing differently. The main obstacle to signing new shops is seen differently."), which
     * still says what the number is of - the clause is folded INTO the sentence rather than left
     * beside it. So the same intent is checked against the new shape: the tile is drawn with
     * `tileSentence(r)`, and `tileSentence` itself reads `r.sub` when it composes that sentence.
     */
    expect(SHARED_HALF).toContain('tileSentence(r)');
    const tileSentence = SHARED_HALF.slice(SHARED_HALF.indexOf('function tileSentence'));
    expect(tileSentence).toContain('r.sub');
  });
});

describe('both rebuilt surfaces number by what is drawn', () => {
  /*
   * A BLOCK HIDES WHEN IT IS EMPTY, and fixed numbers then skip - "01 · 03 · 06" reads as three
   * pieces missing rather than as a report with three blocks. Both surfaces carry the same counter.
   */
  for (const [name, src] of [['the shared half', SHARED_HALF], ['your own half', YOUR_OWN]] as const) {
    it(`${name} counts what it draws`, () => {
      expect(src).toMatch(/next\s*=\s*\(\)\s*=>\s*\(step\s*\+=\s*1\)/);
      expect(src).toMatch(/n=\{next\(\)\}/);
    });
  }
});

describe('every block in a checked order is named once', () => {
  it('so the template and the screens cannot drift apart silently', () => {
    for (const cell of ['A_SESSION', 'B_SESSION'] as const) {
      for (const block of THE_ORDER[cell]) {
        /* whatThisSitsUnder draws only on a cascade and has no label of its own. */
        if (block === 'whatThisSitsUnder') continue;
        expect(`${block} -> ${WHAT_THE_BLOCK_IS_CALLED[block] ?? 'UNNAMED'}`).not.toContain('UNNAMED');
      }
    }
  });
});

describe('and every exception is written down', () => {
  it('names why, not just that', () => {
    /* The last unnamed exception sat for months on a page that was then deleted. */
    for (const [where, why] of Object.entries(NOT_THE_TEMPLATE)) {
      expect(`${where}: ${why.length}`).toMatch(/: \d{3,}$/);
    }
  });
});
