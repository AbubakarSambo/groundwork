import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE CATCH-ALL MUST NOT LOOK SWITCHED OFF.
 *
 * "My situation is different - I will describe it" was dashed-bordered,
 * transparent-backgrounded and grey-labelled, sitting among white cards with
 * solid borders and full-strength text. That is the visual language of a
 * disabled control. It has always worked when clicked; nothing on screen said
 * so.
 *
 * It matters more than a styling nit, because it is the only route for anyone
 * whose situation is not among the seventeen - and describing your own
 * situation is a first-class way to start a ground, not a consolation prize.
 *
 * Asserted against the source rather than a render: what is being held is the
 * absence of disabled-looking styling on this specific button, which a
 * screenshot test would not pin and a DOM query would not distinguish from any
 * other card.
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

/** The describe-your-own button, from its onClick to its closing tag. */
const BLOCK = (() => {
  const i = SRC.indexOf("setPickedSituation('other')")
  expect(i).toBeGreaterThan(-1)
  const start = SRC.lastIndexOf('<button', i)
  const end = SRC.indexOf('</button>', i)
  return SRC.slice(start, end)
})()

describe('the describe-your-own card', () => {
  it('has a solid border, like every other card', () => {
    expect(BLOCK).not.toMatch(/border:\s*'1px dashed/)
    expect(BLOCK).toMatch(/border:\s*'1px solid/)
  })

  it('has a real background rather than nothing', () => {
    expect(BLOCK).not.toMatch(/background:\s*'transparent'/)
  })

  it('states its label at full strength, not in the muted grey', () => {
    // gw-sub and gw-muted are the de-emphasised tokens. The label is the thing
    // someone scans for; it should read as loudly as "New hire starting".
    const label = BLOCK.slice(BLOCK.indexOf('My situation is different') - 200, BLOCK.indexOf('My situation is different'))
    expect(label).toMatch(/color:\s*'var\(--gw-text\)'/)
    expect(label).not.toMatch(/color:\s*'var\(--gw-(sub|muted)\)'/)
  })

  it('is still a button, and still reachable', () => {
    expect(BLOCK).toMatch(/onClick=\{\(\) => setPickedSituation\('other'\)\}/)
    expect(BLOCK).not.toMatch(/disabled/)
  })
})
