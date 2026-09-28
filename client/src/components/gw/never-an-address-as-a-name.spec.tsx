import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatToProbeThemOn } from './WhatToProbeThemOn'
import { neverAnAddressAsAName } from './an-address-that-can-receive-mail'

/**
 * FIX 6/56: NEVER AN EMAIL ADDRESS AS A NAME ON A SCREEN THIS SESSION OWNS.
 *
 * Engine request 56 walked a real check-in where the session report's own count left Zawadi out of
 * who is counted, but "What to ask each person" still named her by her email address -
 * "Start with zawadi.u8@example.test." That is the server's read to fix (requested); this is the
 * screen's own rule, so that whatever the server sends, a person's row never prints an address
 * where a name belongs.
 */
describe('neverAnAddressAsAName', () => {
  it('keeps a real name as it is written', () => {
    expect(neverAnAddressAsAName('Zawadi Njoroge')).toBe('Zawadi Njoroge')
  })

  it('replaces an email address with a plain, neutral word', () => {
    expect(neverAnAddressAsAName('zawadi.u8@example.test')).toBe('a colleague')
  })
})

describe('"What to ask each person" never shows an address where a name belongs', () => {
  it('replaces an email address in the per-person heading', () => {
    render(<WhatToProbeThemOn reads={[{
      who: 'zawadi.u8@example.test', participantId: 'p-zawadi',
      probe: ['Ask what is holding up the delivery.'], encourage: [], triedToUnblock: 'Nothing yet.',
    }]} />)
    expect(screen.getByText('a colleague')).toBeTruthy()
    expect(screen.queryByText('zawadi.u8@example.test')).toBeNull()
  })
})
