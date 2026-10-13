import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { GroundParticipant } from '@/types'

vi.mock('@/api/reports', () => ({ reportsApi: { sendToEveryone: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { reportsApi } from '@/api/reports'
import { SendTheReportToEveryone } from './SendTheReportToEveryone'

/**
 * REQUEST 174, ITEM 2 (GroundAdminPage's report tab, fault a): "Send to 1" answered "Everybody
 * who asked for it already has it." and the button stayed - live, the same, pressable again for
 * the same answer. `reachable` only asks who MAY be sent the report, not who already has this
 * round's copy, so it does not change when a send reaches nobody new. The button must give way to
 * the sentence once that is the answer, not sit there offering to repeat it.
 */
function aParticipant(id: string): GroundParticipant {
  return {
    id, groundId: 'g1', partyType: 'PARTICIPANT', wantsTheReport: true,
    email: `${id}@example.test`, user: { firstName: 'Amani', lastName: 'Wekesa' },
  } as any
}

function renderIt(participants: GroundParticipant[], answered: Set<string>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SendTheReportToEveryone groundId="g1" participants={participants} answered={answered} />
    </QueryClientProvider>,
  )
}

describe('the button gives way to the sentence once there is nothing left to send', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hides the button and says so once a send reaches nobody new', async () => {
    vi.mocked(reportsApi.sendToEveryone).mockResolvedValue({
      sessionNumber: 1, sent: 0, failed: 0, alreadyTold: 1, notAsked: 0, sharedAs: 'NAMED',
    })
    const p = aParticipant('p1')
    renderIt([p], new Set(['p1']))

    const button = screen.getByRole('button', { name: /Send to 1/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/Everybody who asked for it already has it\./)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Send/ })).toBeNull()
  })

  it('keeps the button when the send actually reached somebody', async () => {
    vi.mocked(reportsApi.sendToEveryone).mockResolvedValue({
      sessionNumber: 1, sent: 1, failed: 0, alreadyTold: 0, notAsked: 0, sharedAs: 'NAMED',
    })
    const p = aParticipant('p1')
    renderIt([p], new Set(['p1']))

    fireEvent.click(screen.getByRole('button', { name: /Send to 1/ }))

    await waitFor(() => expect(reportsApi.sendToEveryone).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /Send to 1/ })).toBeTruthy()
  })

  it('has no button to press when nobody here may be sent the report', () => {
    const p = { ...aParticipant('p1'), wantsTheReport: false }
    renderIt([p as any], new Set(['p1']))
    expect(screen.queryByRole('button', { name: /Send/ })).toBeNull()
  })
})
