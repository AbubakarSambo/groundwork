import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A GROUND HAS TO GIVE YOU YOUR CHATS BACK. W8-21, W8-57.
 *
 * "Session history" held a session number, a date and a summary of what we heard
 * - everything except the conversation. Hafsah: "I have no way to go back and
 * see my chats." A ground is a place you return to over ninety days, and
 * returning to a list of dates is not returning to anything.
 *
 * Asserted against source: the behaviour is a fetch fired on expand, and driving
 * it would need the whole ground payload to prove what these three lines prove.
 */
const SRC = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')

describe('reading a past check-in', () => {
  it('every completed session offers its conversation', () => {
    expect(SRC).toContain('<SessionConversation checkInId={ci.id} />')
  })

  it('through the owner-only transcript endpoint', () => {
    // getTranscript calls loadOwnedCheckIn, so a person sees their own words and
    // nobody else's. Any other source here would be a new read to argue about.
    expect(SRC).toContain('conversationApi.transcript(checkInId)')
  })

  it('and does not fetch twelve transcripts nobody opened', () => {
    // enabled: open. On a twelve-session ground, loading with the page is twelve
    // requests for something the person may never expand.
    const block = SRC.slice(SRC.indexOf('function SessionConversation'))
    expect(block.slice(0, block.indexOf('return ('))).toContain('enabled: open')
  })
})
