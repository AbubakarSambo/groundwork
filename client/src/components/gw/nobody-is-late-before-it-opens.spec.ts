import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * WATCHED AT REST FOR THE FIRST TIME. W14-12.
 *
 * Every verification until now used a check-in whose sessions were all done or all open. Nobody had
 * watched one sit between sessions with a date in the future, which is where a check-in spends most of
 * its life. Done by moving a real ground's last session back to NOT_STARTED with `available_from`
 * five days out, reading the page, and putting the rows back exactly as they were.
 *
 * The composer was right: "Your next check-in opens 18 August." Two inches above it the roster said
 * "You - waiting, Abubakar - waiting". Waiting is the word for somebody who has not done a thing
 * they could have done, and neither of them could have. On a product whose entire subject is who did
 * what and when, a resting ground quietly told a lead their team was late.
 */
const SRC = readFileSync(join(__dirname, 'GroundChat.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the roster between sessions', () => {
  it('drops "waiting" when the next session has not opened', () => {
    expect(CODE).toMatch(/notOpenYet \? '' : ' · waiting'/)
  })

  it('and the hover text says why, rather than nothing', () => {
    /**
     * Lower-cased when W-UX-4 put the person's own label in front of it, so the tooltip reads
     * "Ejiro - the next session has not opened yet" as one sentence. The distinction this test
     * exists for is the three STATES, not their capitalisation.
     */
    expect(CODE).toMatch(/notOpenYet \? 'the next session has not opened yet'/)
  })

  it('still says waiting when a session IS open', () => {
    // The signal is worth keeping. It was only ever wrong at rest.
    expect(CODE).toMatch(/' · waiting'/)
    expect(CODE).toMatch(/'has not checked in yet'/)
  })

  it('reads the state off the same two values the composer does', () => {
    /**
     * `!openCheckInId && !!nextOpensAt` is exactly what makes the composer print "opens on". Two
     * different derivations of one state is how the two halves of this screen came to disagree in
     * the first place.
     */
    expect(CODE).toMatch(/notOpenYet=\{!openCheckInId && !!nextOpensAt\}/)
  })
})
