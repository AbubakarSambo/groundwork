import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { todayApi } from '@/api/today'
import { authApi } from '@/api/auth'

/**
 * TODAY WAS A WHITE PAGE THE NEXT MORNING (plan round 32). While `my-waiting` had not answered, B-202's wall drew nothing at all, rail
 * included. The rail's frame is drawn now, empty: no organisation, no doors, and none of the sidebar's own requests, so a person still
 * waiting to be let in sees and requests nothing behind the wall (B-202, unchanged). Once the answer is in, the real rail is drawn for
 * somebody not waiting, and nothing for somebody who is.
 */
const USER = { id: 'u1', email: 'wanjiru@kamau-advocates.test', firstName: 'Wanjiru', lastName: 'Kamau', role: 'ADMIN', organizationName: 'Kamau and Partners' }

function mount(qc: QueryClient) {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AppShell><p>the page</p></AppShell></MemoryRouter></QueryClientProvider>)
}

let answer: (v: any) => void
beforeEach(() => {
  vi.spyOn(authApi, 'myWaiting').mockReturnValue(new Promise((r) => { answer = r }) as any)
  vi.spyOn(groundsApi, 'list').mockResolvedValue([])
  vi.spyOn(todayApi, 'get').mockResolvedValue({ needs: [], count: 0, line: null, comingUp: [] } as any)
})
afterEach(() => { vi.restoreAllMocks(); useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as any) })

describe('the rail while the wall decides', () => {
  it('is its empty frame: no organisation, no doors, and none of the sidebar\'s requests', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mount(qc)
    const rail = document.querySelector('aside.gw-sidebar-desktop') as HTMLElement
    expect(rail).toBeTruthy()
    expect(rail.textContent).toBe('')
    expect(screen.queryByText('Kamau and Partners')).toBeNull()
    expect(groundsApi.list).not.toHaveBeenCalled()
    expect(todayApi.get).not.toHaveBeenCalled()
  })

  it('becomes the real rail once the answer says she is not waiting', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mount(qc)
    answer({ waiting: false })
    expect(await screen.findByRole('navigation', { name: 'Check-ins and pages' })).toBeTruthy()
  })

  it('and draws no rail at all once the answer says she is still waiting', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mount(qc)
    answer({ waiting: true })
    await vi.waitFor(() => expect(document.querySelector('aside.gw-sidebar-desktop')).toBeNull())
    expect(groundsApi.list).not.toHaveBeenCalled()
  })
})
