import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TheyWereNotInvited } from './TheyWereNotInvited'
import { rememberWhoWasNotInvited, whoWasNotInvited } from './who-was-not-invited'

/** What the lead reads, word for word, where she lands after "Send N invitations", and that it goes once she says so. */
beforeEach(() => localStorage.clear())

describe('who was not invited, as the lead reads it', () => {
  it('names each person with the reason, and goes once she has dealt with it', () => {
    rememberWhoWasNotInvited('g1', [
      { email: 'ada@acme.test', because: 'Your plan is full at 10 people.' },
      { email: 'sam@acme.test', because: 'This email is already a participant on this check-in' },
    ])
    render(<TheyWereNotInvited groundId="g1" />)
    expect(screen.getByText('2 people you added were not invited. They are not on this check-in, and nothing has been sent to them.')).toBeTruthy()
    expect(screen.getByText('ada@acme.test, Your plan is full at 10 people.')).toBeTruthy()
    expect(screen.getByText('sam@acme.test, This email is already a participant on this check-in')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'I have dealt with this' }))
    expect(screen.queryByText(/were not invited/)).toBeNull()
    expect(whoWasNotInvited('g1')).toEqual([])
  })

  it('says nothing when everybody was invited', () => {
    const { container } = render(<TheyWereNotInvited groundId="g2" />)
    expect(container.textContent).toBe('')
  })
})
