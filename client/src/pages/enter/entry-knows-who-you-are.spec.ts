import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE ENTRY CHAT DID NOT KNOW WHETHER YOU WERE SIGNED IN.
 *
 * `EntryChatPage` read `user` from the auth store on line 490 and used it nowhere. So somebody with an
 * account who opened `/start` walked the whole anonymous funnel and, at the end, was shown:
 *
 *   "What happens next: 1. Save your email below to keep access to this report.
 *                       2. Open the confirmation link we email you..."
 *
 * and an email box - asking a person who was already signed in to create the account they were signed
 * into, with their own name in the rail two inches to the left.
 *
 * Nothing needed building. `/entry/commit` has always taken the user off the token and created the
 * ground under their organisation; it is the endpoint the magic link lands on. The page simply never
 * asked the question.
 */
const SRC = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('somebody who is already signed in', () => {
  it('is not asked for an email: the panel ends with the send for her, the email only for somebody signed out', () => {
    /* Changed 22 November 2026: the save card is gone; the panel's one save is chosen by whether she is signed in. */
    expect(CODE).toMatch(/const theSaveBlock = user \? \(/)
  })

  it('gets a save that commits straight to their account', () => {
    expect(CODE).toMatch(/function saveAsSignedInUser/)
    /* UPDATED (Hafsah's blocker, 31 October 2026): the save reads the team box first and commits with it. */
    /* Changed 3 November 2026: the same commit also says when the lead holds the invitations until later. */
    /* Changed 22 November 2026: what is saved is the setup conversation itself (theRecord), the first session's record. */
    expect(CODE).toMatch(/entryApi\.commit\(\{ \.\.\.buildCommitPayload\(box\), history: record, \.\.\.\(how\.inviteLater \? \{ inviteLater: true \} : \{\}\) \}\)/)
  })

  it('is never shown her own address or the word account where she saves', () => {
    /* Changed 22 November 2026: "We save this for you, {name}." went with the save card; the panel says what sending does (new.txt). */
    expect(CODE).not.toMatch(/We save this to your account/)
    expect(CODE).not.toMatch(/Saving to \$\{user\.email\}/)
  })

  /* Changed 3 November 2026 (plan round 32): after "Send N invitations" the lead lands on the check-in's board, as the approved journey says. */
  it('lands on the check-in\'s board rather than back at a list', () => {
    expect(CODE).toMatch(/navigate\(`\/grounds\/\$\{res\.groundId\}\/board`, \{ replace: true \}\)/)
  })

  it('and the rail is told the check-in exists', () => {
    /**
     * GW-019: the check-ins list is cached, and it is usually fetched before this commit creates the
     * first ground - so without this the rail said "No grounds yet" while the person was looking at
     * the check-in they had just made.
     */
    expect(CODE).toMatch(/invalidateQueries\(\{ queryKey: \['grounds'\] \}\)/)
  })

  it('and the browser copies are cleared through the shared helper', () => {
    // Not by hand: `clearEntryHandover` is what knows every key, including the Google snapshot.
    expect(CODE).toMatch(/clearEntryHandover\(\)/)
  })
})

describe('and somebody without an account still gets the email path', () => {
  it('the email box is still there for them', () => {
    expect(CODE).toMatch(/\) : emailSent \? \(/)
    /* 22 November 2026: start-chat.txt's own words, "Save it", on the one block somebody signed out reads. */
    expect(CODE).toMatch(/KEEP_THIS_CONVERSATION\.save/)
  })
})
