import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LinkDidNotWork, LinkExpired } from './LinkExpired'

/**
 * B-130. The deep page audit found /verify-email, /set-password and /reset-password, when the
 * link did not work, offered only "Send me a new link" - a dead end for somebody who already has
 * a password and just wants to sign in. The invite and join pages already offer "Sign in instead"
 * in the same situation; these pages did not.
 */
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), forgotPassword: vi.fn() } }))

function renderIt(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-130: a broken link offers a way to sign in, not only a new link', () => {
  it('"That link didn’t work" (verify-email, set-password, reset-password) offers Sign in instead', () => {
    renderIt(<LinkDidNotWork kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
  })

  it('"That link has expired" offers Sign in instead too', () => {
    renderIt(<LinkExpired kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
  })
})
