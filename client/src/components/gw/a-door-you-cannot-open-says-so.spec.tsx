import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ADoorYouCannotOpen } from './a-door-you-cannot-open-says-so'

/** WHAT A LEAD OR A MEMBER READS AT PEOPLE (U.4 review). The server refuses them too. */
describe('the People page, to somebody who is not an admin', () => {
  it('says only an admin can open it, and why, without calling their role a setting', () => {
    const { container } = render(<MemoryRouter><ADoorYouCannotOpen may={false} what="open People"><p>People</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Only an admin can open People.' })).toBeTruthy()
    expect(screen.getByText('Your role here is not an admin’s. An admin can change it.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back to your check-ins' })).toBeTruthy()
    expect(container.textContent).not.toMatch(/You cannot add people|not anything about you/)
    expect(screen.queryByText('People')).toBeNull()
  })
  it('an admin goes straight through', () => {
    render(<MemoryRouter><ADoorYouCannotOpen may what="open People"><p>People</p></ADoorYouCannotOpen></MemoryRouter>)
    expect(screen.getByText('People')).toBeTruthy()
  })
})
