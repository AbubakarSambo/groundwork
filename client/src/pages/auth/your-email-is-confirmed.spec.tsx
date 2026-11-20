import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  /* A new account with nothing to commit: the server answers NO_ENTRY_SESSION. */
  vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } })
})

/*
 * CHANGED IN BATCH 2, GROUP 6 (staging check S14; Hafsah's fixed rule, no pages in between): "Your email is confirmed" with
 * "Continue" was a page of its own after the link. It is gone: the link signs the person in and they land where they were going,
 * with no password step either. The rules about where that is are kept.
 */
describe('when the link has just created the account', () => {
  it('goes straight on, with no "Your email is confirmed" page and no Continue', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    open()
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/grounds', { replace: true }))
    expect(screen.queryByText('Your email is confirmed')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
  })

  it('goes on to where the page was going', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    open('&next=%2Fgrounds%2Fg-7')
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/grounds/g-7', { replace: true }))
  })

  it('goes back to the invite link they came from, which the server kept (U.3 review)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, next: '/j/coamana-6rr7' } as any)
    open()
    await waitFor(() => expect(navigated).toHaveBeenCalledWith('/j/coamana-6rr7', { replace: true }))
    expect(entryApi.commit).not.toHaveBeenCalled()
  })

  it('an outside address handed back is never followed (U.3 review)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true, next: '//evil.test/x' } as any)
    open()
    await waitFor(() => expect(navigated).toHaveBeenCalled())
    expect(navigated).not.toHaveBeenCalledWith('//evil.test/x', expect.anything())
  })

  it('never by way of "Choose a password", even with no password stored', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    open()
    await waitFor(() => expect(navigated).toHaveBeenCalled())
    expect(navigated).not.toHaveBeenCalledWith(expect.stringContaining('/set-password'), expect.anything())
  })

  it('a failure is said, never passed over', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'Your plan is full.' } } })
    open()
    expect(await screen.findByText('Your plan is full.')).toBeTruthy()
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
