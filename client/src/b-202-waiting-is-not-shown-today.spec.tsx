import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * B-202. An outsider added to a check-in, who sets a password (or signs in later) before an admin
 * lets them in, used to land on Today ("You have no check-ins yet. When someone adds you to one,
 * you will see it here.") or the check-ins list - told nothing is stopping them, when something
 * is. They should land on "Almost in" (/join/waiting, A3-organisations-and-joining/join-waiting.txt)
 * until an admin lets them in. `/users/me/waiting` is the same read `WaitingForAnAdminPage` already
 * makes of its own membership.
 *
 * Checked in `RequireOrgSetup` (App.tsx), not only where `HomeOrChooseAnOrganisation` lands (the
 * root and `/grounds`): the first version of this fix lived there, and a DIRECT visit to `/today` -
 * which is also how the root and `/grounds` themselves resolve once there is nothing left to
 * decide - skipped it entirely, reproduced live by navigating straight to `/today` after being
 * added as an outsider. `RequireOrgSetup` wraps every one of the eleven protected routes, so this
 * tests it directly, the way every one of those routes actually uses it.
 */
const waiting = vi.hoisted(() => ({ value: { waiting: false } as any }))
vi.mock('@/pages/grounds/GroundsListPage', () => ({ GroundsListPage: () => <p>The check-ins list</p> }))
vi.mock('@/components/gw/your-organisations', async (orig) => ({
  ...(await orig<any>()),
  useYourOrganisations: () => ({ myOrgs: [{ id: 'o1', name: 'Baridi', role: 'MEMBER', active: true }], loaded: true }),
}))
vi.mock('@/api/auth', async (orig) => {
  const real = await orig<any>()
  return {
    ...real,
    authApi: {
      ...real.authApi,
      whereCanIJoin: vi.fn(async () => ({ byDomain: [] })),
      myWaiting: vi.fn(async () => waiting.value),
    },
  }
})
import { HomeOrChooseAnOrganisation, RequireOrgSetup } from './App'
import { useAuthStore } from '@/stores/auth'
import { justSignedIn } from '@/lib/choose-an-organisation'

function at(path: string, home?: 'today' | 'list') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<RequireOrgSetup><HomeOrChooseAnOrganisation home={home} /></RequireOrgSetup>} />
          <Route path="/grounds" element={<RequireOrgSetup><HomeOrChooseAnOrganisation home={home} /></RequireOrgSetup>} />
          <Route path="/today" element={<RequireOrgSetup><p>Today</p></RequireOrgSetup>} />
          <Route path="/join/waiting" element={<p>Almost in</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  waiting.value = { waiting: false }
  useAuthStore.setState({
    user: { id: 'u1', firstName: 'Taji', email: 'taji@elsewhere.test', role: 'MEMBER' } as any,
    token: 't', isAuthenticated: true,
  })
})

afterEach(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
})

const WAITING = { waiting: true, organisationName: 'Baridi Appliances', askedAt: new Date().toISOString(), admin: null, inviterFirstName: null, canRemindFrom: new Date().toISOString() }

describe('B-202: somebody still waiting to be let in is sent to Almost in, not Today or the list', () => {
  it('right after setting a password (the root, justIn), waiting lands on Almost in, not Today', async () => {
    waiting.value = WAITING
    justSignedIn()
    at('/', 'today')
    expect(await screen.findByText('Almost in')).toBeTruthy()
    expect(screen.queryByText('Today')).toBeNull()
  })

  it('signing in later (not justIn) also lands on Almost in, not Today', async () => {
    waiting.value = WAITING
    at('/', 'today')
    expect(await screen.findByText('Almost in')).toBeTruthy()
  })

  it('opening the check-ins list while waiting also lands on Almost in, not the list', async () => {
    waiting.value = WAITING
    at('/grounds')
    expect(await screen.findByText('Almost in')).toBeTruthy()
    expect(screen.queryByText('The check-ins list')).toBeNull()
  })

  it('a direct visit to /today - a bookmark, an old link - also lands on Almost in, not Today', async () => {
    waiting.value = WAITING
    at('/today')
    expect(await screen.findByText('Almost in')).toBeTruthy()
    expect(screen.queryByText('Today')).toBeNull()
  })

  it('somebody not waiting still lands on Today as before', async () => {
    at('/', 'today')
    expect(await screen.findByText('Today')).toBeTruthy()
  })

  it('somebody not waiting can still open /today directly as before', async () => {
    at('/today')
    expect(await screen.findByText('Today')).toBeTruthy()
  })
})
