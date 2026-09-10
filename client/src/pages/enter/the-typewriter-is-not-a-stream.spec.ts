import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "THE CHAT IS SLOW ON BOTH ENTRY AND WHEN SIGNED IN... THE RESPONSE IS SLOW AND DOESN'T RENDER AS
 * WRITING."
 *
 * First fix (September 2026): the entry endpoint did not stream, the reply arrived whole, and the
 * page animated it at eighty characters a second on top; the animation was bounded to a second.
 *
 * Second fix: the entry endpoints stream now (entryApi.chatStream, entryApi.onboardStream), so the
 * words appear as the model says them and there is nothing left to animate. The typewriter had to
 * go rather than be kept beside the stream: every delta restarted it, and the final reply could
 * match the last delta and skip the redraw with a half-drawn line on screen - observed live as
 * "That is a good, specific question, a".
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

describe('the stream is the animation', () => {
  it('has no typewriter over text that already arrived', () => {
    expect(SRC).not.toMatch(/const CHUNK = /)
    expect(SRC).not.toMatch(/setInterval\(\(\) => \{\s*i \+= /)
  })

  it('shows history as it is, and marks the streaming turn only while a reply is in flight', () => {
    expect(SRC).toMatch(/setDisplayedHistory\(history\)/)
    expect(SRC).toMatch(/setStreamingIdx\(loading && last\?\.role === 'assistant'/)
  })

  it('reads the check-in turns from the streaming route', () => {
    expect(SRC).toMatch(/entryApi\.chatStream\(/)
    expect(SRC).toMatch(/entryApi\.onboardStream\(/)
  })
})
