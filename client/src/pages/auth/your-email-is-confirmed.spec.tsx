import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

/**
 * "YOUR EMAIL IS CONFIRMED" (A2, #/verify-email), as the person whose link has just created their
 * account reads it, and where "Continue" takes them.
 */

vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([{ id: 'g1' }]) } }))

const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

/* Each test opens its own token: the page remembers what happened to a token for as long as the
   module lives, so that a remount cannot verify the same link twice. */
let n = 0
function open(query = '') {
  n += 1
  return render(
    <MemoryRouter initialEntries={[`/verify-email?token=confirm-${n}${query}`]}>
      <Routes><Route path="/verify-email" element={<MagicVerifyPage />} /></Routes>
    </MemoryRouter>,
  )
}

const user = { id: 'u1', email: 'wairimu@baridi.test', role: 'ADMIN', jobTitle: null } as any
const readable = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  /* A new account with nothing to commit: the server answers NO_ENTRY_SESSION. */
  vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } })
})

describe('when the link has just created the account', () => {
  it('says so, with the address, before going anywhere', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    const { container } = open()
    await screen.findByRole('heading', { name: 'Your email is confirmed' })
    expect(readable(container)).toBe(
      /* U.2 review: one sentence, not an address and a sentence joined by a full stop. */
      'Groundwork' + 'Your email is confirmed' + 'We’ll send sign-in links and reports to wairimu@baridi.test.' + 'Continue',
    )
    expect(navigated).not.toHaveBeenCalled()
  })

  it('"Continue" goes on to where the page was going', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    open('&next=%2Fgrounds%2Fg-7')
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(navigated).toHaveBeenCalledWith('/grounds/g-7', { replace: true })
  })

  it('"Continue" goes back to the invite link they came from, which the server kept (U.3 review)', async () => {
    /* The emailed link is /verify-email?token=… with no next. The place comes back with the answer. */
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, next: '/j/coamana-6rr7' } as any)
    open()
    await screen.findByRole('heading', { name: 'Your email is confirmed' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(navigated).toHaveBeenCalledWith('/j/coamana-6rr7', { replace: true })
    expect(entryApi.commit).not.toHaveBeenCalled()
  })

  it('an outside address handed back is never followed (U.3 review)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, next: '//evil.test/x' } as any)
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(navigated).not.toHaveBeenCalledWith('//evil.test/x', expect.anything())
  })

  it('and through the password step first when the account has no password', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, needsPassword: true, passwordSetupToken: 'pst' })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(navigated).toHaveBeenCalledWith('/set-password?token=pst&next=%2Fgrounds', { replace: true })
  })

  it('with no address on the response, it says "this address" rather than guessing', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user: { ...user, email: undefined }, accessToken: 't', justCreated: true })
    open()
    expect((await screen.findByText(/sign-in links and reports/)).textContent).toBe('We’ll send sign-in links and reports to this address.')
  })

  it('is never shown in front of a failure', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'Your plan is full.' } } })
    open()
    expect(await screen.findByText('Your plan is full.')).toBeTruthy()
    expect(screen.queryByText('Your email is confirmed')).toBeNull()
  })
})

describe('without justCreated, which the server does not send yet', () => {
  it('nothing changes: the page goes straight on, as it always has', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't' })
    open()
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/grounds', { replace: true }))
    expect(screen.queryByText('Your email is confirmed')).toBeNull()
  })
})

describe('while the link is being checked', () => {
  it('says "Confirming your email…" when no check-in is being made', async () => {
    vi.mocked(authApi.verifyEmail).mockReturnValue(new Promise(() => {}) as any)
    open()
    expect(await screen.findByText('Confirming your email…')).toBeTruthy()
    expect(screen.queryByText('Setting up your check-in…')).toBeNull()
  })

  it('and "Setting up your check-in…" only when a check-in described before sign-up is waiting', async () => {
    localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'Q3' }))
    vi.mocked(authApi.verifyEmail).mockReturnValue(new Promise(() => {}) as any)
    open()
    expect(await screen.findByText('Setting up your check-in…')).toBeTruthy()
  })
})
