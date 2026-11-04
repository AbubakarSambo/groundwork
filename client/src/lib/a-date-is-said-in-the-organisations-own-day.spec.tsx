import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth'
import { useWhoTheServerSaysYouAre } from './who-the-server-says-you-are'
import { whenItWas, theZoneDatesAreIn } from './a-date-reads-the-same-everywhere'

/**
 * A DATE IS SAID IN THE ORGANISATION'S OWN DAY (B-094; browser test, 20 October 2026). Njeri's fee notes check-in in Muchemi & Co
 * (Nairobi) opens at midnight on Monday 26 October. Read in a browser in Lagos, Today said "Coming up: Sunday" and the board "Session 3
 * opens on 25 October", beside sentences from the engine counted in Nairobi. The screens now say the organisation's day.
 */
describe('a date is said in the organisation’s own day', () => {
  it('Monday 26 October at midnight in Nairobi reads as Monday, wherever the browser is', () => {
    useAuthStore.setState({ user: { id: 'u-njeri', organizationTimeZone: 'Africa/Nairobi' } as any, isAuthenticated: false } as any)
    renderHook(() => useWhoTheServerSaysYouAre())
    expect(theZoneDatesAreIn()).toBe('Africa/Nairobi')
    expect(whenItWas('2026-10-25T21:00:00.000Z', 'weekdayAndDay')).toBe('Monday 26 October')
  })
})
