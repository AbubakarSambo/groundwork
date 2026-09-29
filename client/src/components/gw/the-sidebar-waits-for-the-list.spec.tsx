import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { todayApi } from '@/api/today'

/**
 * THE SIDEBAR DOES NOT SAY "NOTHING IN PROGRESS YET" BEFORE IT KNOWS.
 *
 * Found in the final review: while the check-in list was still loading, the sidebar told a person
 * with check-ins that they had none. It now says nothing until the list has arrived.
 */
const USER = { id: 'u1', email: 'kavon@coamana.test', firstName: 'Kavon', lastName: 'Badie', role: 'MEMBER', organizationName: 'Coamana' }

function mount() {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/grounds']}><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>,
  )
}

/**
 * WHY THIS FILE WAS ORDER-DEPENDENT (round 2, item G).
 *
 * `AppShell` fires a second query while it is mounted - `['today']`, from `todayApi.get` - that
 * this file never mocked. With the local API actually running (as it is on this machine), that was
 * a REAL network call for a fake token ('t'), landing on the real 401 handler in `api/client.ts`:
 * it calls `useAuthStore.getState().logout()` and does `window.location.href = '/auth?...'` (the
 * jsdom "Not implemented: navigation to another Document" warning is that assignment). `logout()`
 * flips the SAME store `mount()` had just set `isAuthenticated: true` on - a real, asynchronous,
 * cross-test race: whichever test happened to be running when that response finally arrived lost
 * its own signed-in state partway through, and `AppShell` fell back to its signed-out, chromeless
 * render (`<main id="main">{children}</main>`, no rail) - which is why the failures looked like they
 * came from nowhere and did not reproduce on a fixed schedule.
 *
 * Mocked here now, the same way `groundsApi.list` already is, so nothing this file does reaches the
 * real network.
 */
beforeEach(() => { vi.spyOn(todayApi, 'get').mockResolvedValue({ needs: [], count: 0, line: null, comingUp: [] } as any) })
afterEach(() => vi.restoreAllMocks())

describe('the sidebar waits for the list', () => {
  it('says nothing about the check-ins while the list is still loading', () => {
    vi.spyOn(groundsApi, 'list').mockReturnValue(new Promise(() => {}))
    mount()
    expect(screen.queryByText('Nothing in progress yet.')).toBeNull()
    expect(document.querySelector('.gw-sidebar-desktop .gw-rl-h-link')).toHaveTextContent('Check-ins')
  })

  it('says "Nothing in progress yet." once the list has arrived empty', async () => {
    vi.spyOn(groundsApi, 'list').mockResolvedValue([])
    mount()
    expect(await screen.findByText('Nothing in progress yet.')).toBeInTheDocument()
  })

  it('and never says it when the list arrives with check-ins in it', async () => {
    vi.spyOn(groundsApi, 'list').mockResolvedValue([{ id: 'g1', label: 'Coamana growth, Q3', status: 'AWAITING_PARTIES', participants: [], checkIns: [] }] as any)
    mount()
    expect(await screen.findByText('Coamana growth, Q3')).toBeInTheDocument()
    expect(screen.queryByText('Nothing in progress yet.')).toBeNull()
  })

  it('if the list cannot be loaded it says so, and what to do, instead of claiming there are none', async () => {
    vi.spyOn(groundsApi, 'list').mockRejectedValue(new Error('offline'))
    mount()
    expect(await screen.findByText('Your check-ins did not load. Reload the page to try again.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing in progress yet.')).toBeNull()
  })
})
