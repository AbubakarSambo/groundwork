import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhereTheBlockerStarted } from './WhereTheBlockerStarted'
import { apiClient } from '@/api/client'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'

/**
 * WHERE THE BLOCKER STARTED (where-a-blocker-started.jpg, screen match 16 October). The page draws only
 * what the engine serves this reader (the-blocker-trace.service.ts walls every step by the check-ins they
 * may open): every step it sends, where it started and the decision when the whole chain is theirs, or
 * which team it waits on when it is not. It works nothing out itself.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/client', () => ({ apiClient: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

function open(traces: any[]) {
  ;(apiClient.get as any).mockResolvedValue({ data: { traces } })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', label: 'Sales team, Q3', participants: [] })
  ;(boardApi.get as any).mockResolvedValue({ title: 'Sales team, Q3', phaseSpine: { sessions: [] } })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-sales/trace']}>
        <Routes><Route path="/grounds/:id/trace" element={<WhereTheBlockerStarted />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('where the blocker started', () => {
  it('draws each step the engine sends, where it started, and the decision with who decides', async () => {
    open([{
      id: 't1', waitingOn: null, decidedBy: 'Amani decides.',
      whereItStarted: 'the request went to Finance without the references.', decisionNeeded: 'sign off the credit terms this week?',
      steps: [
        { kind: 'Need', checkIn: 'Sales team, Q3', checkInId: 'g-sales', owner: 'Miriam Wanjiku', text: 'Westgate Deli’s deposit' },
        { kind: 'Question', checkIn: 'Finance, Q3', checkInId: 'g-fin', owner: 'Grace Achieng', text: 'Who are their references?' },
      ],
    }])
    expect(await screen.findByRole('heading', { name: 'Where the blocker started' })).toBeTruthy()
    expect(await screen.findByText('Westgate Deli’s deposit')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Finance, Q3' })).toBeTruthy()
    expect(screen.getByText('the request went to Finance without the references.')).toBeTruthy()
    expect(screen.getByText('Decision needed: sign off the credit terms this week?')).toBeTruthy()
    expect(screen.getByText('Amani decides.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ask Miriam' })).toBeTruthy()
  })

  it('where the chain is not all the reader’s, says which team it waits on and invents no start', async () => {
    open([{ id: 't1', waitingOn: 'This is waiting on Finance since 14 September.', decidedBy: null, whereItStarted: null, decisionNeeded: null,
      steps: [{ kind: 'Need', checkIn: 'Sales team, Q3', checkInId: 'g-sales', owner: 'Miriam Wanjiku', text: 'Westgate Deli’s deposit' }] }])
    expect(await screen.findByText('This is waiting on Finance since 14 September.')).toBeTruthy()
    expect(screen.queryByText(/Where it started/)).toBeNull()
    expect(screen.queryByText(/Decision needed/)).toBeNull()
  })

  it('says so in a sentence when nothing is traced', async () => {
    open([])
    expect(await screen.findByText(/Nothing on record follows a blocker here back to another team yet/)).toBeTruthy()
  })
})
