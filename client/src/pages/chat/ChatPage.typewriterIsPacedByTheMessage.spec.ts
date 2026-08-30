import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A LONG ANSWER TOOK LONGER TO APPEAR THAN IT TOOK TO WRITE.
 *
 * Two characters every 25ms is 80 a second: a pleasant pace for a two-line reply and fifteen
 * seconds for a twelve-hundred-character one. This product's replies get longest exactly when they
 * matter most - a summary, a long probe - so the wait grew with the value of what was waiting.
 */
const SRC = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '')

/** The real arithmetic, read out of the source so this cannot drift from it. */
function secondsFor(chars: number): number {
  const within = Number(/const FINISH_WITHIN = (\d+)/.exec(SRC)![1])
  const tickMs = Number(/\}, (\d+)\)\s*return \(\) => clearInterval\(tick\)/.exec(SRC)![1])
  const step = Math.max(2, Math.ceil(chars / (within / tickMs)))
  return (Math.ceil(chars / step) * tickMs) / 1000
}

describe('the typewriter is paced by the message, not by the character', () => {
  it('actually advances by the computed step', () => {
    /*
     * The first version of this only did the arithmetic that the source describes, so putting the
     * fixed `i += 2` back left every number right and the loop unchanged - a spec about a constant
     * rather than about the behaviour the constant is for.
     */
    expect(SRC).toContain('i += step')
    expect(SRC).not.toMatch(/i \+= 2\b/)
  })

  it('finishes a long reply in about two seconds rather than twenty', () => {
    expect(secondsFor(1800)).toBeLessThan(3)
    /* What it used to be: 1800 / 2 * 25ms. */
    expect((Math.ceil(1800 / 2) * 25) / 1000).toBeGreaterThan(20)
  })

  it('and does not run away with a very long one', () => {
    expect(secondsFor(4000)).toBeLessThan(3)
  })

  it('leaves short replies exactly as unhurried as they were', () => {
    /* The step never drops below the old two, so nothing that felt right starts feeling rushed. */
    expect(secondsFor(40)).toBeCloseTo((Math.ceil(40 / 2) * 25) / 1000, 2)
  })

  it('never divides by zero or stalls, whatever the length', () => {
    for (const n of [0, 1, 2, 7, 999_999]) expect(Number.isFinite(secondsFor(n))).toBe(true)
  })
})
