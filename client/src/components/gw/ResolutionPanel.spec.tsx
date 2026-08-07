import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResolutionPanel } from './ResolutionPanel'
import { resolutionApi } from '@/api/resolution'

vi.mock('@/api/resolution', () => ({
  resolutionApi: { get: vi.fn(), propose: vi.fn(), counter: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * The entry point that did not exist.
 *
 * Ten grounds ran 265 check-ins to completion and none of them closed, because
 * a finished resolution API had nothing calling it. These tests are about the
 * wiring being present and honest - the closing RULES are the server's and are
 * tested there.
 */
const STATE = {
  resolution: null,
  confirmations: [
    { participantId: 'p1', label: 'Hafsah', partyType: 'LEAD', endState: null, confirmed: false },
    { participantId: 'p2', label: 'Abubakar', partyType: 'PARTY', endState: null, confirmed: false },
  ],
  confirmedCount: 0,
  totalActive: 2,
  options: [
    { value: 'KEEP', label: 'Keep the hire' },
    { value: 'EXIT', label: 'Let them go' },
  ],
  groundStatus: 'ACTIVE',
}

const renderPanel = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}><ResolutionPanel groundId="g1" /></QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('a ground can be brought to an end', () => {
  it('offers the scenario\'s own end states', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(STATE)
    renderPanel()
    expect(await screen.findByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('Let them go')).toBeTruthy()
  })

  it('records a choice against the real API', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(STATE)
    ;(resolutionApi.propose as any).mockResolvedValue({ ...STATE, confirmedCount: 1 })
    renderPanel()
    await userEvent.click(await screen.findByText('Keep the hire'))
    await userEvent.click(screen.getByText('This is my answer'))
    await waitFor(() => expect(resolutionApi.propose).toHaveBeenCalledWith('g1', 'KEEP'))
  })

  it('will not submit before a choice is made', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(STATE)
    renderPanel()
    await userEvent.click(await screen.findByText('This is my answer'))
    expect(resolutionApi.propose).not.toHaveBeenCalled()
  })

  it('shows who has answered and who has not, without hiding anyone', async () => {
    ;(resolutionApi.get as any).mockResolvedValue({
      ...STATE,
      confirmations: [
        { ...STATE.confirmations[0], endState: 'KEEP', confirmed: true },
        STATE.confirmations[1],
      ],
      confirmedCount: 1,
    })
    renderPanel()
    expect(await screen.findByText('1 of 2 people have answered')).toBeTruthy()
    expect(screen.getByText('not yet')).toBeTruthy()
  })

  it('names a split rather than smoothing it over', async () => {
    // Two people, two different answers. The disagreement is the signal; the
    // panel must not quietly average it away or imply someone is wrong.
    ;(resolutionApi.get as any).mockResolvedValue({
      ...STATE,
      confirmations: [
        { ...STATE.confirmations[0], endState: 'KEEP', confirmed: true },
        { ...STATE.confirmations[1], endState: 'EXIT', confirmed: true },
      ],
      confirmedCount: 2,
    })
    renderPanel()
    expect(await screen.findByText(/chosen differently/i)).toBeTruthy()
  })

  it('shows the outcome, and no voting controls, once it is closed', async () => {
    ;(resolutionApi.get as any).mockResolvedValue({
      ...STATE,
      resolution: { id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt: '2026-08-07T00:00:00Z' },
      groundStatus: 'RESOLVED',
    })
    renderPanel()
    expect(await screen.findByText('How this ground ended')).toBeTruthy()
    expect(screen.queryByText('This is my answer')).toBeNull()
  })

  it('renders nothing at all for someone who is not a party', async () => {
    // The setting-up admin can read the board but does not get a vote. The API
    // 403s her; the panel must disappear rather than show an error.
    ;(resolutionApi.get as any).mockRejectedValue(new Error('403'))
    const { container } = renderPanel()
    await waitFor(() => expect(container.textContent).toBe(''))
  })
})
