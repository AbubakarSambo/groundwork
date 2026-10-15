import { describe, it, expect } from 'vitest'
import { youAreFromOutside } from './WaitingForAnAdminPage'

/**
 * "ALMOST IN" SAYS THE REASON THE SERVER GIVES (journey test, 12 October).
 *
 * Pia, on Brightloom's own address and invited by Lena, read "You're from outside Brightloom d2tbx, so an
 * admin there has to let you in." The server already wrote the true sentence for her (B-096), and this page
 * threw it away and built the outsider sentence itself. Fails without the fix: the first case read the
 * outsider sentence.
 */
const base = { organisationName: 'Brightloom d2tbx', admin: { name: 'Ada Obi', firstName: 'Ada' }, heldForASeat: false }

describe('Almost in reads the server’s sentence', () => {
  it('a person on the organisation’s own address is not called an outsider', () => {
    const says = 'Lena invited you. Ada Obi, an admin, has to add you to Brightloom d2tbx first.'
    expect(youAreFromOutside({ ...base, says })).toBe(says)
    expect(youAreFromOutside({ ...base, says })).not.toMatch(/from outside/)
  })

  it('a person from another domain still reads the prototype’s sentence', () => {
    const says = 'You’re from outside Brightloom d2tbx, so an admin there has to let you in. We’ve asked Ada Obi.'
    expect(youAreFromOutside({ ...base, says })).toBe(says)
  })

  it('an older server with no sentence still gets the prototype’s words', () => {
    expect(youAreFromOutside(base)).toBe('You’re from outside Brightloom d2tbx, so an admin there has to let you in. We’ve asked Ada Obi.')
  })
})
