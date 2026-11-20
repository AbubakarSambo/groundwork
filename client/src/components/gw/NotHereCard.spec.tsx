import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotHereCard } from './NotHereCard'

/** A card that says what the person cannot have always gives them a way out (Hafsah, 15 November 2026). */
describe('the card with a way out', () => {
  it('says the sentence and always offers "Back to Today"', () => {
    render(<MemoryRouter><NotHereCard title="You’re not in this check-in">Wairimu runs it and can add you.</NotHereCard></MemoryRouter>)
    expect(screen.getByText('Wairimu runs it and can add you.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/today')
  })
  it('keeps what else it offers beside the way out', () => {
    render(<MemoryRouter><NotHereCard title="You’re not in this check-in" more={<a href="/x">Open the whole check-in</a>}>x</NotHereCard></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Open the whole check-in' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to Today' })).toBeTruthy()
  })
})
