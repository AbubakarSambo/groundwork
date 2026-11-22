import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A PERSON WHOSE ADDRESS WAS TYPED IN DOES NOT GET DISCARDED BY "DONE".
 *
 * Adding somebody to a check-in takes two clicks: entering the email opens a note
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
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/*
 * CHANGED 22 NOVEMBER 2026: THE NOTE BOX AND ITS "DONE" ARE GONE WITH THE SAVE CARD. The person at risk was the one typed into the
 * per-person note box and not yet added when "Done" closed the card. There is no note box and no card now: the one team box is read
 * by every press that saves (readTheTeamBox), so whoever is typed there is on the check-in. Checked as the lead does it in
 * setup-is-the-chat-and-the-panel.spec.tsx ("whatever is typed in the box on the setup page goes with the start").
 */
describe('nobody typed in is dropped', () => {
  it('has no half-added state left to drop: no note box, no queue', () => {
    expect(SRC).not.toMatch(/inviteContextFor|bulkQueue|submitInviteContext/)
  })

  it('every save reads the box first, signed in or not', () => {
    for (const fn of ['async function saveAsSignedInUser', 'async function handleSaveInner']) {
      const body = SRC.slice(SRC.indexOf(fn), SRC.indexOf('\n  }\n', SRC.indexOf(fn)))
      expect(body).toMatch(/await readTheTeamBox\(\)/)
    }
  })
})
