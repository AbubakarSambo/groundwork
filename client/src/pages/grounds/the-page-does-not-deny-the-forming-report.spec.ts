import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PAGE TOLD A LEAD THE PRODUCT CANNOT DO THE THING THE PRODUCT DOES.
 *
 * "We should have a forming report, why do you have this here, we address this a million times:
 * '2 participants have not yet checked in. The shared report generates once all accounts are in.'"
 *
 * The synthesis runs as soon as ANYBODY checks in - the report forms progressively and is only
 * RELEASED once everyone is through. So the sentence was false, and it was the only thing on the
 * screen where a lead waits, denying the feature that exists for exactly that wait. It also
 * repeated a count the header two lines above already carries.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const read = (...p: string[]) => strip(readFileSync(join(__dirname, ...p), 'utf8'))

const ADMIN = read('GroundAdminPage.tsx')
const PARTY = read('..', '..', 'components', 'gw', 'MyParticipation.tsx')

describe('waiting for the others', () => {
  it('never says the report waits for everybody', () => {
    expect(ADMIN).not.toContain('generates once all accounts are in')
  })

  it('says what is actually true, and offers the way to it', () => {
    expect(ADMIN).toContain('The picture builds as each person answers')
    expect(ADMIN).toContain('Read it so far')
  })

  it('and the lead can see who is still out from the end of their own session', () => {
    const CHAT = read('..', 'chat', 'ChatPage.tsx')
    /* Changed in batch 2 (group 5): the end of a session is the conversation and one pop-up, so who is still out is read on the
       board's team rows, with the way to ask them (BoardPage), and WhoIsStillOut stays on the check-in page itself. */
    expect(read('..', 'board', 'BoardPage.tsx')).toContain('theCountSays=')
    expect(CHAT).not.toContain('<WhoIsStillOut')
    const WHO = read('..', '..', 'components', 'gw', 'WhoIsStillOut.tsx')
    /* U.8 REVIEW: "n people still to answer session N" (a count next to the word "session") became
       a sentence naming who ("Baraka and Neema still have to answer."). What this test guards - that
       the lead can see who is still out - is unweakened: it still names whoever has not answered. */
    expect(WHO).toMatch(/still (has|have) to answer/)
    expect(WHO).toContain('Remind')
  })
})

describe('the things that were said too often, or too loudly', () => {
  it('the privacy reminder is not repeated on a person\'s own standing', () => {
    expect(PARTY).not.toContain('Privacy reminder')
    expect(PARTY).not.toContain('never visible to the other party')
  })

  it('codes and billing are not setup questions', () => {
    /* Billing is the organisation's and has its own door; an access code is how somebody gets in,
       so it sits with the control that adds people. Repointed (People and setup rebuild, 29 Sept):
       "Who's in it" is now WhosInItRoster.tsx, rendered inside CheckInPeopleAndSetup.tsx's own
       "Who's in it" heading - not a `<Fold title="Who is in it">` band on GroundAdminPage.tsx. */
    expect(ADMIN).not.toContain('Billing and seats')
    const ROSTER = read('..', '..', 'components', 'gw', 'WhosInItRoster.tsx')
    expect(ROSTER).not.toContain('Billing and seats')
    expect(ROSTER).toContain('Or share an access code instead')
  })

  it('the context read is gone entirely, which is the end of that thread', () => {
    /*
     * This asserted the read had been rewritten - no green "It will be able to" over an amber
     * "What would make it stronger (5)". It was rewritten twice, and then removed: "this has to
     * go". A panel that has to keep being justified is a panel nobody asked for.
     *
     * What it listed is still asked for, by the conversation that can now take it. The one thing
     * it exported that had to survive is the promise to a participant that the lead may hold
     * context they cannot read - that is `the-lead-holds-more.ts`, guarded on its own.
     */
    const PAGE = read('..', '..', 'components', 'gw', 'ContextPage.tsx')
    expect(PAGE).not.toContain('<ContextStrength')
    expect(PAGE).not.toContain('It will be able to')
    expect(PAGE).toContain('LEAD_HOLDS_MORE')
  })

  it('and a roster does not call three different people "a teammate"', () => {
    /* `participantLabel` withholds the address on purpose - between parties. This is the lead's
       own roster, and they invited these people by typing those addresses. */
    const roster = ADMIN.slice(ADMIN.indexOf('ga-participant-row'), ADMIN.indexOf('ONE ROW PER PERSON') + 1 || undefined)
    expect(roster).toContain('{personLabel(p)}')
  })
})
