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

/**
 * Which stage renders the situation cards, read off the render rather than assumed.
 *
 * This used to read a NUMBER out of `{step === 2 &&`, because the flow was held as bare integers.
 * When they were given names it found nothing and threw, which is the canary doing its job: it is
 * here precisely because a renumber once moved the wide column onto the wrong screen and nothing
 * noticed. It now reads the stage name the same way, and still fails if the column is given to a
 * screen other than the one holding the cards.
 */
const PICKER_STAGE = (() => {
  /* Anchored on the container's id, not its aria-label: the label now names whichever group the
     dropdown has open, which is right for a screen reader and no use as a marker. */
  const marker = SRC.indexOf('id="cg-situations"')
  expect(marker).toBeGreaterThan(-1)
  const before = SRC.slice(0, marker)
  const stages = [...before.matchAll(/\{step === STAGE\.(\w+) &&/g)]
  expect(stages.length, 'no named stage renders before the card grid').toBeGreaterThan(0)
  return stages[stages.length - 1][1]
})()

describe('the picker gets the whole width', () => {
  it('the wide column is given to the step that renders the cards', () => {
    expect(SRC).toContain(`maxWidth: step === STAGE.${PICKER_STAGE} ? 1160 : 540`)
  })

  it('and the picker is not the first stage, which is what the condition used to say', () => {
    /* If the picker ever becomes the first stage again this is worth re-reading, not deleting. */
    expect(PICKER_STAGE).not.toBe('who')
  })

  it('every other step keeps the narrow reading column', () => {
    /* A form read across 1160px makes the eye travel from a label to its field. */
    expect(SRC).toContain(': 540')
  })
})
