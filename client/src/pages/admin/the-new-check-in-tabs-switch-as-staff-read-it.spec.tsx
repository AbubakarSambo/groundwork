import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Release1bTabsSwitch } from './AdminPage'
import { adminApi } from '@/api/admin'
import { toast } from 'sonner'

/**
 * ADMIN -> ORGS: RELEASE 1B'S NEW CHECK-IN TABS, ONE ORGANISATION AT A TIME (Hafsah, 18 October 2026). Staff switch it on for
 * a test organisation first, and for a real client only once Hafsah says so; off returns the tab they had.
 * `PATCH /admin/organisations/:id/release-1b-tabs` with `{ on }`; the server says back what changed.
 */
vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin')
  return { ...actual, adminApi: { ...actual.adminApi, setRelease1bTabs: vi.fn() } }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderWith = (node: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>)
beforeEach(() => { vi.clearAllMocks() })

describe('the new check-in tabs switch, as staff read it', () => {
  it('reads off for an organisation that has the tab it had, in a full sentence', () => {
    renderWith(<Release1bTabsSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1bTabsOn: false }} />)
    expect(screen.getByText('The new check-in tabs')).toBeTruthy()
    expect(screen.getByText('Drop Access (test) has the People and setup tab it had before. Switch the new tabs on for a test organisation first, and for a real client only once Hafsah says so.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch the new check-in tabs on for Drop Access (test)' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('switching it on sends on for that organisation alone, and says back what the server says', async () => {
    ;(adminApi.setRelease1bTabs as any).mockResolvedValue({ id: 'org-drop', name: 'Drop Access (test)', release1bTabsOn: true, says: 'Drop Access (test) now has the new People and setup tab. Each check-in shows it the next time it is opened, and no setting changes.' })
    renderWith(<Release1bTabsSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1bTabsOn: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch the new check-in tabs on for Drop Access (test)' }))
    await waitFor(() => expect(adminApi.setRelease1bTabs).toHaveBeenCalledWith('org-drop', true))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Drop Access (test) now has the new People and setup tab. Each check-in shows it the next time it is opened, and no setting changes.'))
  })

  it('reads on, and says switching it off changes no setting', () => {
    renderWith(<Release1bTabsSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1bTabsOn: true }} />)
    expect(screen.getByText('Drop Access (test) has the new People and setup tab. Switching it off returns them to the tab they had, and no setting changes.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch the new check-in tabs off for Drop Access (test)' }).getAttribute('aria-pressed')).toBe('true')
  })
})
