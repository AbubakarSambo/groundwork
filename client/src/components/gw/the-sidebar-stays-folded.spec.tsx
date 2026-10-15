import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { takeItAllWithYou } from '@/lib/what-signing-out-takes-with-it'

/**
 * A1: FOLDING THE SIDEBAR, REMEMBERED BETWEEN VISITS.
 *
 * Mounted twice, as a person leaving and coming back does: fold it, unmount, mount again, and it is
 * still folded. Open it, come back, and it is open.
 */
const USER = { id: 'u1', email: 'adam@coamana.test', firstName: 'Adam', lastName: 'Grunewald', role: 'MEMBER', organizationName: 'Coamana' } as any

function mount() {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  const out = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}><AppShell><div>page</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
  const rail = out.container.querySelector('.gw-sidebar-desktop') as HTMLElement
  return { ...out, rail }
}

beforeEach(() => window.localStorage.clear())

describe('the folded sidebar is remembered', () => {
  it('starts open for somebody who has never folded it', () => {
    const { rail } = mount()
    expect(within(rail).getByRole('button', { name: 'Fold the sidebar away' })).toHaveAttribute('aria-expanded', 'true')
    expect(rail).toHaveTextContent('Settings, help, sign out')
  })

  it('folded on one visit, it is folded on the next', () => {
    const first = mount()
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Fold the sidebar away' }))
    first.unmount()

    const again = mount()
    const open = within(again.rail).getByRole('button', { name: 'Open the sidebar' })
    expect(open).toHaveAttribute('aria-expanded', 'false')
    expect(again.rail.style.width).toBe('64px')
    expect(document.documentElement.style.getPropertyValue('--gw-sidebar-w')).toBe('64px')
  })

  it('and opened again, it opens next time too', () => {
    const first = mount()
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Fold the sidebar away' }))
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Open the sidebar' }))
    first.unmount()

    const again = mount()
    expect(within(again.rail).getByRole('button', { name: 'Fold the sidebar away' })).toBeInTheDocument()
    expect(again.rail.style.width).toBe('256px')
  })

  it('is forgotten on signing out, so the next person on a shared computer starts with it open', () => {
    const first = mount()
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Fold the sidebar away' }))
    first.unmount()
    takeItAllWithYou()
    const again = mount()
    expect(within(again.rail).getByRole('button', { name: 'Fold the sidebar away' })).toBeInTheDocument()
  })

  it('and a browser that refuses to store it still gets a sidebar, open, that folds', () => {
    const ls = window.localStorage
    const get = ls.getItem.bind(ls), set = ls.setItem.bind(ls)
    ls.getItem = (k: string) => { if (k === 'gw-sidebar-folded') throw new Error('blocked'); return get(k) }
    ls.setItem = (k: string, v: string) => { if (k === 'gw-sidebar-folded') throw new Error('blocked'); set(k, v) }
    try {
      const { rail } = mount()
      fireEvent.click(within(rail).getByRole('button', { name: 'Fold the sidebar away' }))
      expect(within(rail).getByRole('button', { name: 'Open the sidebar' })).toBeInTheDocument()
    } finally {
      ls.getItem = get
      ls.setItem = set
    }
  })
})
