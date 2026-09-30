import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'

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
 *
 * U.8 REVIEW: THE PILL'S OWN WORDS CHANGED FROM "NAME · STATUS" TO A FULL SENTENCE, SO THIS NOW
 * RENDERS THE COMPONENT AND READS WHAT IT SAYS, rather than matching the ` · waiting` / `'has not
 * checked in yet'` literals this file used to pin.
 *
 * ROUND 4, ITEM A STEP 2: MOVED FROM `GroundChat`'s Check-in tab TO `WhoIsInThis`, on People and
 * setup. `notOpenYet` used to be derived inside `GroundChat` from its own `openCheckInId`/
 * `nextOpensAt` props; that derivation moved with the roster to `GroundAdminPage.tsx`
 * (`whoIsInThisNotOpenYet`), the page that now owns the check-in's own open/not-open state. The
 * three rules this file exists to hold are unweakened: nothing says "waiting", or any other word
 * for lateness, before the session opens; the tooltip says why; and the same signal is still
 * there, in words, once a session IS open.
 *
 * U.4 PEOPLE-GROUP REVIEW, ITEM 3: A BARE NAME IS NOT A SENTENCE EITHER. Reading this page as Neema
 * (whose next session had not opened), Faraji's chip and the unnamed colleague's chip said only
 * "Faraji Odhiambo" and "A colleague" - nothing at all, where every other reader's page, and every
 * other chip once a session is open, is a full sentence. The first two tests below are updated for
 * the chip's new words ("has nothing to answer until the next session opens", true whether or not they are in yet - still no "waiting", "late" or
 * "has not checked in"), and the tooltip, which used to add a second sentence the chip itself did
 * not say, is now simply the chip's own sentence again (matching the pattern for a done or overdue
 * chip, neither of which had a different tooltip).
 */
function renderRoster(parties: { name: string; done: boolean; isSelf: boolean }[], notOpenYet = false) {
  return render(<WhoIsInThis parties={parties} notOpenYet={notOpenYet} />)
}

describe('the roster between sessions', () => {
  it('drops "waiting" (and any other word for lateness) when the next session has not opened', () => {
    renderRoster([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ], true)
    screen.getByText(/Who is in this/)
    /* A full sentence, said of each of them, that names no lateness - not just their name with
       nothing said about them (U.4 people-group review, item 3: Faraji's and "a colleague"'s chips
       read as bare names, on Neema's own page, with no verb at all). */
    expect(screen.getByText('Ejiro has nothing to answer until the next session opens.')).toBeTruthy()
    expect(screen.getByText('You have nothing to answer until the next session opens.')).toBeTruthy()
    expect(screen.queryByText(/waiting/i)).toBeNull()
    expect(screen.queryByText(/not checked in/i)).toBeNull()
    expect(screen.queryByText(/late/i)).toBeNull()
  })

  it('and the hover text says the same true sentence, not a different one', () => {
    /* Two parties: the roster only renders once there is more than one (a check-in of one is a
       sentence about yourself, not a roster). */
    renderRoster([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ], true)
    screen.getByText(/Who is in this/)
    expect(screen.getByTitle('Ejiro has nothing to answer until the next session opens.')).toBeTruthy()
  })

  it('still says so, in words, when a session IS open', () => {
    /* The signal is worth keeping. It was only ever wrong at rest. */
    renderRoster([
      { name: 'Ejiro', done: false, isSelf: false },
      { name: 'Abubakar', done: true, isSelf: false },
    ], false)
    screen.getByText(/Who is in this/)
    expect(screen.getByText('Ejiro has not checked in yet.')).toBeTruthy()
    expect(screen.getByText('Abubakar has checked in.')).toBeTruthy()
  })

  it('reads the state off the same two values the composer does', () => {
    /**
     * `!openCheckInId && !!nextOpensAt` is exactly what makes the composer print "opens on", and
     * is now GroundAdminPage.tsx's own `whoIsInThisNotOpenYet`, built from the same
     * `myOpenCheckIn`/`myOpenOpensLater` the composer's own props already use. Kept as a source
     * check: it is about which two values feed `notOpenYet`, not about the words on screen.
     */
    const CODE = readFileSync(join(__dirname, '../../pages/grounds/GroundAdminPage.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(CODE).toMatch(/const whoIsInThisNotOpenYet = !myOpenCheckInId && !!myNextOpensAt/)
  })
})
