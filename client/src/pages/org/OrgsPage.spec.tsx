import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrgsPage } from './OrgsPage'
import { authApi } from '@/api/auth'
import { justSignedIn, takeJustSignedIn } from '@/lib/choose-an-organisation'

/**
 * "CHOOSE AN ORGANISATION" (A3, #/orgs), AS THE PERSON READS IT. Wording from orgs.txt. No "3 new"
 * tags: that count waits for U.5's read of what needs you.
 */
vi.mock('@/api/auth', () => ({ authApi: { myOrganizations: vi.fn(), switchOrganization: vi.fn() } }))
const setAuth = vi.fn()
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth, isAuthenticated: true }) }))

const TWO = [
  { id: 'o1', name: 'Baridi Appliances', slug: 'b', role: 'ADMIN', active: true },
  { id: 'o2', name: 'Kilimo Traders’ Association', slug: 'k', role: 'GUEST', active: false },
]

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/orgs']}>
        <Routes>
          <Route path="/orgs" element={<OrgsPage />} />
          <Route path="/grounds" element={<p>Your check-ins</p>} />
          <Route path="/org-new" element={<p>Create page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const assign = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.myOrganizations as any).mockResolvedValue(TWO)
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true })
})

describe('what the person reads', () => {
  it('the heading, the sentence, a row per organisation with its role, and the way to another', async () => {
    open()
    expect(screen.getByRole('heading', { name: 'Choose an organisation' })).toBeTruthy()
    expect(await screen.findByText('You’re in 2. You can switch at any time from the top of the sidebar.')).toBeTruthy()
    const rows = await screen.findAllByRole('button')
    expect(rows.map(r => r.textContent)).toEqual(['BABaridi AppliancesAdmin', 'KTKilimo Traders’ AssociationGuest'])
    /* U.3: it goes to "Where do you work?" now that it exists. */
    expect(screen.getByRole('link', { name: 'Join or create another' })).toHaveAttribute('href', '/welcome')
    expect(screen.queryByText(/new$/)).toBeNull()
  })

  it('in one organisation, says so without promising a sidebar switch', async () => {
    ;(authApi.myOrganizations as any).mockResolvedValue([TWO[0]])
    open()
    expect(await screen.findByText('You’re in one organisation.')).toBeTruthy()
  })
})

describe('choosing', () => {
  it('another organisation switches to it, storing (user, token), and opens its check-ins', async () => {
    ;(authApi.switchOrganization as any).mockResolvedValue({ accessToken: 'tok', user: { id: 'u1' }, organization: { id: 'o2' } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Kilimo/ }))
    await waitFor(() => expect(authApi.switchOrganization).toHaveBeenCalledWith('o2'))
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'tok'))
    expect(assign).toHaveBeenCalledWith('/grounds')
  })

  it('the one you are in opens its check-ins without switching', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Baridi/ }))
    expect(await screen.findByText('Your check-ins')).toBeTruthy()
    expect(authApi.switchOrganization).not.toHaveBeenCalled()
  })
})

describe('being asked once after signing in', () => {
  it('the flag is read once and then gone', () => {
    justSignedIn()
    expect(takeJustSignedIn()).toBe(true)
    expect(takeJustSignedIn()).toBe(false)
  })
})
