import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PICKER GETS THE WHOLE WIDTH, AND THE CONDITION POINTED AT THE WRONG STEP.
 *
 * The wide column was written for the situation picker and says so at length. The condition read
 * `step === 1`. The steps were renumbered - the same edit that left "Step 6 (was 5)" further down
 * the file - and this kept the old number, so the widening applied to step 1, which is the
 * three-option "who is this check-in for?" question, and never to the picker at all.
 *
 * Measured on the running page before the fix: body capped at 540px on a 1280px screen, and the
 * card grid takes its column count from the VIEWPORT rather than its container - so it asked for
 * four columns, got a 508px box, and produced cards about 119px wide. Narrower than they had ever
 * been as a single column.
 *
 * After: 1160px, four columns at 243px on a 1280px screen, three at 1024, one on mobile, nothing
 * overflowing a card at any of them.
 *
 * WHY A GUARD AND NOT JUST THE FIX. This broke silently once already, by renumbering, and a step
 * number is exactly the kind of thing that gets renumbered again. Pinning it to the step that
 * renders the cards means the next renumber has to notice.
 */
const SRC = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '')

/** Which step renders the situation cards, read off the render rather than assumed. */
const PICKER_STEP = (() => {
  const marker = SRC.indexOf('role="radiogroup" aria-label="What is this for?"')
  expect(marker).toBeGreaterThan(-1)
  const before = SRC.slice(0, marker)
  const steps = [...before.matchAll(/\{step === (\d+) &&/g)]
  return steps[steps.length - 1][1]
})()

describe('the picker gets the whole width', () => {
  it('the wide column is given to the step that renders the cards', () => {
    expect(SRC).toContain(`maxWidth: step === ${PICKER_STEP} ? 1160 : 540`)
  })

  it('and the picker is not step 1, which is what the condition used to say', () => {
    /* If a renumber ever makes the picker step 1 again this is worth re-reading, not deleting. */
    expect(PICKER_STEP).not.toBe('1')
  })

  it('every other step keeps the narrow reading column', () => {
    /* A form read across 1160px makes the eye travel from a label to its field. */
    expect(SRC).toContain(': 540')
  })
})
