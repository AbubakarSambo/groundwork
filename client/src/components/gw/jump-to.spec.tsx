import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useJumpStore } from '@/stores/jump'
import { whatYouCanJumpTo, matching } from './what-you-can-jump-to'
import { todayApi } from '@/api/today'

/**
 * A1: "JUMP TO…  CTRL K", as a person uses it, and only ever offering what they can already see.
 */
const GROUNDS = [
  {
    id: 'g1', label: 'Coamana growth, Q3 paying customers', status: 'AWAITING_PARTIES', initiatorId: 'u-lead', checkIns: [],
    participants: [
      { id: 'p1', userId: 'u-adam', user: { firstName: 'Adam', lastName: 'Grunewald' }, email: null },
      { id: 'p2', userId: 'u-kavon', user: { firstName: 'Kavon', lastName: 'Badie' }, email: null },
      /* Invited, no name yet, and the address hidden from peers: never offered, never named from an address. */
      { id: 'p3', userId: null, user: null, email: 'nate@coamana.test' },
    ],
  },
  { id: 'g2', label: 'Leadership, Q3', status: 'AWAITING_PARTIES', initiatorId: 'u-x', checkIns: [], participants: [{ id: 'p4', userId: 'u-adam', user: { firstName: 'Adam', lastName: 'Grunewald' } }] },
]
const ADAM = { id: 'u-adam', email: 'adam@coamana.test', firstName: 'Adam', lastName: 'Grunewald', role: 'MEMBER', organizationName: 'Coamana' }
const SAHAR = { ...ADAM, id: 'u-sahar', firstName: 'Sahar', lastName: 'Ali', role: 'ADMIN' }

function Where() { return <div data-testid="where">{useLocation().pathname}</div> }

function mount(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['grounds'], GROUNDS)
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}>
        <AppShell><Routes><Route path="*" element={<Where />} /></Routes></AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const ctrlK = () => act(() => { fireEvent.keyDown(document, { key: 'k', ctrlKey: true }) })
const options = () => screen.queryAllByRole('option').map(o => o.textContent)

/**
 * `AppShell` also fires a `['today']` query (`todayApi.get`) while mounted, unrelated to "Jump to"
 * but never mocked here - with the local API running, that was a real network call for a fake
 * token, landing on the real 401 handler and calling `logout()` asynchronously mid-test (see the
 * long comment in the-sidebar-waits-for-the-list.spec.tsx, which is where this was first found).
 * Mocked here too, so nothing in this file reaches the real network either.
 */
beforeEach(() => {
  useJumpStore.setState({ open: false })
  window.localStorage.clear()
  vi.spyOn(todayApi, 'get').mockResolvedValue({ needs: [], count: 0, line: null, comingUp: [] } as any)
})

describe('what "Jump to" may offer', () => {
  it('check-ins from the reader\'s own list, the named people in them but not the reader, and their own doors', () => {
    const items = whatYouCanJumpTo(GROUNDS as any, 'u-adam', [{ label: 'All check-ins', to: '/grounds' }, { label: 'Settings', to: '/settings' }])
    expect(items.map(i => [i.kind, i.label, i.detail ?? '', i.to])).toEqual([
      ['checkin', 'Coamana growth, Q3 paying customers', '', '/grounds/g1'],
      ['checkin', 'Leadership, Q3', '', '/grounds/g2'],
      ['person', 'Kavon Badie', 'In Coamana growth, Q3 paying customers', '/grounds/g1'],
      ['page', 'All check-ins', '', '/grounds'],
      ['page', 'Your settings', '', '/settings'],
    ])
  })

  it('nobody is named from an address', () => {
    const items = whatYouCanJumpTo(GROUNDS as any, 'u-adam', [])
    expect(items.some(i => /nate/i.test(i.label))).toBe(false)
  })

  it('people are found by typing, not listed before anything is typed', () => {
    const items = whatYouCanJumpTo(GROUNDS as any, 'u-adam', [])
    expect(matching(items, '').some(i => i.kind === 'person')).toBe(false)
    expect(matching(items, 'kav').map(i => i.label)).toEqual(['Kavon Badie'])
  })
})

describe('"Jump to" in the sidebar, as a participant uses it', () => {
  it('the sidebar says "Jump to…" and "Ctrl K"', () => {
    const { container } = mount(ADAM)
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    const button = within(rail).getByRole('button', { name: /Jump to/ })
    expect(button).toHaveTextContent('Jump to…')
    expect(button).toHaveTextContent('Ctrl K')
  })

  it('Ctrl K opens it on the check-ins and pages; typing narrows; arrows and Enter go there', async () => {
    mount(ADAM)
    ctrlK()
    const box = screen.getByRole('combobox', { name: 'Jump to a check-in, a person or a page' })
    await waitFor(() => expect(box).toHaveFocus())
    /* U.5: Today is a page now, so "Jump to" offers it, first of the pages as in the sidebar.
       U.12: You too, after Today, as in the sidebar. U.15: and Company, between the two. */
    expect(options()).toEqual(['Coamana growth, Q3 paying customers', 'Leadership, Q3', 'Today', 'Company', 'You', 'All check-ins', 'Your settings'])
    fireEvent.change(box, { target: { value: 'q3' } })
    expect(options()).toEqual(['Coamana growth, Q3 paying customers', 'Leadership, Q3', 'Kavon BadieIn Coamana growth, Q3 paying customers'])
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('where')).toHaveTextContent('/grounds/g2')
  })

  it('Cmd K works too, and Esc closes it', () => {
    mount(ADAM)
    act(() => { fireEvent.keyDown(document, { key: 'K', metaKey: true }) })
    const box = screen.getByRole('combobox')
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('says so plainly when nothing matches', () => {
    mount(ADAM)
    ctrlK()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } })
    expect(screen.getByRole('dialog')).toHaveTextContent('Nothing matches that. Try part of a name.')
  })

  it('a participant is never offered the organisation\'s admin pages', () => {
    mount(ADAM)
    ctrlK()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'people' } })
    expect(options()).toEqual([])
  })
})

describe('"Jump to" as an admin uses it', () => {
  it('offers the organisation\'s pages the sidebar gives an admin', () => {
    mount(SAHAR)
    ctrlK()
    const labels = options()
    for (const p of ['Boards', 'People', 'Connections', 'Plan and billing', 'Your settings']) expect(labels).toContain(p)
  })
})
