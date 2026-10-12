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
 * draft and never produced a check-in), fall into the generic commitError
 * branch and see the initiator-only "the check-in wasn't saved - start
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
    expect(screen.queryByText(/the check-in wasn't saved/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/we couldn't find your session/i)).not.toBeInTheDocument()
  })

  /* Re-pinned under fix plan D11: a save still running is "still being saved", never the lost-session
     screen, which offers to start over and discard a draft that is intact on the server. */
  it('a genuine initiator (has local entry intent) hitting COMMIT_IN_PROGRESS sees that the save is still running, not the lost-session state', async () => {
    localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'My ground', history: [{ role: 'user', content: 'hi' }], contributors: [] }))
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u2', email: 'initiator@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'COMMIT_IN_PROGRESS' } } })

    renderPage('tok-initiator-race')

    await waitFor(() => expect(screen.getByText(/your check-in is still being saved/i)).toBeInTheDocument())
    expect(screen.queryByText(/we couldn't find your session on this device/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/the check-in wasn't saved/i)).not.toBeInTheDocument()
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

  /* Journey of 12 October: a new admin opening the sign-up email link logged a 400 on POST /entry/commit.
     With nothing saved in this browser the page now asks the server to save only if it holds a draft. */
  it('a new admin with nothing saved in this browser asks only if there is a draft, and lands on their check-ins', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u6', email: 'new-admin@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockResolvedValue({ nothing: true } as any)

    renderPage('tok-new-admin')

    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith('/grounds', { replace: true }))
    expect(entryApi.commit).toHaveBeenCalledWith(expect.anything(), { ifThereIsOne: true })
    expect(screen.queryByText(/the check-in wasn.t saved/i)).not.toBeInTheDocument()
  })

  it('somebody with a check-in saved in this browser commits it as before, never only-if-there-is-one', async () => {
    localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'My ground', history: [{ role: 'user', content: 'hi' }], contributors: [] }))
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u7', email: 'initiator4@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockResolvedValue({ groundId: 'g2', joinToken: null, contributors: [], failedInvites: [] } as any)

    renderPage('tok-initiator-saved')

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    expect(vi.mocked(entryApi.commit).mock.calls[0]).toHaveLength(1)
  })

  it('a real, unrelated commit failure still shows the commitError branch (does not over-widen the fix)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u4', email: 'initiator2@x.com', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockRejectedValue({ response: { data: { message: 'Something else broke' } } })

    renderPage('tok-real-failure')

    /* Group 3, piece 1: the rebuilt page's heading uses the house style's typographic apostrophe
       ("wasn’t"), the same as every other rebuilt screen's wording, not the straight one this
       regex used to pin. */
    await waitFor(() => expect(screen.getByText(/the check-in wasn.t saved/i)).toBeInTheDocument())
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

    await waitFor(() => expect(screen.getByText(/your check-in is set up/i)).toBeInTheDocument())
  })

  /*
   * SCREEN FAULT 6(c) (live walk, 6 October 2026): "NAME (EMAIL)" ON THE INVITED LIST, WHEN A NAME
   * WAS GIVEN. The server's own answer carries only each contributor's email; the name typed for
   * them at the people step travelled in the COMMIT PAYLOAD instead (`displayName`, request 166),
   * read back here by email the same way `shownAs` does on the entry page itself.
   */
  it('reads "Name (email)" on the invited list, when a name was given at the people step', async () => {
    localStorage.setItem('gw_commit_payload', JSON.stringify({
      groundLabel: 'Help my team understand',
      history: [{ role: 'user', content: 'hi' }],
      contributors: [{ email: 'musa@anchor.test', displayName: 'Musa Bello' }, { email: 'noname@anchor.test' }],
    }))
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      user: { id: 'u6', email: 'lead@x.test', role: 'ADMIN', jobTitle: null } as any,
      accessToken: 'tok',
    })
    vi.mocked(entryApi.commit).mockResolvedValue({
      groundId: 'g1',
      joinToken: null,
      contributors: [{ email: 'musa@anchor.test' }, { email: 'noname@anchor.test' }],
      failedInvites: [],
    } as any)

    renderPage('tok-named-invite')

    await waitFor(() => expect(screen.getByText(/your check-in is set up/i)).toBeInTheDocument())
    expect(screen.getByText('Musa Bello (musa@anchor.test)')).toBeInTheDocument()
    expect(screen.getByText('noname@anchor.test')).toBeInTheDocument()
    expect(screen.queryByText('musa@anchor.test', { exact: true })).not.toBeInTheDocument()
  })
})
