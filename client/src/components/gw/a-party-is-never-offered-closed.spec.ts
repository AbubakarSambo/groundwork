import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * THE SERVER REFUSES IT; THE PAGE MUST NOT ASK.
 *
 * CLOSED hands a document to whoever runs the check-in. Sitting at the end of a list that reads
 * "Everyone, Only me, ..." it looks like a third and stronger degree of privacy, so a party who
 * picked it would be giving their file away believing they had locked it down harder. The API
 * refuses them, which makes it safe - not clear. A control that offers a choice and then rejects it
 * is worse than one that never offered.
 *
 * Read off the file rather than rendered, because what matters is that the option cannot be
 * produced for a party at all, in any state the component can reach.
 */
const SRC = readFileSync(path.join(__dirname, 'ContextPage.tsx'), 'utf8')

describe('a party is never offered CLOSED', () => {
  it('offers it inside the lead branch and nowhere else', () => {
    const offers = [...SRC.matchAll(/<option value="CLOSED"/g)]
    expect(offers).toHaveLength(1)

    /* The one offer must sit after `isLead ?` and before that conditional's `) : (`. */
    const gate = SRC.indexOf('(isLead ? (')
    const partyBranch = SRC.indexOf(') : (', gate)
    expect(gate).toBeGreaterThan(-1)
    expect(partyBranch).toBeGreaterThan(gate)
    expect(offers[0].index!).toBeGreaterThan(gate)
    expect(offers[0].index!).toBeLessThan(partyBranch)
  })

  it('and the party control still names only the two answers that are theirs', () => {
    const gate = SRC.indexOf('(isLead ? (')
    const party = SRC.slice(SRC.indexOf(') : (', gate))
    const end = party.indexOf('))}')
    expect(end).toBeGreaterThan(-1)
    expect(party.slice(0, end)).not.toMatch(/CLOSED'/)
  })
})
