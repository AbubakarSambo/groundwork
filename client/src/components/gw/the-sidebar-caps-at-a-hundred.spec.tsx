import { describe, it, expect, beforeEach } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { rememberOpened } from './recently-opened-check-ins'

/**
 * HAFSAH'S FAULT 4: THE SIDEBAR LISTED EVERY CHECK-IN, UNUSABLE AT A HUNDRED.
 *
 * Driven against a hundred check-ins (and about thirty people, in the fixture): the sidebar used
 * to render one row per check-in, a wall nobody could scan or use. Fixed in AppShell.tsx: past
 * `SIDEBAR_CAP`, it shows only the ones that need this person now, then whichever of the rest were
 * opened most recently on this device, then "All check-ins" as the way to the whole list.
 *
 * Below the cap (the common case, tested elsewhere in pinning-a-check-in.spec.tsx and
 * the-rail-is-where-it-belongs.spec.tsx), nothing here changes: the sidebar still shows every
 * unpinned check-in, in the rail's own order.
 */
const LEAD = { id: 'u-lead', email: 'lead@coamana.test', firstName: 'Rukia', lastName: 'Otieno', role: 'MEMBER', organizationName: 'Coamana' } as any

/** A hundred check-ins: two that need the lead now, the rest quiet - a large organisation's rail. */
function aHundredGrounds(waiting: number[] = [2, 5]) {
  const grounds: any[] = []
  for (let i = 0; i < 100; i++) {
    const needsYou = waiting.includes(i)
    grounds.push({
      id: `g${i}`,
      label: `Check-in ${i}`,
      status: 'ACTIVE',
      initiatorId: 'u-lead',
      participants: [{ id: `p${i}`, userId: 'u-lead' }],
      checkIns: needsYou
        ? [{ participantId: `p${i}`, sessionNumber: 1, status: 'PENDING', availableFrom: new Date(Date.now() - 86_400_000).toISOString() }]
        : [],
    })
  }
  return grounds
}

function mount(grounds: any[]) {
  useAuthStore.setState({ user: LEAD, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['grounds'], grounds)
  qc.setQueryData(['my-organizations'], [])
  const out = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}><AppShell><div>page</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
  const rail = out.container.querySelector('.gw-sidebar-desktop') as HTMLElement
  return { ...out, rail }
}

function rowNames(rail: HTMLElement): string[] {
  return [...rail.querySelectorAll('.gw-ci-nm')].map(el => el.textContent ?? '')
}

beforeEach(() => window.localStorage.clear())

describe('the sidebar at a hundred check-ins', () => {
  it('shows far fewer rows than there are check-ins', () => {
    const { rail } = mount(aHundredGrounds())
    expect(rowNames(rail).length).toBeLessThanOrEqual(8)
  })

  it('shows the ones that need the lead first', () => {
    const { rail } = mount(aHundredGrounds())
    const names = rowNames(rail)
    expect(names).toContain('Check-in 2')
    expect(names).toContain('Check-in 5')
  })

  it('fills the rest of the room with recently opened check-ins', () => {
    rememberOpened('u-lead', 'g40')
    rememberOpened('u-lead', 'g41')
    const { rail } = mount(aHundredGrounds())
    const names = rowNames(rail)
    expect(names).toContain('Check-in 40')
    expect(names).toContain('Check-in 41')
    // The one opened most recently (g41) sits ahead of the one opened before it (g40), once the
    // two "needs you" rows are accounted for.
    expect(names.indexOf('Check-in 41')).toBeLessThan(names.indexOf('Check-in 40'))
  })

  it('caps the ones that need the lead too: twenty waiting on a busy lead is still eight rows', () => {
    /* The live walk with the hundred-check-in organisation: Kofi has twenty waiting on him, and the
       "needs you" rows were not capped, so he got twenty rows. */
    const twenty = Array.from({ length: 20 }, (_, i) => i * 3)
    const { rail } = mount(aHundredGrounds(twenty))
    expect(rowNames(rail).length).toBe(8)
    expect(within(rail).getByRole('link', { name: /All check-ins \(100\)/ })).toBeInTheDocument()
  })

  it('offers "All check-ins" with the full count, as the way to the rest', () => {
    const { rail } = mount(aHundredGrounds())
    const link = within(rail).getByRole('link', { name: /All check-ins \(100\)/ })
    expect(link).toHaveAttribute('href', '/grounds')
  })

  it('still works when this person\'s "recently opened" storage throws: it falls back to just what needs them now', () => {
    // Only the key this feature reads throws - a private window or blocked site data can refuse
    // one key and not another - so this isolates recentlyOpenedFor's own try/catch rather than
    // also tripping over unrelated localStorage reads elsewhere in the shell (the feedback
    // button's remembered position, among others).
    const real = window.localStorage.getItem
    window.localStorage.getItem = (key: string) => {
      if (key.startsWith('gw-recent-')) throw new Error('blocked')
      return real.call(window.localStorage, key)
    }
    try {
      const { rail } = mount(aHundredGrounds())
      const names = rowNames(rail)
      expect(names).toContain('Check-in 2')
      expect(names).toContain('Check-in 5')
      expect(names.length).toBeLessThanOrEqual(8)
    } finally {
      window.localStorage.getItem = real
    }
  })

  it('never lists a check-in this person cannot open: only the ids the server sent come back as rows', () => {
    rememberOpened('u-lead', 'g-not-mine-any-more')
    const { rail } = mount(aHundredGrounds())
    expect(rowNames(rail)).not.toContain(undefined)
    expect(within(rail).queryByText('g-not-mine-any-more')).toBeNull()
  })

  it('below the cap, nothing changes: every unpinned check-in still shows, needed or not', () => {
    // i=10..13: none of these need the lead (only i=2 and i=5 do), so the rail's stable sort
    // leaves them in their given order.
    const few = aHundredGrounds().slice(10, 14)
    const { rail } = mount(few)
    expect(rowNames(rail)).toEqual(['Check-in 10', 'Check-in 11', 'Check-in 12', 'Check-in 13'])
    expect(within(rail).getByRole('link', { name: 'All check-ins' })).toHaveAttribute('href', '/grounds')
  })

  it('always offers "All check-ins", even with no rows at all: an admin with nothing waiting and nothing opened (Hafsah, 6 October)', () => {
    const notHers = aHundredGrounds([]).map(g => ({ ...g, initiatorId: 'u-someone', participants: [{ id: `x-${g.id}`, userId: 'u-someone' }] }))
    const { rail } = mount(notHers)
    expect(rowNames(rail)).toHaveLength(0)
    expect(within(rail).getByRole('link', { name: /All check-ins \(100\)/ })).toHaveAttribute('href', '/grounds')
  })

  it('and when every open check-in is pinned or none is open', () => {
    const { rail } = mount([])
    expect(within(rail).getByRole('link', { name: 'All check-ins' })).toHaveAttribute('href', '/grounds')
  })
})
