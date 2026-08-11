import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A PERSON WHOSE ADDRESS WAS TYPED IN DOES NOT GET DISCARDED BY "DONE".
 *
 * Adding somebody to a ground takes two clicks: entering the email opens a note
 * box, and "Add person" commits them to the list. Closing the save panel with that
 * box still open threw them away silently - no invite, no warning - and the closing
 * line went on reporting the invites it WAS about to send, which made the omission
 * invisible.
 *
 * FOUND IN THE OVERNIGHT RUN'S OWN SCREENSHOT, not by reading. Suite V reported
 * three separate criticals - no queue shown, no "Invited (1)", no invite email - and
 * they read as a broken invite queue. The screenshot at that step showed an email
 * filled in, a note reading "On the build", and "Add person" never pressed. The
 * queue was working perfectly. The person never reached it.
 *
 * Somebody who has typed an address and a note has said who they mean. The second
 * click is a convenience for adding several people in a row, not a consent gate -
 * the consent was typing the address.
 *
 * Asserted against source: what is held is that the dismiss handler drains the
 * pending entry, which is a wiring fact. A render test would need the whole
 * post-send panel state, and the thing that broke was one missing call.
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

/** The "Done" button that closes the save panel, from its onClick to its label. */
const DONE = (() => {
  const at = SRC.indexOf('>\n                  Done\n')
  if (at === -1) throw new Error('The save panel\'s "Done" button is gone from EntryChatPage.tsx.')
  return SRC.slice(SRC.lastIndexOf('<button', at), at)
})()

describe('closing the save panel', () => {
  it('commits the person still sitting in the note box', () => {
    // THE FIX. Without the submitInviteContext() call, the typed-in person is
    // dropped on the floor.
    expect(DONE).toMatch(/if \(inviteContextFor\) submitInviteContext\(\)/)
  })

  it('and still closes the panel, which is what the button is for', () => {
    expect(DONE).toMatch(/setShowSave\(false\)/)
  })

  it('commits BEFORE closing, since the panel unmounts the pending state', () => {
    expect(DONE.indexOf('submitInviteContext')).toBeLessThan(DONE.indexOf('setShowSave(false)'))
  })
})

describe('the closing line that promises the sends', () => {
  it('counts the pending person too, so the number is not wrong by one', () => {
    // It read inviteAdded.length alone, so it promised to send 1 invite while two
    // people had been named - and the one it left out was the one at risk.
    const line = SRC.slice(SRC.indexOf('Nothing else to do here'), SRC.indexOf('You can reopen this any time'))
    expect(line).toMatch(/inviteContextFor/)
    expect(line).toMatch(/inviteAdded\.length \+ pending/)
  })
})
