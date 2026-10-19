import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Release2CollectionsSwitch } from './AdminPage'
import { adminApi } from '@/api/admin'
import { toast } from 'sonner'

/**
 * ADMIN -> ORGS: RELEASE 2, COLLECT WHAT'S OWED, ONE ORGANISATION AT A TIME (release plan, Release 2). Staff switch it on for a
 * test organisation first, and for a real client only once Hafsah says so; off returns what they had.
 * `PATCH /admin/organisations/:id/release-2-collections` with `{ on }`; the server says back what changed.
 */
vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin')
  return { ...actual, adminApi: { ...actual.adminApi, setRelease2Collections: vi.fn() } }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const renderWith = (node: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>)
beforeEach(() => { vi.clearAllMocks() })

describe('the collect what is owed switch, as staff read it', () => {
  it('reads off for an organisation that has what it had, in a full sentence', () => {
    renderWith(<Release2CollectionsSwitch org={{ id: 'org-muchemi', name: 'Muchemi & Co (test)', release2CollectionsOn: false }} />)
    expect(screen.getByText('Collect what’s owed')).toBeTruthy()
    expect(screen.getByText('Muchemi & Co (test) cannot start a check-in to collect what is owed. Switch it on for a test organisation first, and for a real client only once Hafsah says so.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch collecting what is owed on for Muchemi & Co (test)' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('reads off when the list says nothing about it, as for every organisation before Release 2', () => {
    renderWith(<Release2CollectionsSwitch org={{ id: 'org-drop', name: 'Drop Access (test)' }} />)
    expect(screen.getByRole('button', { name: 'Switch collecting what is owed on for Drop Access (test)' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('switching it on sends on for that organisation alone, and says back what the server says', async () => {
    const says = 'Muchemi & Co (test) can now start a check-in to collect what is owed, and its leads confirm each check-in\'s type in People and setup. No existing check-in changes.'
    ;(adminApi.setRelease2Collections as any).mockResolvedValue({ id: 'org-muchemi', name: 'Muchemi & Co (test)', release2CollectionsOn: true, says })
    renderWith(<Release2CollectionsSwitch org={{ id: 'org-muchemi', name: 'Muchemi & Co (test)', release2CollectionsOn: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch collecting what is owed on for Muchemi & Co (test)' }))
    await waitFor(() => expect(adminApi.setRelease2Collections).toHaveBeenCalledWith('org-muchemi', true))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(says))
  })

  it('reads on, and says switching it off loses nothing', () => {
    renderWith(<Release2CollectionsSwitch org={{ id: 'org-muchemi', name: 'Muchemi & Co (test)', release2CollectionsOn: true }} />)
    expect(screen.getByText('Muchemi & Co (test) can start a check-in to collect what is owed. Switching it off returns them to what they had, and nothing is lost.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Switch collecting what is owed off for Muchemi & Co (test)' }).getAttribute('aria-pressed')).toBe('true')
  })
})
