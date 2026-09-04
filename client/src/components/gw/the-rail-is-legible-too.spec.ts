import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE CONTRAST FIX MISSED EVERY COLOUR THAT IS NOT A TOKEN.
 *
 * `every-colour-a-person-reads-is-legible` checks the design tokens against the four backgrounds
 * text sits on, and it passes. The rail's text is not a token: it is written inline as
 * `rgba(255,255,255,.3)` on a navy that exists only there.
 *
 * Measured on the running product, compositing alpha properly, on rgb(13,26,43):
 *
 *   .25 = 2.42    .30 = 2.69    .38 = 3.54    .40 = 3.70    .45 = 4.40    .55 = 5.19
 *
 * So .46 is the floor for 4.5:1, and everything a person reads in the rail now sits at .55.
 *
 * WHY THIS IS A SOURCE GUARD AND NOT A BROWSER CHECK. The browser sweep is the better instrument
 * and it found the first three - but it can only measure what is on screen, and it reported clean
 * while four faint values were still in the file: the mobile nav label needs a 375px viewport, the
 * "1/N sessions" line needs a ground in progress, and the collapsed-rail icon needs the rail
 * collapsed. A guard over the source sees them all without having to reach the state.
 *
 * TWO EXEMPTIONS, both real:
 *   - Borders, backgrounds and input fills are not text. `rgba(255,255,255,.07)` as a hairline is
 *     correct, so this reads `color:` declarations only.
 *   - A disabled control has no contrast requirement (WCAG 1.4.3). The nav item at .25 carries
 *     `pointerEvents: 'none'`, and the Settings "Save" button measured 4.04 while disabled;
 *     darkening either would make a dead control look live.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

/* Every white this file puts in a `color:`, including both branches of a ternary.

   Anchoring on the nearest preceding property rather than parsing the value: `rgba(...)` contains
   commas, so any value pattern that stops at a comma truncates inside the colour itself and matches
   nothing. The "finds the whites" check below exists because that is exactly what happened. */
function railTextAlphas(src: string): number[] {
  const out: number[] = []
  for (const m of src.matchAll(/rgba\(255,\s*255,\s*255,\s*(\.\d+|0?\.\d+|1)\)/g)) {
    const before = src.slice(Math.max(0, m.index! - 220), m.index!)
    const props = [...before.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*:/g)]
    if (props.length && props[props.length - 1][1] === 'color') out.push(Number(m[1]))
  }
  return out
}

describe('the rail is legible too', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(SHELL.length).toBeGreaterThan(5000)
  })

  it('finds the whites it is meant to be judging', () => {
    /* If the extractor silently matched nothing, the guard below would pass on anything. */
    expect(railTextAlphas(SHELL).length).toBeGreaterThan(8)
  })

  it('no rail text sits below the alpha that clears 4.5:1 on its own background', () => {
    const DISABLED = 0.25 /* the pointerEvents:'none' nav item - exempt, and the only .25 left */
    const tooFaint = railTextAlphas(SHELL).filter(a => a < 0.46 && a !== DISABLED)
    expect(tooFaint).toEqual([])
  })

  it('and the values that were failing are gone by name', () => {
    for (const a of ['.3', '.35', '.38', '.4', '.45']) {
      expect(SHELL).not.toContain(`color: 'rgba(255,255,255,${a})'`)
    }
  })
})
