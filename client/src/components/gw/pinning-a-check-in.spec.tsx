import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { takeItAllWithYou } from '@/lib/what-signing-out-takes-with-it'

/**
 * A1: PINNING A CHECK-IN TO THE TOP OF THE SIDEBAR.
 *
 * Mounted, as a person uses it: pin one, and it moves under "Pinned" above "Check-ins"; come back,
 * and it is still there; unpin it, and it goes back to its place. Pins are this person's own.
 */
const ADAM = { id: 'u-adam', email: 'adam@coamana.test', firstName: 'Adam', lastName: 'Grunewald', role: 'MEMBER', organizationName: 'Coamana' } as any
const KAVON = { ...ADAM, id: 'u-kavon', email: 'kavon@coamana.test', firstName: 'Kavon', lastName: 'Badie' }

const g = (id: string, label: string, extra: object = {}) => ({
  id, label, status: 'AWAITING_PARTIES', initiatorId: 'u-lead',
  participants: [{ id: `p-${id}`, userId: 'u-adam' }, { id: `q-${id}`, userId: 'u-kavon' }], checkIns: [], ...extra,
})
const GROUNDS = [
  g('g1', 'Coamana growth, Q3'),
  g('g2', 'Leadership, Q3'),
  g('g3', 'Supplier review'),
  g('g4', 'Kwame, first 90 days', { status: 'CLOSED', closedAt: new Date(Date.now() - 86_400_000).toISOString() }),
]

function mount(user: any = ADAM) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], GROUNDS)
  qc.setQueryData(['my-organizations'], [])
  const out = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}><AppShell><div>page</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
  const rail = out.container.querySelector('.gw-sidebar-desktop') as HTMLElement
  return { ...out, rail }
}

/** What the sidebar reads, heading by heading, top to bottom. */
function read(rail: HTMLElement): string[] {
  const out: string[] = []
  rail.querySelectorAll('.gw-rl-h, .gw-ci-nm, .gw-rl-empty').forEach(el => out.push(el.classList.contains('gw-rl-h') ? `## ${el.textContent}` : el.textContent ?? ''))
  return out
}

beforeEach(() => window.localStorage.clear())

describe('pinning a check-in', () => {
  it('with nothing pinned there is no "Pinned" part at all', () => {
    const { rail } = mount()
    expect(read(rail)).toEqual(['## Check-ins', 'Coamana growth, Q3', 'Leadership, Q3', 'Supplier review'])
  })

  it('a pinned check-in moves to the top, under "Pinned"', () => {
    const { rail } = mount()
    const pin = within(rail).getByRole('button', { name: 'Pin Supplier review to the top' })
    expect(pin).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pin)
    expect(read(rail)).toEqual(['## Pinned', 'Supplier review', '## Check-ins', 'Coamana growth, Q3', 'Leadership, Q3'])
    expect(within(rail).getByRole('button', { name: 'Unpin Supplier review' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('the newest pin goes to the very top', () => {
    const { rail } = mount()
    fireEvent.click(within(rail).getByRole('button', { name: 'Pin Supplier review to the top' }))
    fireEvent.click(within(rail).getByRole('button', { name: 'Pin Leadership, Q3 to the top' }))
    expect(read(rail).slice(0, 3)).toEqual(['## Pinned', 'Leadership, Q3', 'Supplier review'])
  })

  it('is still pinned on the next visit', () => {
    const first = mount()
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Pin Supplier review to the top' }))
    first.unmount()
    const again = mount()
    expect(read(again.rail).slice(0, 2)).toEqual(['## Pinned', 'Supplier review'])
  })

  it('unpinned, it goes back to its place and "Pinned" disappears', () => {
    const { rail } = mount()
    fireEvent.click(within(rail).getByRole('button', { name: 'Pin Supplier review to the top' }))
    fireEvent.click(within(rail).getByRole('button', { name: 'Unpin Supplier review' }))
    expect(read(rail)).toEqual(['## Check-ins', 'Coamana growth, Q3', 'Leadership, Q3', 'Supplier review'])
  })

  it('pins are the person\'s own: somebody else on the same browser does not see them', () => {
    const first = mount(ADAM)
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Pin Supplier review to the top' }))
    first.unmount()
    const kavon = mount(KAVON)
    expect(read(kavon.rail)[0]).toBe('## Check-ins')
  })

  it('and signing out takes them away, so nothing about one person is left for the next', () => {
    const first = mount()
    fireEvent.click(within(first.rail).getByRole('button', { name: 'Pin Supplier review to the top' }))
    first.unmount()
    takeItAllWithYou()
    expect(read(mount().rail)[0]).toBe('## Check-ins')
  })

  it('a closed check-in is not offered a pin', () => {
    const { rail } = mount()
    fireEvent.click(within(rail).getByRole('button', { name: /Closed \(1\)/ }))
    expect(within(rail).queryByRole('button', { name: /Pin Kwame/ })).toBeNull()
  })

  it('a pin for a check-in the person cannot see any more is never drawn', () => {
    window.localStorage.setItem('gw-pinned-u-adam', JSON.stringify(['g-gone', 'g2']))
    const { rail } = mount()
    expect(read(rail).slice(0, 2)).toEqual(['## Pinned', 'Leadership, Q3'])
  })

  it('with every check-in pinned, the "Check-ins" heading stays and says why it is empty', () => {
    const { rail } = mount()
    for (const n of ['Coamana growth, Q3', 'Leadership, Q3', 'Supplier review']) {
      fireEvent.click(within(rail).getByRole('button', { name: `Pin ${n} to the top` }))
    }
    expect(read(rail)).toEqual([
      '## Pinned', 'Supplier review', 'Leadership, Q3', 'Coamana growth, Q3',
      '## Check-ins', 'All your check-ins are pinned above.',
    ])
    expect(within(rail).getByRole('link', { name: 'Check-ins' })).toHaveAttribute('href', '/grounds')
  })

  it('and with only one check-in, it says that one is pinned', () => {
    useAuthStore.setState({ user: ADAM, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], [GROUNDS[0]])
    qc.setQueryData(['my-organizations'], [])
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>,
    )
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    fireEvent.click(within(rail).getByRole('button', { name: 'Pin Coamana growth, Q3 to the top' }))
    expect(read(rail)).toEqual(['## Pinned', 'Coamana growth, Q3', '## Check-ins', 'Your only check-in is pinned above.'])
  })
})
