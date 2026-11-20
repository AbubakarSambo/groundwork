import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-128: a webhook's `permalink` for a finished check-in points at `/check-in/<id>`, with a hyphen -
 * an address the client never had. Opened from a connected tool's notification, it read "Nothing is
 * at this address". The real route is `/checkin/<id>` (no hyphen); this old, hyphenated shape must
 * redirect to it, the same way `/chat/:id` already does, rather than 404.
 */
describe('B-128: the hyphenated check-in permalink redirects to the real route', () => {
  const APP = readFileSync(join(__dirname, 'App.tsx'), 'utf8')

  it('has a route for the old, hyphenated address', () => {
    expect(APP).toMatch(/<Route path="\/check-in\/:checkInId" element={<ChatRedirect \/>} \/>/)
  })

  /* Changed in batch 2, group 5: /checkin/:id is kept for links already sent, and finds the conversation in its check-in's tab. */
  it('keeps /checkin/:checkInId working, as the way into the conversation in its tab', () => {
    expect(APP).toContain('<Route path="/checkin/:checkInId" element={<RequireOrgSetup><TheConversationLivesInItsTab /></RequireOrgSetup>} />')
  })
})
