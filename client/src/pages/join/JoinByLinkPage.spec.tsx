import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JoinByLinkPage } from './JoinByLinkPage'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/** AN ORGANISATION'S INVITE LINK (A3, #/j/baridi), AS THE PERSON WHO OPENS IT READS IT. */
function open(preview: any, signedIn = false, google = false) {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: preview } } as any)
  vi.spyOn(authApi, 'methods').mockResolvedValue({ magicLink: true, google })
  useAuthStore.setState({ isAuthenticated: signedIn, user: signedIn ? { id: 'u1' } : null, token: signedIn ? 't' : null } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/j/baridi-7k2p']}>
        <Routes>
          <Route path="/j/:code" element={<JoinByLinkPage />} />
          <Route path="/auth" element={<p>The sign-up</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const OPEN = { open: true, organisationName: 'Baridi Appliances', inviterName: 'Wairimu Kamau' }
const assign = vi.fn()
beforeEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(window, 'location', { value: { ...window.location, assign, host: 'localhost:5173' }, writable: true })
})

describe('the link, for somebody without an account', () => {
  it('reads as the prototype\'s card, without a head count', async () => {
    open(OPEN)
    expect(await screen.findByRole('heading', { name: 'Wairimu Kamau invited you to Baridi Appliances' })).toBeTruthy()
    expect(await screen.findByText('People there use Groundwork for short check-ins on their work. Join with your email.')).toBeTruthy()
    expect(screen.getByText('localhost:5173/j/baridi-7k2p')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Join Baridi Appliances' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'I already have an account' })).toBeTruthy()
    expect(document.body.textContent).toContain('Not from Baridi Appliances? Create your own organisation instead.')
    expect(document.body.textContent).not.toMatch(/\d+ people/)
  })

  it('mentions Google only while Google sign-in is on', async () => {
    open(OPEN, false, true)
    expect(await screen.findByText('People there use Groundwork for short check-ins on their work. Join with your email or Google.')).toBeTruthy()
  })

  it('"Join" goes to make an account first, and comes back', async () => {
    open(OPEN)
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    expect(await screen.findByText('The sign-up')).toBeTruthy()
  })
})

describe('the link, for somebody signed in', () => {
  it('"Join" joins, stores (user, token), and opens its check-ins', async () => {
    open(OPEN, true)
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { accessToken: 'tok', user: { id: 'u1' } } } } as any)
    const setAuth = vi.fn(); useAuthStore.setState({ setAuth } as any)
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/join-links/baridi-7k2p/join'))
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'tok'))
    expect(assign).toHaveBeenCalledWith('/grounds')
    expect(screen.queryByRole('button', { name: 'I already have an account' })).toBeNull()
  })
})

describe('a link that is off', () => {
  it('says so and what to do', async () => {
    open({ open: false })
    expect(await screen.findByRole('heading', { name: 'This invite link is not open any more' })).toBeTruthy()
    expect(screen.getByText('Ask whoever sent it for the new one.')).toBeTruthy()
  })
})
