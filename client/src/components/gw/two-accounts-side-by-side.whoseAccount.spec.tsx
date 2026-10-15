import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TwoAccountsSideBySide, whoseAccount } from './two-accounts-side-by-side'

/*
 * The check-in page's `report.divergences[].positions[].participantLabel` now carries a name, "you"
 * for the reader, or "a colleague", never a stand-in label (decision 139, item 1). The screen prints
 * what the server sent, starting with a capital.
 */
describe('whose account a difference shows', () => {
  it('prints the name the server put in participantLabel', () => {
    render(<TwoAccountsSideBySide difference={{ topic: 'The price list', positions: [
      { participantLabel: 'Samuel Owino', view: 'The price list went out on Monday.' },
      { participantLabel: 'you', view: 'The price list has not reached the shops.' },
    ] }} />)
    expect(screen.getByText('Samuel Owino')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.queryByText(/Participant [A-Z]/)).toBeNull()
  })

  it('starts the plain words with a capital and keeps a name as given', () => {
    expect(whoseAccount({ participantLabel: 'a colleague' })).toBe('A colleague')
    expect(whoseAccount({ participantLabel: 'Amani Wekesa' })).toBe('Amani Wekesa')
    expect(whoseAccount({ who: 'Brian', participantLabel: 'you' })).toBe('Brian')
    expect(whoseAccount({})).toBe('One account')
  })
})
