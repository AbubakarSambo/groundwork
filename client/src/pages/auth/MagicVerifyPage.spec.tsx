import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'

/**
 * Bug A guard: MagicVerifyPage unconditionally routed every successful
 * verify-email through commitFlow() with no branch for "this user has
 * nothing to commit" - an invited participant or any existing user signing
 * in via a magic link would hit whatever failure commitInner() produced and,
 * for the COMMIT_IN_PROGRESS case (a concurrent commit that claimed the
 * draft and never produced a ground), fall into the generic commitError
 * branch and see the initiator-only "the ground wasn't saved - start
 * again" copy. Nonsensical for someone who was never an initiator.
 *
 * Fix: COMMIT_IN_PROGRESS is now recognized alongside NO_ENTRY_SESSION and
 * routed through the same hadEntryIntent branch - a plain sign-in (redirect,
 * no error UI at all) for someone with no local entry-flow trace, the
 * existing honest "noSession" state for someone who had one.
 */

vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})

function renderPage(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
      <Routes>
        <Route path="/verify-email" element={<MagicVerifyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('MagicVerifyPage - Bug A (wrong-flow routing)', () => {
  it('an invitee/existing user with COMMIT_IN_PROGRESS and no local entry intent lands signed in - no error UI', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u1', email: 'invitee@x.com', role: 'MEMBER', jobTitle: 'Something' } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'COMMIT_IN_PROGRESS' } } })

    renderPage('tok-invitee')

    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith('/grounds', { replace: true }))
    // Never the initiator-only error copy.
    expect(screen.queryByText(/the ground wasn't saved/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/we couldn't find your session/i)).not.toBeInTheDocument()
  })

  it('a genuine initiator (has local entry intent) hitting COMMIT_IN_PROGRESS sees the honest lost-session state, not the wrong-flow error', async () => {
    localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'My ground', history: [{ role: 'user', content: 'hi' }], contributors: [] }))
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u2', email: 'initiator@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'COMMIT_IN_PROGRESS' } } })

    renderPage('tok-initiator-race')

    await waitFor(() => expect(screen.getByText(/we couldn't find your session on this device/i)).toBeInTheDocument())
    expect(screen.queryByText(/the ground wasn't saved/i)).not.toBeInTheDocument()
  })

  it('NO_ENTRY_SESSION still behaves exactly as before (regression guard)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u3', email: 'existing@x.com', role: 'MEMBER', jobTitle: 'Something' } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } })

    renderPage('tok-plain-signin')

    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith('/grounds', { replace: true }))
  })

  it('a real, unrelated commit failure still shows the commitError branch (does not over-widen the fix)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u4', email: 'initiator2@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'Something else broke' } } })

    renderPage('tok-real-failure')

    await waitFor(() => expect(screen.getByText(/the ground wasn't saved/i)).toBeInTheDocument())
  })

  it('a genuine successful commit still works - the real initiator path is not regressed', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u5', email: 'initiator3@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockResolvedValue({
      groundId: 'g1',
      joinToken: null,
      contributors: [],
      failedInvites: [],
    } as any)

    renderPage('tok-success')

    await waitFor(() => expect(screen.getByText(/your ground is set up/i)).toBeInTheDocument())
  })
})
