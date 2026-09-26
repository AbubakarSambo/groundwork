import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { GoogleCallbackPage } from './GoogleCallbackPage'
import { authApi } from '@/api/auth'

/**
 * ASK WHAT THE WORKSPACE IS CALLED - BUT ONLY WHEN WE INVENTED IT, AND NEVER
 * INSIST.
 *
 * A new Google user got an organisation named "<FirstName>'s Workspace" with no
 * chance to say otherwise, and that name goes on every page their whole team
 * sees. So it is asked for now.
 *
 * Two things it must not do:
 *
 *   - Ask someone who already belongs to an organisation. A person invited to a
 *     ground, signing in with Google, belongs to the org that invited them.
 *     Presenting them with "what should we call your workspace?" would be
 *     asking them to name someone else's company on their way into a check-in
 *     they were added to.
 *   - Hold anybody up. A default already exists, so skipping costs nothing and
 *     the way past is always one click.
 *
 * The server decides which case this is (`nameOrg` in the callback URL); this
 * page only honours it.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    googleExchange: vi.fn().mockResolvedValue({ accessToken: 'jwt' }),
    me: vi.fn().mockResolvedValue({ id: 'u1', email: 'k@x.test' }),
    renameOrganization: vi.fn().mockResolvedValue({ id: 'o1', name: 'Meridian' }),
  },
}))
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

describe('naming the workspace after a Google sign-up', () => {
  beforeEach(() => { vi.clearAllMocks(); navigated.length = 0 })

  /* U.3: the question moved to "Create an organisation" (#/org-new), which names the organisation the
     server made rather than making a second one. Saving and skipping are tested there
     (pages/org/OrgNewPage.spec.tsx). */
  it('sends them to name it when the server made an organisation for them', async () => {
    renderCallback('?code=c1&new=true&nameOrg=true')
    await waitFor(() => expect(navigated).toContain('/org-new?naming=1'))
    expect(authApi.renameOrganization).not.toHaveBeenCalled()
  })

  it('never asks someone who was invited into an existing organisation', async () => {
    // THE ONE THAT MATTERS: nameOrg=false, so straight through.
    renderCallback('?code=c1&new=true&nameOrg=false')
    await waitFor(() => expect(navigated).toContain('/start'))
    expect(navigated).not.toContain('/org-new?naming=1')
  })

  it('never asks a returning user', async () => {
    renderCallback('?code=c1&new=false&nameOrg=false')
    await waitFor(() => expect(navigated).toContain('/'))
    expect(navigated).not.toContain('/org-new?naming=1')
  })
})
