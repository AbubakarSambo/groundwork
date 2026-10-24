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

/*
 * UPDATED 20 October (the kit's design everywhere): "I am done" is the kit's secondary button now
 * (the shared `gwui-btn gwui-btn-secondary` classes, 44px tall) instead of a hand-styled 40px pill.
 * These three read its style from the source, so they now read the classes. The words, where it
 * sits and what it does are unchanged.
 */
describe('finishing is visible', () => {
  /* The one inside the pinned composer - there is an earlier `setPhase('address')` on the path
     the engine takes when it closes the session itself. */
  const theTag = () => {
    const at = CODE.lastIndexOf("setPhase('address')")
    return CODE.slice(CODE.lastIndexOf('<button', at), at + 200)
  }
  it('is a button, not an underlined link', () => {
    expect(theTag()).toMatch(/className="btn sec"/)
    expect(theTag()).not.toMatch(/textDecoration: 'underline'/)
  })

  /* Forty-four pixels: the kit's button, and what a thumb hits reliably. */
  it('and is big enough to hit', () => {
    expect(theTag()).not.toMatch(/gwui-btn-small/)
  })

  it('and sits beside the send button rather than under the input', () => {
    expect(CODE).toMatch(/justifyContent: 'space-between'[^}]*\}\}>\s*<button className="btn sec" onClick=\{\(\) => setPhase\('address'\)\}/)
  })

  /* Nobody should press it wondering whether it throws away what they have just typed. */
  it('and says what it does', () => {
    expect(CODE).toContain('Finish and say where to send the report')
  })
})
