import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { GoogleCallbackPage } from './GoogleCallbackPage'
import { entryApi } from '@/api/entry'

/**
 * SIGNING UP WITH GOOGLE FROM THE ENTRY FLOW, WHERE SIGN-UP IS THE LAST STEP.
 *
 * The entry flow does the whole conversation first and only then asks who you
 * are - so someone choosing Google there already has a finished ground waiting.
 * Google has verified their address, so there is no confirmation email to wait
 * for: the ground is created on the way back.
 *
 * The payload rides in localStorage because the page is replaced by Google's.
 * Nothing is persisted server-side until they have actually signed in, which is
 * the same rule the emailed path follows (see nothing-before-verification).
 *
 * Two failure modes worth pinning:
 *
 *   - The org-name question must NOT interrupt this path, even for a brand-new
 *     account. The setup panel has its own field for it; stopping someone
 *     between "signed in" and "here is your ground" to ask something they have
 *     already been offered is the worst possible moment for it.
 *   - A commit that fails must not strand them on a callback screen. Their
 *     session is still in storage, so the entry flow is where they can carry on.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    googleExchange: vi.fn().mockResolvedValue({ accessToken: 'jwt' }),
    me: vi.fn().mockResolvedValue({ id: 'u1', email: 'k@x.test' }),
    renameOrganization: vi.fn(),
  },
}))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const navigated: string[] = []
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => (to: string) => { navigated.push(to) } }
})

function renderCallback(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/google/callback${query}`]}>
      <Routes><Route path="/auth/google/callback" element={<GoogleCallbackPage />} /></Routes>
    </MemoryRouter>,
  )
}

const pending = JSON.stringify({
  payload: { groundLabel: 'New hire', cadence: 'WEEKLY' },
  history: [{ role: 'user', content: 'A new hire is starting.' }],
})

describe('coming back from Google with a ground already built', () => {
  beforeEach(() => { vi.clearAllMocks(); navigated.length = 0; localStorage.clear() })

  it('creates the ground and lands on it, with no confirmation email in between', async () => {
    localStorage.setItem('gw_entry_pending_commit', pending)
    ;(entryApi.commit as any).mockResolvedValue({ groundId: 'g-77' })

    renderCallback('?code=c1&new=true&nameOrg=true')

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledWith(
      expect.objectContaining({ groundLabel: 'New hire', cadence: 'WEEKLY' }),
    ))
    await waitFor(() => expect(navigated).toContain('/grounds/g-77'))
  })

  it('carries the transcript, not just the settings', async () => {
    localStorage.setItem('gw_entry_pending_commit', pending)
    ;(entryApi.commit as any).mockResolvedValue({ groundId: 'g-77' })

    renderCallback('?code=c1&new=true&nameOrg=false')

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledWith(
      expect.objectContaining({ history: [{ role: 'user', content: 'A new hire is starting.' }] }),
    ))
  })

  it('does not stop to ask about the organisation name on the way through', async () => {
    // nameOrg=true, which on the plain sign-up path opens the question.
    localStorage.setItem('gw_entry_pending_commit', pending)
    ;(entryApi.commit as any).mockResolvedValue({ groundId: 'g-77' })

    const { queryByText } = renderCallback('?code=c1&new=true&nameOrg=true')

    await waitFor(() => expect(navigated).toContain('/grounds/g-77'))
    expect(queryByText(/What should we call your workspace/i)).toBeNull()
  })

  it('clears the pending commit so a reload cannot create a second ground', async () => {
    localStorage.setItem('gw_entry_pending_commit', pending)
    ;(entryApi.commit as any).mockResolvedValue({ groundId: 'g-77' })

    renderCallback('?code=c1&new=true&nameOrg=false')

    await waitFor(() => expect(navigated).toContain('/grounds/g-77'))
    expect(localStorage.getItem('gw_entry_pending_commit')).toBeNull()
  })

  it('sends them back to their session rather than stranding them if the ground fails', async () => {
    localStorage.setItem('gw_entry_pending_commit', pending)
    ;(entryApi.commit as any).mockRejectedValue(new Error('nope'))

    renderCallback('?code=c1&new=true&nameOrg=false')

    await waitFor(() => expect(navigated).toContain('/start'))
  })

  it('leaves the ordinary sign-in path alone when nothing is pending', async () => {
    renderCallback('?code=c1&new=false&nameOrg=false')
    await waitFor(() => expect(navigated).toContain('/'))
    expect(entryApi.commit).not.toHaveBeenCalled()
  })
})
