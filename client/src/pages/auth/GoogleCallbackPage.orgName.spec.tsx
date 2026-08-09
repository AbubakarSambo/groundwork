import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
 *     asking them to name someone else's company on their way into a ground
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

  it('asks when the server made an organisation for them', async () => {
    renderCallback('?code=c1&new=true&nameOrg=true')
    expect(await screen.findByText(/What should we call your workspace/i)).toBeTruthy()
    // Nothing has moved on yet - they are being asked, not redirected past it.
    expect(navigated).toHaveLength(0)
  })

  it('saves the name they give and carries on', async () => {
    renderCallback('?code=c1&new=true&nameOrg=true')
    const box = await screen.findByPlaceholderText(/team or company name/i)
    fireEvent.change(box, { target: { value: 'Meridian Health' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => expect(authApi.renameOrganization).toHaveBeenCalledWith('Meridian Health'))
    await waitFor(() => expect(navigated).toContain('/start'))
  })

  it('lets them skip without saving anything', async () => {
    renderCallback('?code=c1&new=true&nameOrg=true')
    fireEvent.click(await screen.findByRole('button', { name: /Skip for now/i }))

    await waitFor(() => expect(navigated).toContain('/start'))
    expect(authApi.renameOrganization).not.toHaveBeenCalled()
  })

  it('never asks someone who was invited into an existing organisation', async () => {
    // THE ONE THAT MATTERS: nameOrg=false, so straight through.
    renderCallback('?code=c1&new=true&nameOrg=false')
    await waitFor(() => expect(navigated).toContain('/start'))
    expect(screen.queryByText(/What should we call your workspace/i)).toBeNull()
  })

  it('never asks a returning user', async () => {
    renderCallback('?code=c1&new=false&nameOrg=false')
    await waitFor(() => expect(navigated).toContain('/'))
    expect(screen.queryByText(/What should we call your workspace/i)).toBeNull()
  })
})
