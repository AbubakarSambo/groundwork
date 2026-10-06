import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THREE THINGS ON THE SESSIONS TAB THAT WERE NOT ABOUT SESSIONS.
 *
 * "The sessions page is still a mess. For instance the alignment feed should be in the reports and
 * board, not here; add a person should be in setup, and so should the broadcast link and QR code."
 *
 * All three, and each for its own reason:
 *
 * THE ALIGNMENT FEED is convergences and divergences accumulating across a run, which is the
 * board's subject. It sat above the session grid, competing with it.
 *
 * ADD A PERSON was on this tab AND on Setup - one queue with two entrances, which is the pattern
 * this codebase has already been burned by twice: somebody who has been through one entrance
 * cannot tell whether the other holds something they have not seen.
 *
 * THE BROADCAST LINK AND QR sat under the session grid. They answer the same question the access
 * code and add-a-person answer - how does somebody get into this check-in - so all three are in
 * Setup band 1 together.
 *
 * AND ONE THING THAT WAS NOT A LAYOUT CHANGE. `signals` are pattern observations about the people
 * in a check-in, and they were on the LEAD's tab. The board is read by everybody on the check-in,
 * so moving them there unguarded would have widened who reads them - a privacy change wearing a
 * layout change's clothes. The board renders them only for whoever runs the check-in.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const ADMIN = strip(readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8'))
const BOARD = strip(readFileSync(join(__dirname, '..', 'board', 'BoardPage.tsx'), 'utf8'))

/* Source order is chat, myrecord, checkins, docs, report, settings - so the tab AFTER sessions is
   the documents one, not My record. Sliced to the wrong end this returned an empty string and the
   three "no longer contains" assertions passed on nothing. */
const SESSIONS_TAB = ADMIN.slice(ADMIN.indexOf("{tab === 'checkins' && ("), ADMIN.indexOf("{tab === 'docs' && ("))
const SETUP_TAB = ADMIN.slice(ADMIN.indexOf("{tab === 'settings' && ("), ADMIN.indexOf('{shareCodeModalOpen && ('))

describe('the sessions tab', () => {
  it('reads the real slices, so an empty one cannot pass', () => {
    expect(SESSIONS_TAB.length).toBeGreaterThan(2000)
    expect(SETUP_TAB.length).toBeGreaterThan(2000)
  })

  it('no longer carries the alignment feed', () => {
    expect(SESSIONS_TAB).not.toContain('Alignment feed')
  })

  it('no longer carries a second entrance to adding a person', () => {
    expect(SESSIONS_TAB).not.toContain('Add a person')
  })

  it('and no longer carries the broadcast link', () => {
    expect(SESSIONS_TAB).not.toContain('<ShareSection')
  })

  it('but keeps the closing control, worded with the plain word "check-in"', () => {
    /*
     * WORDING UPDATED (group 3's review, request batch A, fault 6): "session" is internal jargon
     * on a button a lead presses; the product calls the thing a person answers a "check-in"
     * everywhere else on this screen ("Start a new check-in"). This does not reopen the settled
     * "session" vs "round" naming (one-word-and-it-is-session.spec.ts) - that is a different axis.
     */
    expect(SESSIONS_TAB).toContain('Begin the last check-in')
  })
})

describe('where they went', () => {
  it('the ways in are together, in "Who\'s in it"', () => {
    /*
     * REPOINTED (People and setup rebuild, 29 Sept): Setup's numbered "band 1" is gone with the
     * rest of that accordion (see setup-asks-one-question-at-a-time.spec.ts); the add-person form,
     * the access code and the link/QR share are together now in WhosInItRoster.tsx, which
     * CheckInPeopleAndSetup.tsx renders under its own "Who's in it" heading.
     */
    const ROSTER = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8'))
    expect(ROSTER).toContain('Add a person to this check-in')
    expect(ROSTER).toContain('Or share an access code instead')
    expect(ROSTER).toContain('<ShareSection')
  })

  it('and the alignment feed is on the board, for whoever runs the check-in only', () => {
    expect(BOARD).toContain('Alignment feed')
    expect(BOARD).toContain('viewerRunsThisCheckIn &&')
    /* Read off the check-in, because the board's payload is the same for everybody by design. */
    expect(BOARD).toContain('initiatorId === user.id')
  })

  it('and it reads the signals from the check-in, never from the board payload', () => {
    /* `(data as any).signals` would be undefined - the board does not carry them - so the feed
       would silently never render, which is how a moved feature quietly becomes a deleted one. */
    expect(BOARD).not.toMatch(/\(data as any\)\?\.signals/)
    expect(BOARD).toContain('(groundForSignals as any)?.signals')
  })
})
