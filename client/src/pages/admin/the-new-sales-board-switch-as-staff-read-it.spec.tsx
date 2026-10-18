import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReleaseOneSalesBoardSwitch } from './AdminPage'
import { adminApi } from '@/api/admin'
import { toast } from 'sonner'

/**
 * ADMIN -> ORGS: RELEASE 1'S SALES BOARD, ONE ORGANISATION AT A TIME (release plan, Part 0). Groundwork staff switch it on
 * for a test organisation first, and for a real client only once Hafsah says so; off returns the previous board.
 * `PATCH /admin/organisations/:id/release-one-sales-board` with `{ on }`; the server says back what changed.
 */
vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin')
  return { ...actual, adminApi: { ...actual.adminApi, setReleaseOneSalesBoard: vi.fn() } }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderWith = (node: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>)
beforeEach(() => { vi.clearAllMocks() })

describe('the new sales board switch, as staff read it', () => {
  it('reads off for an organisation that has its previous board, in a full sentence', () => {
    renderWith(<ReleaseOneSalesBoardSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1SalesBoardOn: false }} />)
    expect(screen.getByText('The new sales board')).toBeTruthy()
    expect(screen.getByText('Drop Access (test) has its previous board. Switch the new sales board on for a test organisation first, and for a real client only once Hafsah says so.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch the new sales board on for Drop Access (test)' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('switching it on sends on for that organisation alone, and says back what the server says', async () => {
    ;(adminApi.setReleaseOneSalesBoard as any).mockResolvedValue({ id: 'org-drop', name: 'Drop Access (test)', release1SalesBoardOn: true, says: 'Drop Access (test) now has the new sales board. Its board, team report and weekly report show it from the next time they are opened.' })
    renderWith(<ReleaseOneSalesBoardSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1SalesBoardOn: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch the new sales board on for Drop Access (test)' }))
    await waitFor(() => expect(adminApi.setReleaseOneSalesBoard).toHaveBeenCalledWith('org-drop', true))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Drop Access (test) now has the new sales board. Its board, team report and weekly report show it from the next time they are opened.'))
  })

  it('reads on, and says switching it off loses nothing', () => {
    renderWith(<ReleaseOneSalesBoardSwitch org={{ id: 'org-drop', name: 'Drop Access (test)', release1SalesBoardOn: true }} />)
    expect(screen.getByText('Drop Access (test) has the new sales board. Switching it off returns them to their previous board, and nothing is lost.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch the new sales board off for Drop Access (test)' }).getAttribute('aria-pressed')).toBe('true')
  })
})
