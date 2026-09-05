import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OpsLayout } from './OpsLayout'

/**
 * "I AM SUPER ADMIN SO NOT SURE WHY I SEE THIS AND WHY I CAN'T GET OUT OF IT."
 *
 * The refusal said "You are signed in, but you are not set up" — to somebody who
 * knew perfectly well she was set up, because she had connected the account
 * herself an hour earlier. She was on a second account in that browser, and the
 * one fact that would have said so, the address, was the one thing the page did
 * not print.
 *
 * A refusal that will not name who it is refusing leaves the reader arguing with
 * it instead of fixing it. And this one had a single link and no navigation, so
 * arriving on the wrong account meant being stuck on the page.
 */
vi.mock('@/api/ops', () => ({
  opsApi: { me: vi.fn().mockRejectedValue(new Error('403')) },
}))

let account: { email?: string; isPlatformAdmin?: boolean } | undefined
const logout = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: (select: (s: unknown) => unknown) => select({ user: account, logout }),
}))

const renderRefused = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OpsLayout>
          <div>never rendered</div>
        </OpsLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  account = { email: 'hafsah.ops@groundwork.test', isPlatformAdmin: true }
})

describe('being refused the ops system', () => {
  it('names the account it is refusing', async () => {
    renderRefused()
    expect(await screen.findByText(/hafsah\.ops@groundwork\.test/)).toBeInTheDocument()
  })

  it('says what would put them on it, rather than only that they are not', async () => {
    renderRefused()
    expect(await screen.findByText(/Everybody on the platform-admin list is/i)).toBeInTheDocument()
  })

  it('offers the door to somebody who can open it', async () => {
    renderRefused()
    expect(await screen.findByText(/Connect this account to somebody on the team/)).toBeInTheDocument()
  })

  it('offers a way back to the product', async () => {
    renderRefused()
    expect(await screen.findByText(/Back to Groundwork/)).toBeInTheDocument()
  })

  it('offers the fix for the common case: the wrong account', async () => {
    renderRefused()
    expect(await screen.findByText(/Sign in as somebody else/)).toBeInTheDocument()
  })

  it('and still gets out when there is no address to show', async () => {
    account = { isPlatformAdmin: false }
    renderRefused()
    expect(await screen.findByText(/Back to Groundwork/)).toBeInTheDocument()
    /* No door offered to somebody who cannot open it — that would be a link
       straight into a 403. */
    expect(screen.queryByText(/Connect/)).toBeNull()
  })
})
