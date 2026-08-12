import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChoosePasswordPage } from './ChoosePasswordPage'
import { authApi } from '@/api/auth'

/**
 * WHERE THE PASSWORD PAGE SENDS PEOPLE NEXT.
 *
 * The lead invite email says "review the ground I set up for you". Setting the
 * password then dropped the lead on the whole grounds list, because `next` was
 * read by this page and passed by nobody. `grounds.service.ts` now sends
 * `next=/grounds/{id}`.
 *
 * The same query parameter is the reason for the second half of this file. It
 * comes off a URL, so anyone can put anything in it, and this page is one we
 * email to people who are about to type a password.
 */

vi.mock('@/api/auth', () => ({ authApi: { setPassword: vi.fn(), resetPassword: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})

async function setPasswordWith(next: string) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
    <MemoryRouter initialEntries={[`/set-password?token=tok123${next ? `&next=${encodeURIComponent(next)}` : ''}`]}>
      <Routes>
        <Route path="/set-password" element={<ChoosePasswordPage />} />
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  )
  const [pw, confirm] = screen.getAllByPlaceholderText(/characters|Same as above/i)
  fireEvent.change(pw, { target: { value: 'Passw0rdish' } })
  fireEvent.change(confirm, { target: { value: 'Passw0rdish' } })
  fireEvent.click(screen.getByRole('button', { name: /Set password/i }))
  await waitFor(() => expect(mockedNavigate).toHaveBeenCalled())
  return mockedNavigate.mock.calls[0][0]
}

beforeEach(() => {
  // Cleared, not just reset: the reset-side tests assert that `setPassword` was NOT
  // called, and calls from the set-side tests above leak into that without this.
  vi.clearAllMocks()
  mockedNavigate.mockReset()
  ;(authApi.setPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
})

describe('the lead lands on the ground they were invited to', () => {
  it('follows next when it is a path in this app', async () => {
    expect(await setPasswordWith('/grounds/g-123')).toBe('/grounds/g-123')
  })

  it('and still has a sensible default when nothing asked for one', async () => {
    expect(await setPasswordWith('')).toBe('/grounds?welcome=1')
  })
})

describe('next cannot send anybody off the product', () => {
  it('ignores an absolute URL', async () => {
    expect(await setPasswordWith('https://evil.example/steal')).toBe('/grounds?welcome=1')
  })

  it('ignores a protocol-relative one, which is the easy miss', async () => {
    // "//evil.example" starts with a slash. A naive startsWith('/') check passes
    // it, and the browser treats it as another origin.
    expect(await setPasswordWith('//evil.example')).toBe('/grounds?welcome=1')
  })
})

/**
 * THE RESET SIDE, WHICH IS WHY THE TWO PAGES BECAME ONE. W8-49.
 *
 * `/reset-password` was a second copy of this page with the same fields and the same
 * rules, and it had drifted. Three things it got wrong, all fixed by there only being
 * one page now, and all pinned here so a second copy cannot bring them back.
 */
describe('resetting a password', () => {
  async function renderReset(token = 'tok123') {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/reset-password${token ? `?token=${token}` : ''}`]}>
          <Routes><Route path="/reset-password" element={<ChoosePasswordPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  async function submitReset() {
    fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: 'Passw0rdish' } })
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'Passw0rdish' } })
    fireEvent.click(screen.getByRole('button', { name: /Reset password/i }))
  }

  it('calls the reset endpoint, not the set-a-first-password one', async () => {
    // The token is only valid at its own endpoint, so getting this wrong on one of
    // the two routes would make that link permanently broken.
    ;(authApi.resetPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
    await renderReset()
    await submitReset()
    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith('tok123', 'Passw0rdish'))
    expect(authApi.setPassword).not.toHaveBeenCalled()
  })

  it('does not claim it emailed them anything - they just chose a password', async () => {
    /**
     * BUG 1. It rendered "Check your inbox. We've sent a reset link to your email"
     * after somebody submitted a NEW PASSWORD. Nothing had been sent. That message
     * belonged to the step before, on a different page.
     */
    ;(authApi.resetPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
    await renderReset()
    await submitReset()
    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalled())
    expect(screen.queryByText(/Check your inbox/i)).toBeNull()
    expect(screen.queryByText(/sent a reset link/i)).toBeNull()
  })

  it('and a failure is shown, not hidden behind a success screen', async () => {
    /**
     * BUG 2, the serious one. The success screen was set on submit, BEFORE the
     * request came back, so an expired token told the person to go and check their
     * email while the real error rendered on a screen they had left. The same shape
     * as the sign-up flow's `onError: () => setLinkSent(true)`.
     */
    ;(authApi.resetPassword as any).mockRejectedValue({ response: { data: { message: 'This link has expired.' } } })
    await renderReset()
    await submitReset()
    await waitFor(() => expect(screen.getByText('This link has expired.')).toBeTruthy())
    expect(screen.queryByText(/Check your inbox/i)).toBeNull()
    // And they can try again from here, rather than being stranded.
    expect(screen.getByRole('button', { name: /Reset password/i })).toBeTruthy()
  })

  it('with no token it says so instead of offering a form that cannot work', async () => {
    // BUG 3. `/set-password` had already learned this; the reset copy had not.
    await renderReset('')
    expect(screen.getByText(/missing its token/i)).toBeTruthy()
    expect(screen.queryByLabelText(/New password/i)).toBeNull()
  })
})
