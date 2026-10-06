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

  it('the extractor still finds a white text colour when there is one, so the next check means something', () => {
    /* If the extractor silently matched nothing, the guard below would pass on anything. */
    expect(railTextAlphas("style={{ color: 'rgba(255,255,255,.55)' }}")).toEqual([0.55])
  })

  it('and the rail is light now, so no text in it is a white laid over navy', () => {
    /*
     * THE RAIL IS NO LONGER NAVY (A1, the design system). It sits on the page's own cream, and its
     * text uses the design tokens that every-colour-a-person-reads-is-legible measures against every
     * ground. So the white-alpha values this file was written to police are gone, and none may come
     * back: white text on a cream rail would be invisible.
     */
    expect(railTextAlphas(SHELL)).toEqual([])
  })

  it('every colour the rail\'s stylesheet gives text is a measured token, or white on a filled mark', () => {
    const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...CSS.matchAll(/([^{}]*\.gw-(?:rl|ci|rail)[^{}]*)\{([^}]*)\}/g)]
    expect(rules.length).toBeGreaterThan(20)
    const ALLOWED = /^(var\(--gw-(text|sub|navy|green-t|red-t|amber-t|muted)\)|#fff|inherit)$/
    const bad: string[] = []
    for (const [, sel, body] of rules) {
      for (const m of body.matchAll(/(?:^|;|\s)color:\s*([^;]+);/g)) {
        const v = m[1].trim()
        if (!ALLOWED.test(v)) bad.push(`${sel.trim()} color: ${v}`)
        // White text only where the rule also paints a solid dark fill under it. Amber-t (#8A5C1A)
        // joined in U.5 for Today's count, as the prototype draws it: white on it is about 5.8 to 1.
        if (v === '#fff' && !/background:\s*var\(--gw-(navy|green-t|amber-t)\)/.test(body)) bad.push(`${sel.trim()} is white on no fill`)
      }
    }
    expect(bad).toEqual([])
  })

  it('and the values that were failing are gone by name', () => {
    for (const a of ['.3', '.35', '.38', '.4', '.45']) {
      expect(SHELL).not.toContain(`color: 'rgba(255,255,255,${a})'`)
    }
  })
})
