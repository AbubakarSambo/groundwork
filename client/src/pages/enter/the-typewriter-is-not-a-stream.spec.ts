import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "THE CHAT IS SLOW ON BOTH ENTRY AND WHEN SIGNED IN... THE RESPONSE IS SLOW AND DOESN'T RENDER AS
 * WRITING."
 *
 * The entry endpoint does not stream: the reply arrives whole. This page then animated it at two
 * characters every 25 milliseconds - eighty characters a second - so a five-hundred-character answer
 * spent six further seconds appearing after the model had already finished.
 *
 * A real stream is slow because the words are genuinely not there yet. This one was slow on purpose,
 * over text already sitting in memory: all of the waiting and none of the reason for it. Worse, it
 * makes the product look slower than it is, which is the opposite of what the effect is for.
 *
 * Bounded by time now rather than by length. The rate is whatever gets this reply out in about a
 * second, so short answers still feel written and long ones stop being a penalty for asking
 * something that deserved a full answer.
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

describe('the typewriter is not a stream', () => {
  it('sizes each chunk from the reply length, not a fixed two characters', () => {
    expect(SRC).toMatch(/const CHUNK = Math\.max\(2, Math\.ceil\(full\.length \/ \(ABOUT_A_SECOND \/ DELAY\)\)\)/)
  })

  it('and no longer hardcodes the crawl', () => {
    /* `const CHUNK = 2` next to a 25ms delay is the whole bug, in two lines. */
    expect(SRC).not.toMatch(/const CHUNK = 2\b/)
  })

  it('takes about the same time whatever the reply is worth reading', () => {
    /* The arithmetic the page runs, checked directly: a long answer must not cost more seconds. */
    const ABOUT_A_SECOND = 900
    const DELAY = 25
    const howLong = (length: number) => {
      const chunk = Math.max(2, Math.ceil(length / (ABOUT_A_SECOND / DELAY)))
      return Math.ceil(length / chunk) * DELAY
    }
    expect(howLong(500)).toBeLessThanOrEqual(1000)
    expect(howLong(2000)).toBeLessThanOrEqual(1000)
    /* And the old rate, for the record: six seconds of animation on a 500-character reply. */
    expect(Math.ceil(500 / 2) * 25).toBeGreaterThan(6000)
  })

  it('still animates a short reply rather than pasting it', () => {
    /* The floor of two characters is what keeps "Got it." from simply appearing. */
    const chunk = Math.max(2, Math.ceil(40 / (900 / 25)))
    expect(chunk).toBe(2)
  })
})
