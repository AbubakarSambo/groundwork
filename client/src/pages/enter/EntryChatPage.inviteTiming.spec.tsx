import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Invite-timing guard (source-level). In the entry flow the initiator has not
 * confirmed their email at the point they add contributors, so invites are
 * queued, not sent. The save card already stated this (#79); the
 * add-participants step did not. This asserts the deferred-send timing copy is
 * present AND co-located inside the invite-contributors block (between the
 * "Invite contributors" heading logic and the contributor input), so it bites
 * if the line is deleted or moved out of that step. Wording stays consistent
 * with the save card (ties sending to confirming email).
 *
 * A source guard (not a render test) because reaching this exact sub-step in
 * EntryChatPage requires driving the whole onboarding->checkin->save state
 * machine; the live behaviour is proven separately by a browser screenshot.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'),
  'utf8',
)

describe('INVITE-TIMING: add-participants step states invites are deferred until email confirmation', () => {
  /* U.6 review: reworded so it never promises a send that can wait or fail. The rule it holds is
     unchanged: nobody is invited before the check-in is saved and the email confirmed. */
  it('contains the deferred-send timing copy, consistent with the save card', () => {
    expect(src).toMatch(/Nobody is invited before you save this check-in and confirm your email\./)
  })

  it('places the timing copy inside the invite-contributors step (not elsewhere)', () => {
    const heading = src.indexOf('const inviteHeading =')
    const input = src.indexOf('value={inviteEmail}')
    const timing = src.indexOf('Nobody is invited before you save this check-in')
    expect(heading).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(-1)
    // the timing note sits after the invite heading logic and before the
    // contributor email input -> it is part of the add-contributors step.
    expect(timing).toBeGreaterThan(heading)
    expect(timing).toBeLessThan(input)
  })
})
