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
  it('is not asked for an email', () => {
    expect(CODE).toMatch(/\{user && !emailSent \? \(/)
  })

  it('gets a save that commits straight to their account', () => {
    expect(CODE).toMatch(/function saveAsSignedInUser/)
    /* UPDATED (Hafsah's blocker, 31 October 2026): the save reads the team box first and commits with it. */
    /* Changed 3 November 2026: the same commit also says when the lead holds the invitations until later. */
    expect(CODE).toMatch(/entryApi\.commit\(\{ \.\.\.buildCommitPayload\(box\), history, \.\.\.\(how\.inviteLater \? \{ inviteLater: true \} : \{\}\) \}\)/)
  })

  it('and is told it is saved for them, by their own first name, not an address', () => {
    /* FAULT E (reviewer, third round): "Saving to {user.email}. No confirmation needed, you are
       already signed in." read like a log line. Reworded to "We save this to your account,
       {user.email}." - still named by email, no "signed in" talk needed to say it.

       SCREEN FAULT (engine workspace, 9 October night, test bed copy a): Ruth Kamara read "We
       save this to your account, admin@fieldnote.test." - her own address, and the word
       "account". Updated: no "account", and her first name in place of the address, with a plain
       fallback when no name is known. This test is changed because it pinned the old, faulty
       wording. */
    expect(CODE).toMatch(/We save this for you, \$\{user\.firstName\}/)
    expect(CODE).not.toMatch(/We save this to your account/)
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
    expect(CODE).toMatch(/: !emailSent \? \(/)
    /* 4d-3: the arrow is gone (CLAUDE.md's wording rule), so this checks the words it actually
       reads now. */
    expect(CODE).toMatch(/Save my check-in/)
  })
})
