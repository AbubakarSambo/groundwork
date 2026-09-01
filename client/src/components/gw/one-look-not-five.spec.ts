import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ONE LOOK, NOT FIVE. W8-29.
 *
 * "The board is the design system; the rest has not caught up." The board's pieces were
 * extracted into `components/gw/kit.tsx` - Zone, Sec, Card, Row, Pill, Stat - and the
 * grounds list, the check-in page and the record tab now use them.
 *
 * The thing that made five variants possible is not laziness, it is that hand-rolling a
 * section label is four lines and importing one is one, so the four lines keep winning.
 * This makes the four lines fail.
 *
 * WHAT IT DOES NOT DO. It does not police every colour or spacing choice - a page with a
 * genuine reason to look different should be able to. It catches the specific thing that
 * went wrong: the kit's OWN components being reimplemented inline next to their imports.
 */

/**
 * PAGES AND THE SHARED VIEWS BOTH.
 *
 * This scanned `pages/` only. That was true enough while the screens were written in the pages -
 * and stopped being true when the party view's record, private report, participation block and
 * shared report were lifted into `components/gw` so the view that runs a check-in could render
 * them. Those files import the kit and could hand-roll a section label; nothing here would have
 * noticed.
 *
 * The gap announced itself quietly, which is the point worth keeping: this file generates one test
 * per file that imports the kit, so when `GroundParticipantPage` stopped importing it the test did
 * not fail - it disappeared, and the suite went from 1374 to 1373 while staying green. A test that
 * vanishes reads exactly like a test that passes.
 */
const ROOTS = [join(__dirname, '../../pages'), join(__dirname, '..', 'gw')]

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) files(full, out)
    else if (/\.tsx$/.test(name) && !name.includes('.spec.')) out.push(full)
  }
  return out
}

/**
 * A hand-rolled version of the kit's `Sec`: an uppercase, letter-spaced, bold label.
 * The kit's own is 12.5px with .4px spacing; every hand-rolled one picked its own size,
 * its own spacing and its own hardcoded grey.
 */
const HAND_ROLLED_SECTION_LABEL = /fontSize: 1[01](\.\d)?, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '\.0\d+em', color: '#9B9590'/

describe('a page that imports the kit does not also hand-roll it', () => {
  for (const f of ROOTS.flatMap(r => files(r))) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    /* A file inside `components/gw` imports its neighbour as `./kit`, not by the full path. The
       check tested for the long form only, so every view lifted out of the party page was skipped
       silently - widening the search roots alone changed nothing. Both spellings. */
    if (!src.includes('components/gw/kit') && !/from '\.\/kit'/.test(src)) continue
    it(`${f.split('/').pop()} uses Sec rather than rebuilding it`, () => {
      const matches = src.match(new RegExp(HAND_ROLLED_SECTION_LABEL, 'g')) ?? []
      expect(
        matches.length,
        `${f.split('/').pop()} imports the kit and still hand-rolls ${matches.length} ` +
          `section label(s). Use <Sec title="..." /> - that is what it is for, and five ` +
          `slightly different greys is how the product came to look like five products.`,
      ).toBe(0)
    })
  }
})

describe('the kit is the only place its tokens are defined', () => {
  it('and it still defines them', () => {
    // A tripwire pointed at an empty kit asserts nothing.
    const kit = readFileSync(join(__dirname, 'kit.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const piece of ['export function Zone', 'export function Sec', 'export function Card', 'export function Stat']) {
      expect(kit).toContain(piece)
    }
  })
})
