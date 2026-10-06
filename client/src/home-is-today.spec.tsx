import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * HOME IS TODAY (C1, U.5), AS IN THE PROTOTYPE. Signed in, the root opens Today, and so does the
 * first page after signing in, unless an organisation is offered first. The check-ins list keeps its
 * own address, and opening it on purpose opens it.
 */
vi.mock('@/pages/grounds/GroundsListPage', () => ({ GroundsListPage: () => <p>The check-ins list</p> }))
vi.mock('@/components/gw/your-organisations', async (orig) => ({
  ...(await orig<any>()),
  useYourOrganisations: () => ({ myOrgs: [{ id: 'o1', name: 'Baridi', role: 'MEMBER', active: true }], loaded: true }),
}))
vi.mock('@/api/auth', async (orig) => {
  const real = await orig<any>()
  return { ...real, authApi: { ...real.authApi, whereCanIJoin: vi.fn(async () => ({ byDomain: [] })) } }
})
import { HomeOrChooseAnOrganisation } from './App'
import { justSignedIn } from '@/lib/choose-an-organisation'

function at(path: string, home?: 'today' | 'list') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomeOrChooseAnOrganisation home={home} />} />
          <Route path="/grounds" element={<HomeOrChooseAnOrganisation home={home} />} />
          <Route path="/today" element={<p>Today</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { window.sessionStorage.clear() })

describe('where a signed-in person lands', () => {
  it('the root opens Today', async () => {
    at('/', 'today')
    expect(await screen.findByText('Today')).toBeTruthy()
  })

  it('right after signing in, the first page is Today, even though sign-in sent them to the list', async () => {
    justSignedIn()
    at('/grounds')
    expect(await screen.findByText('Today')).toBeTruthy()
  })

  it('the check-ins list, opened on purpose, is the check-ins list', async () => {
    at('/grounds')
    expect(await screen.findByText('The check-ins list')).toBeTruthy()
  })
})
