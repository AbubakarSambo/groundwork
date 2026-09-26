import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * "SEND IT AGAIN" SENDS IT THE SAME WAY THE FIRST LINK WAS SENT.
 *
 * The resend used to call `/auth/register-magic-link` whatever sent the first link. That route
 * creates accounts:
 *
 *  - for an address that already has an account it answers 409, so every resend of a sign-in link
 *    read "That link did not send";
 *  - for somebody still signing up it rewrote the waiting sign-up, so the name and organisation
 *    they had typed were replaced by a name guessed from the address, and nothing.
 *
 * These tests press the button a person presses and check what was sent, and what they read.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    requestMagicLink: vi.fn(),
    methods: vi.fn(),
  },
}))
vi.mock('@/api/billing', () => ({ billingApi: { whatIsWaitingFor: vi.fn().mockRejectedValue(new Error('none')) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/sent" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Waits out the pause before the resend button appears, then presses it. */
async function pressSendAgain() {
  for (let i = 0; i < 70; i++) await act(async () => { vi.advanceTimersByTime(1000) })
  fireEvent.click(await screen.findByRole('button', { name: /send it again|send another link/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
  ;(authApi.entrySave as any).mockResolvedValue({ message: 'Check your email for your sign-in link.', email: 'x' })
  ;((authApi as any).requestMagicLink).mockRejectedValue({ response: { status: 409 } })
})
afterEach(() => { vi.useRealTimers() })

describe('an address that already has an account', () => {
  it('a sign-in link sent from /auth/sent is sent again as a sign-in link, and does not fail', async () => {
    renderAt('/auth/sent?email=wairimu%40baridi.test')
    await screen.findByText('Check your email')
    await pressSendAgain()

    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(1))
    expect(authApi.entrySave).toHaveBeenCalledWith('wairimu@baridi.test', undefined, '')
    expect((authApi as any).requestMagicLink).not.toHaveBeenCalled()
    expect(screen.queryByText(/did not send/i)).toBeNull()
  })
})

describe('a sign-up still waiting for its link to be opened', () => {
  it('the second link carries the name and organisation the person typed, exactly as the first did', async () => {
    renderAt('/auth?mode=signup')
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Wairimu' } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'Wairimu@Baridi.test' } })
    fireEvent.change(screen.getByLabelText(/Your organisation/), { target: { value: 'Baridi Appliances' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await screen.findByText('Check your email')

    const first = (authApi.entrySave as any).mock.calls[0]
    expect(first[0]).toBe('wairimu@baridi.test')
    expect(first[1]).toEqual({ payload: { firstName: 'Wairimu', orgName: 'Baridi Appliances' } })

    await pressSendAgain()
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(2))
    /* The same address, name and organisation. A password chosen at sign-up is not sent again: the
       server keeps the one it holds when a request carries none (U.2). */
    expect((authApi.entrySave as any).mock.calls[1].slice(0, 3)).toEqual(first.slice(0, 3))
    expect((authApi.entrySave as any).mock.calls[1][3]).toBeUndefined()
    expect((authApi as any).requestMagicLink).not.toHaveBeenCalled()
    expect(screen.queryByText(/did not send/i)).toBeNull()
  })

  it('a resend that really fails still says so', async () => {
    renderAt('/auth/sent?email=wairimu%40baridi.test')
    await screen.findByText('Check your email')
    ;(authApi.entrySave as any).mockRejectedValueOnce({ response: { status: 500 } })
    await pressSendAgain()
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})

describe('a password-reset link', () => {
  it('is sent again through forgot-password, never through a sign-up route', async () => {
    ;(authApi.forgotPassword as any).mockResolvedValue({ message: 'ok' })
    renderAt('/auth')
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    await screen.findByText('Check your email')
    await pressSendAgain()
    await waitFor(() => expect(authApi.forgotPassword).toHaveBeenCalledTimes(2))
    expect((authApi.forgotPassword as any).mock.calls[1]).toEqual(['wairimu@baridi.test'])
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })
})
