import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsLayout } from './OpsLayout'
import { whyThisIsNotYours } from './what-you-can-open'
import { opsApi } from '@/api/ops'

/**
 * TWO SILENCES, AND THEY COMPOUND.
 *
 * Thirty-one ops routes were bare `RequireAuth`: the nav was generated from the capability map and
 * the router never consulted it, so anybody with an ops identity who typed an address got the whole
 * page, forms and all, with only the writes refusing.
 *
 * And they refused invisibly. Every ops call suppresses its own toast, and React Query leaves
 * `data` undefined on an error exactly as while pending — so `OpsTable` rendered "Working it out…"
 * and kept rendering it. A person could sit in front of a page that would never load and never be
 * told anything at all.
 */
vi.mock('@/api/ops', () => ({ opsApi: { me: vi.fn(), assistantPanel: vi.fn(), groundworkEvents: vi.fn() } }))
vi.mock('./TheAssistantAsACustomerSeesIt', () => ({ TheAssistantAsACustomerSeesIt: () => null }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { email: 'sam@groundwork.test', isPlatformAdmin: false }, logout: vi.fn() }),
}))

function show(path: string, capabilities: string[]) {
  ;(opsApi.me as any).mockResolvedValue({ displayName: 'Sam', capabilities })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <OpsLayout><div>the page itself</div></OpsLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

describe('the capability map the nav uses now guards the routes too', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses a page you do not hold, and names what it needs', async () => {
    show('/ops/attribution', ['sales:read'])
    await screen.findByText(/not yours to open/i)
    expect(screen.getByText(/commercial:approve/)).toBeTruthy()
    expect(screen.queryByText('the page itself')).toBeNull()
  })

  it('and says it is a setting rather than anything about the person', async () => {
    show('/ops/attribution', ['sales:read'])
    await screen.findByText(/how your grants are set/i)
  })

  it('opens a page you do hold', async () => {
    show('/ops/attribution', ['commercial:approve'])
    await screen.findByText('the page itself')
  })

  it('opens the pages everybody on the team holds', async () => {
    show('/ops/commitments', [])
    await screen.findByText('the page itself')
  })

  it('shows nothing rather than an empty back office while it is finding out', () => {
    ;(opsApi.me as any).mockReturnValue(new Promise(() => {}))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/ops']}>
          <OpsLayout><div>the page itself</div></OpsLayout>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    /* Not the nav drawn as if you hold nothing, and not the page rendered against permissions
       nobody has checked. */
    expect(screen.getByText(/Opening the back office/i)).toBeTruthy()
    expect(screen.queryByText('the page itself')).toBeNull()
  })
})

describe('a page that did not load says so', () => {
  beforeEach(() => vi.clearAllMocks())

  it('names it, and offers to try again', async () => {
    const client = show('/ops', [])
    await screen.findByText('the page itself')

    /* A page's own query failing — the 403 or 500 that used to render as a permanent
       "Working it out…". */
    await client.fetchQuery({ queryKey: ['ops', 'pipeline'], queryFn: async () => { throw new Error('403') } })
      .catch(() => undefined)

    await waitFor(() => expect(screen.getByText(/did not load/i)).toBeTruthy())
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
  })

  it('says nothing when nothing failed', async () => {
    show('/ops', [])
    await screen.findByText('the page itself')
    expect(screen.queryByText(/did not load/i)).toBeNull()
  })
})

describe('the rule itself', () => {
  it('decides a nested path by the longest match, not by /ops', () => {
    /* `/ops/companies/:key` has to be decided by `/ops/companies`, which needs a capability, and
       not by `/ops`, which everybody holds. */
    expect(whyThisIsNotYours('/ops/companies/acme', [])).not.toBeNull()
    expect(whyThisIsNotYours('/ops', [])).toBeNull()
  })

  it('holds a company page the way the pipeline is held', () => {
    /* Reached by clicking a company name, so it is not in the menu — which is not the same as
       being open to everybody. */
    expect(whyThisIsNotYours('/ops/companies/acme', ['sales:read'])).toBeNull()
    expect(whyThisIsNotYours('/ops/companies/acme', [])).not.toBeNull()
  })

  it('refuses a path the map has never heard of', () => {
    /* A guard that waves through what it does not recognise stops working the moment somebody
       adds a route. */
    expect(whyThisIsNotYours('/ops/made-up', ['sales:read'])).not.toBeNull()
  })
})
