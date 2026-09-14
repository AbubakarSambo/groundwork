import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { REACHES_NO_SCREEN, whichCell } from './the-four-reports';

/**
 * THE DARK LIST IS A BACKLOG, AND A STALE BACKLOG IS WORSE THAN NONE.
 *
 * `REACHES_NO_SCREEN` names the reads this product computes, pays a model for, and shows nobody.
 * It is the honest state rather than an excuse: a field can be invisible and still have one correct
 * home, and being invisible is what gets fixed.
 *
 * Two of them had been fixed and the list did not know. `hiddenContributors` draws on the board,
 * `softSpots` draws on the close card as the person's own share of it - and both were still listed
 * as reaching nobody, so the nine genuinely dark ones sat behind two that were done and nobody could
 * tell which was which.
 *
 * So the list is checked against the thing it is a claim about: the screens. A field that is being
 * drawn cannot stay on it.
 */
const CLIENT = join(__dirname, '..', '..', '..', '..', 'client', 'src');

function everyScreen(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { everyScreen(p, out); continue; }
    /* Screens only. A type or a comment naming a field is not the field being shown to anybody. */
    if (!name.endsWith('.tsx')) continue;
    if (name.includes('.spec.')) continue;
    out.push(p);
  }
  return out;
}

const DRAWN = everyScreen(CLIENT)
  .map((f) => readFileSync(f, 'utf8')
    /* Comments out: three of these are named only in notes explaining why they are withheld. */
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' '))
  .join('\n');

describe('the dark list is a claim about the screens, and the screens are checked', () => {
  it('finds the screens, so an empty read cannot pass', () => {
    expect(DRAWN.length).toBeGreaterThan(200_000);
  });

  it('nothing on the list is being drawn', () => {
    const lit = REACHES_NO_SCREEN.filter((field) => new RegExp(`\\b${field}\\b`).test(DRAWN));
    expect(lit).toEqual([]);
  });

  it('and everything on it still has one correct home', () => {
    /* Being unplaced is what lets the next surface decide by accident. Invisible is a different
       problem from homeless, and only one of them is this list's business. */
    for (const field of REACHES_NO_SCREEN) expect(whichCell(field)).not.toBeNull();
  });
});
