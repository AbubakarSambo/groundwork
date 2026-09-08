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
const CTX = read('..', '..', 'components', 'gw', 'ContextStrength.tsx')

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
    expect(CHAT).toContain('<WhoIsStillOut')
    const WHO = read('..', '..', 'components', 'gw', 'WhoIsStillOut.tsx')
    expect(WHO).toContain('still to answer session')
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
       so it sits with the control that adds people. */
    expect(ADMIN).not.toContain('Billing and seats')
    const band = ADMIN.slice(ADMIN.indexOf('title="Who is in it"'), ADMIN.indexOf('</Fold>', ADMIN.indexOf('title="Who is in it"')))
    expect(band).toContain('Or share an access code instead')
  })

  it('the context read is not a green promise over an amber counter', () => {
    expect(CTX).not.toContain('It will be able to')
    expect(CTX).not.toContain('What would make it stronger')
    expect(CTX).not.toContain('<details>')
    expect(CTX).toContain('What this check-in can tell you')
  })

  it('and a roster does not call three different people "a teammate"', () => {
    /* `participantLabel` withholds the address on purpose - between parties. This is the lead's
       own roster, and they invited these people by typing those addresses. */
    const roster = ADMIN.slice(ADMIN.indexOf('ga-participant-row'), ADMIN.indexOf('ONE ROW PER PERSON') + 1 || undefined)
    expect(roster).toContain('{personLabel(p)}')
  })
})
