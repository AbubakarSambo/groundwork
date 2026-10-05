import { describe, it, expect } from 'vitest'
import { sayWhatTheySaid } from './TheSessionsReport'

/**
 * RELEASE WALKTHROUGH A, FIX 2: THE SAME PERSON, NAMED TWICE.
 *
 * "Where things stand" read "Amani Wekesa said amani Wekesa stated an aim..." and "You said you
 * stated..." because the served `view` already opens with the person's name (or "You"), and the
 * component glued its own "{who} said " in front of it regardless. When the view already carries
 * the name, it is said once, as a plain sentence; otherwise the "{who} said ..." frame is kept.
 */
describe('sayWhatTheySaid', () => {
  it('says the view alone, capitalised, when it already opens with the person\'s name', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'amani Wekesa stated an aim to close more deals.', null))
      .toBe('Amani Wekesa stated an aim to close more deals.')
  })

  it('says the view alone, capitalised, when it already opens with "you"', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'you stated an aim to close more deals.', 'Amani Wekesa'))
      .toBe('You stated an aim to close more deals.')
  })

  it('keeps "{who} said ..." when the view does not open with the person\'s name', () => {
    expect(sayWhatTheySaid('Baraka Mwangi', 'Competitor pricing is the main obstacle.', 'Amani Wekesa'))
      .toBe('Baraka Mwangi said competitor pricing is the main obstacle.')
  })

  it('still says "You" for the reader\'s own row when the view does not open with the name', () => {
    expect(sayWhatTheySaid('Amani Wekesa', 'Competitor pricing is the main obstacle.', 'Amani Wekesa'))
      .toBe('You said competitor pricing is the main obstacle.')
  })
})
