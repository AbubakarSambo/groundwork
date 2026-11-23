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

const BLOCKS = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'ui', 'blocks.css'), 'utf8')

/* Changed 15 November 2026 (Hafsah): the question is the heading in every phase, with no caption and no "tap to read it again" fold. It is one
   heading, so it does not eat the screen; the schedule line under it is only said before the first answer.
   CHANGED 23 November 2026 (journey 2, the design system): these read the page's structure, not its old inline styles. The heading is the
   page title from the tokens (24px on a phone), the box is the check-in's own card footer, and the home bar is cleared by the one
   frame every conversation-only page uses (blocks.css, .ds-alone). What a person sees and can press is unchanged. */
describe('the question stays at the top as the heading', () => {
  it('is a heading, and there is no folded caption', () => {
    expect(CODE).toMatch(/<h1 className="ds-text-title">\{what\.theQuestion\}<\/h1>/)
    expect(CODE).not.toMatch(/Tap to read it again/)
    expect(CODE).not.toMatch(/<details/)
  })
})

describe('the composer stays where a thumb is', () => {
  it('is the card\'s footer, with the transcript scrolling above it', () => {
    expect(CODE).toMatch(/<ConversationCard header=\{null\} footer=\{box\}>/)
    expect(BLOCKS).toMatch(/\.ds-ci-body \{[^}]*overflow-y: auto/)
  })

  /* A phone's home bar sits over the bottom of the viewport; without this the send button is half
     under it. */
  it('and clears the home bar', () => {
    expect(BLOCKS).toMatch(/\.ds-alone \{[^}]*env\(safe-area-inset-bottom, 0\)/)
  })
})

describe('finishing is visible', () => {
  /* The one beside the box ("I am done" calls askWhoTheyAre, as the engine's own close does): a 44px second button, never a link. */
  it('is a button, not an underlined link, and big enough to hit', () => {
    expect(CODE).toMatch(/<Button kind="secondary" onClick=\{askWhoTheyAre\}>I am done<\/Button>/)
  })

  it('and sits in the box\'s own footer rather than under the page', () => {
    const box = CODE.slice(CODE.indexOf('const box = ('), CODE.indexOf('const box = (') + 2500)
    expect(box).toContain('onClick={askWhoTheyAre}')
  })

  /* Nobody should press it wondering whether it throws away what they have just typed. */
  it('and says what it does', () => {
    expect(CODE).toContain('Finish and say where to send the report')
  })
})
