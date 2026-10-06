import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS } from './what-an-admin-cannot-read-without-access'
import { LeadsGuidePage } from '@/pages/org/LeadsGuidePage'
import { AdminFirstRun } from '@/pages/grounds/an-admin-lands-on-a-check-in-list'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { vi } from 'vitest'

function withQueryClient(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>
}

/**
 * SCREEN FAULT 8: THE SAME RULE, WRITTEN THREE DIFFERENT WAYS. Today's welcome card said "a
 * performance plan, promotion or renewal" (missing somebody's first 90 days), the leads' guide
 * said only "a performance plan" (missing the other three), and a person's own page named all
 * four. This checks the one shared sentence is what every one of the three actually renders.
 */
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

describe('one sentence for what an admin cannot read without access', () => {
  it('names all four kinds who-may-read-this-check-in.ts closes to an admin', () => {
    expect(WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS).toBe('a performance plan, a promotion, a renewal or somebody\'s first 90 days')
  })

  it('the leads’ guide uses it', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'ADMIN', organizationName: 'Kijani Foods' } } as any)
    render(<MemoryRouter><LeadsGuidePage /></MemoryRouter>)
    expect(await screen.findByText(new RegExp(`never ${WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} unless given access`))).toBeTruthy()
  })

  /* A person's own page (OnePersonPage.tsx) renders the capitalised form of this same constant
     ("A performance plan... stays closed") - already pinned word for word in
     OnePersonPage.spec.tsx, which needs a full people list and a matched :id route this file does
     not set up. Not duplicated here. */

  it('Today’s welcome card uses it', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'ADMIN', organizationName: 'Kijani Foods' } } as any)
    ;(apiClient.get as any).mockResolvedValue({ data: { data: { people: 1, admins: 1, checkIns: 0, paying: false, connected: false } } })
    render(withQueryClient(<AdminFirstRun />))
    expect(await screen.findByText(new RegExp(`never ${WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} unless given access`))).toBeTruthy()
  })
})
