import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * THE PAGE A HUNDRED PEOPLE OPEN, ON THE DEVICE THEY OPEN IT ON.
 *
 * Read at 375x812 on 23 September 2026. Hafsah: "make sure the people can see i'm done and the
 * whole checkin on their mobile phone, right now, that page does not seem mobile friedly."
 *
 * Three faults, all structural:
 *
 *   1. the brief was 240 of 812 pixels and printed above the conversation on EVERY turn - a
 *      paragraph somebody reads once, permanently taking thirty per cent of the screen, with the
 *      opening question restating most of it directly underneath;
 *   2. the composer scrolled away with the page, so after a few answers the box you type in was
 *      below the fold and the transcript had to be scrolled past to reach it;
 *   3. "I am done" was a thirteen-pixel underlined link BENEATH the input - the one place a phone
 *      keyboard covers - which is the control she specifically asked to be visible.
 */
const SRC = readFileSync(join(__dirname, 'AnswerFirstPage.tsx'), 'utf8')
const CODE = SRC.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the brief does not eat the screen', () => {
  it('is whole while they are deciding whether to start', () => {
    expect(CODE).toMatch(/phase === 'reading' \? \(/)
    expect(CODE).toMatch(/<h1 style=\{\{ fontSize: 20/)
  })

  it('and folds to one line once they are answering', () => {
    expect(CODE).toMatch(/<details style=\{\{ marginBottom: 14 \}\}>/)
    /* U.6 review: now a full sentence, "… Tap to read it again." */
    expect(CODE).toMatch(/Tap to read it again\./)
  })
})

describe('the composer stays where a thumb is', () => {
  it('is pinned to the bottom, with the transcript scrolling under it', () => {
    expect(CODE).toMatch(/position: 'sticky', bottom: 0/)
  })

  /* A phone's home bar sits over the bottom of the viewport; without this the send button is half
     under it. */
  it('and clears the home bar', () => {
    expect(CODE).toMatch(/env\(safe-area-inset-bottom, 0px\)/)
  })
})

describe('finishing is visible', () => {
  it('is a button, not an underlined link', () => {
    /* The one inside the pinned composer - there is an earlier `setPhase('address')` on the path
       the engine takes when it closes the session itself. */
    const at = CODE.lastIndexOf("setPhase('address')")
    const done = CODE.slice(at, at + 500)
    expect(done).toMatch(/borderRadius: 20/)
    expect(done).not.toMatch(/textDecoration: 'underline'/)
  })

  /* Forty pixels is the smallest thing a thumb hits reliably. */
  it('and is big enough to hit', () => {
    const at = CODE.lastIndexOf("setPhase('address')")
    expect(CODE.slice(at, at + 500)).toMatch(/minHeight: 40/)
  })

  it('and sits beside the send button rather than under the input', () => {
    expect(CODE).toMatch(/justifyContent: 'space-between'[^}]*\}\}>\s*<button onClick=\{\(\) => setPhase\('address'\)\}/)
  })

  /* Nobody should press it wondering whether it throws away what they have just typed. */
  it('and says what it does', () => {
    expect(CODE).toContain('Finish and say where to send the report')
  })
})
