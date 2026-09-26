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
      'Groundwork' + 'Your email is confirmed' + 'wairimu@baridi.test. You’ll get sign-in links and reports here.' + 'Continue',
    )
    expect(navigated).not.toHaveBeenCalled()
  })

  it('"Continue" goes on to where the page was going', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    open('&next=%2Fgrounds%2Fg-7')
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(navigated).toHaveBeenCalledWith('/grounds/g-7', { replace: true })
  })

  it('and through the password step first when the account has no password', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, needsPassword: true, passwordSetupToken: 'pst' })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(navigated).toHaveBeenCalledWith('/set-password?token=pst&next=%2Fgrounds', { replace: true })
  })

  it('with no address on the response, the sentence starts at "You’ll get" rather than guessing', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user: { ...user, email: undefined }, accessToken: 't', justCreated: true })
    open()
    expect((await screen.findByText(/You’ll get sign-in links/)).textContent).toBe('You’ll get sign-in links and reports here.')
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
