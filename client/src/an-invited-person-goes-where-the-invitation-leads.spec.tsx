import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * AN INVITED PERSON GOES WHERE THE INVITATION LEADS (U.4 review). After setting their password they
 * were sent to "Where do you work?", offered another organisation by their email domain, instead of
 * the organisation that invited them and that they already belong to. "Where do you work?" is only
 * for somebody who belongs nowhere yet; the server says which (nowhereYet).
 */
vi.mock('@/pages/grounds/GroundsListPage', () => ({ GroundsListPage: () => <p>The check-ins list</p> }))
vi.mock('@/components/gw/your-organisations', async (orig) => ({
  ...(await orig<any>()),
  useYourOrganisations: () => ({ myOrgs: [{ id: 'coamana', name: 'Coamana', role: 'MEMBER', active: true }], loaded: true }),
}))
const answer = vi.hoisted(() => ({ value: {} as any }))
vi.mock('@/api/auth', async (orig) => {
  const real = await orig<any>()
  return {
    ...real,
    authApi: {
      ...real.authApi,
      whereCanIJoin: vi.fn(async () => answer.value),
      /* B-202's own check, run at this same choke point: nobody here is waiting to be let in. */
      myWaiting: vi.fn(async () => ({ waiting: false })),
    },
  }
})
import { HomeOrChooseAnOrganisation } from './App'
import { justSignedIn } from '@/lib/choose-an-organisation'

function signIn() {
  justSignedIn()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomeOrChooseAnOrganisation home="today" />} />
          <Route path="/today" element={<p>Today at Coamana</p>} />
          <Route path="/welcome" element={<p>Where do you work?</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => { window.sessionStorage.clear() })

describe('right after setting a password', () => {
  it('somebody invited to Coamana lands in Coamana, even when their domain could join another', async () => {
    answer.value = { nowhereYet: false, byDomain: [{ id: 'baridi', name: 'Baridi', domain: 'example.test' }], asAGuest: [] }
    signIn()
    expect(await screen.findByText('Today at Coamana')).toBeTruthy()
    expect(screen.queryByText('Where do you work?')).toBeNull()
  })

  it('somebody who belongs nowhere yet is still offered the organisation for their domain', async () => {
    answer.value = { nowhereYet: true, byDomain: [{ id: 'baridi', name: 'Baridi', domain: 'baridi.co.ke' }], asAGuest: [] }
    signIn()
    expect(await screen.findByText('Where do you work?')).toBeTruthy()
  })
})
