import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from './NotFoundPage'
import { useAuthStore } from '@/stores/auth'

/**
 * THE NOT-FOUND PAGE (F4, #/nowhere, nowhere.txt): "Nothing is at this address" / "It may have
 * moved, or the link was mistyped." For someone signed in, the one button is the prototype's own
 * "Go to Today", to the real Today page. A signed-out visitor has no prototype picture for this
 * address, so the button keeps going to the anonymous entry chat (/start), under its own true
 * label rather than the prototype's "Go to Today", which would send them nowhere they can go.
 */
describe('the not-found page', () => {
  it('says the prototype’s words, as a lead signed in reads it, with the way to Today', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' } as any, token: 't' } as any)
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Nothing is at this address' })).toBeTruthy()
    expect(screen.getByText('It may have moved, or the link was mistyped.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Go to Today' })
    expect(link).toHaveAttribute('href', '/today')
  })

  it('sends a signed-out visitor to start a check-in instead, since there is nowhere else they can go', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any)
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Nothing is at this address' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Start a check-in' })
    expect(link).toHaveAttribute('href', '/start')
  })
})
