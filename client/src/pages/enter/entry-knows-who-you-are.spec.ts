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
    expect(CODE).toMatch(/entryApi\.commit\(\{ \.\.\.buildCommitPayload\(\), history \}\)/)
  })

  it('and is told where it is being saved, by name', () => {
    // The old copy promised an email that is not coming.
    expect(CODE).toMatch(/Saving to \{user\.email\}/)
    expect(CODE).toMatch(/already signed in/)
  })

  it('lands on the ground rather than back at a list', () => {
    expect(CODE).toMatch(/navigate\(`\/grounds\/\$\{res\.groundId\}`, \{ replace: true \}\)/)
  })

  it('and the rail is told the ground exists', () => {
    /**
     * GW-019: the grounds list is cached, and it is usually fetched before this commit creates the
     * first ground - so without this the rail said "No grounds yet" while the person was looking at
     * the ground they had just made.
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
    expect(CODE).toMatch(/Save my ground →/)
  })
})
