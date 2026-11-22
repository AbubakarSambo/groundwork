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

/*
 * CHANGED 22 NOVEMBER 2026: the save card and its invite step are gone. The rule is unchanged and is said where saving happens now:
 * somebody not signed in is told, after giving their email, that opening the link is what saves it and what invites (never that
 * anybody is invited already); a signed-in lead reads what sending does beside the one button.
 */
describe('INVITE-TIMING: nobody is told people are invited before they are', () => {
  it('somebody not signed in is told the link saves it, with what opening it does', () => {
    expect(src).toMatch(/Open it to save this check-in\. \$\{whatOpeningTheLinkDoes\(peopleOnTheList, startsLater \? checkInBy : null\)\}/)
  })

  it('a signed-in lead reads when their first check-in opens, beside the send', () => {
    expect(src).toMatch(/<ReadyToSend people=\{peopleNow\} opens=\{whenTheirFirstCheckInOpens\(\)\}/)
  })
})
