import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResolutionPanel } from './ResolutionPanel'
import { resolutionApi } from '@/api/resolution'

/**
 * THE NEW HIRE SEES WHAT IS COMING. HE IS NOT ASKED TO AGREE TO IT.
 *
 * Seen live on a real twelve-session ground, on the hire's own screen:
 *
 *     Keep the hire | Restructure the role | Let them go
 *     [ This is my answer ]
 *     0 of 2 people have answered
 *
 * He was being invited to select his own exit, and until he picked the same
 * option as his manager the ground could not close, so he also held a veto over
 * an employment decision that was never his. Both directions wrong at once.
 *
 * What he keeps: the options, so nothing is decided behind his back; his own
 * account; his corrections; his record standing beside his manager's. What goes
 * is the button asking him to consent to his own dismissal.
 *
 * Peers are untouched. Two cofounders still both have to agree, because there
 * the shared model is the correct one.
 */

vi.mock('@/api/resolution', () => ({
  resolutionApi: { get: vi.fn(), propose: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

function state(over: Record<string, any> = {}) {
  return {
    resolution: null,
    confirmations: [
      { participantId: 'p1', label: 'the manager', partyType: 'INITIATOR', endState: null, confirmed: false },
      { participantId: 'p2', label: 'the new hire', partyType: 'PARTICIPANT', endState: null, confirmed: false },
    ],
    confirmedCount: 0,
    totalActive: 2,
    options: [
      { value: 'KEEP', label: 'Keep the hire' },
      { value: 'EXIT', label: 'Let them go' },
    ],
    groundStatus: 'ACTIVE',
    leadDecides: true,
    viewerIsLead: false,
    ...over,
  }
}

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ResolutionPanel groundId="g1" />
    </QueryClientProvider>,
  )
}

describe('what the new hire sees', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the outcomes, so nothing is decided behind their back', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state())
    renderPanel()
    expect(await screen.findByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('Let them go')).toBeTruthy()
  })

  it('does NOT offer them a button to choose their own exit', async () => {
    // THE REGRESSION.
    ;(resolutionApi.get as any).mockResolvedValue(state())
    renderPanel()
    await screen.findByText('Keep the hire')
    expect(screen.queryByText('This is my answer')).toBeNull()
    expect(screen.queryByText('Change my answer')).toBeNull()
  })

  it('says plainly who decides, and that their account still counts', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state())
    renderPanel()
    expect(await screen.findByText(/Your lead decides which one it is/i)).toBeTruthy()
    expect(screen.getByText(/account stays on the record either way/i)).toBeTruthy()
  })

  it('does not tell them everyone has to agree, because they do not', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state())
    renderPanel()
    await screen.findByText('Keep the hire')
    expect(screen.queryByText(/everyone picks the same one/i)).toBeNull()
  })
})

describe('what the lead sees on the same ground', () => {
  beforeEach(() => vi.clearAllMocks())

  it('can choose', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state({ viewerIsLead: true }))
    renderPanel()
    expect(await screen.findByText('This is my answer')).toBeTruthy()
  })

  it('is told it is theirs to decide, and that the accounts stand either way', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state({ viewerIsLead: true }))
    renderPanel()
    expect(await screen.findByText(/yours to decide/i)).toBeTruthy()
    expect(screen.getByText(/accounts stay on the record whichever way you go/i)).toBeTruthy()
  })
})

describe('peers are untouched', () => {
  beforeEach(() => vi.clearAllMocks())

  it('still asks both cofounders, and still says nobody closes it alone', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(state({ leadDecides: false, viewerIsLead: false }))
    renderPanel()
    expect(await screen.findByText('This is my answer')).toBeTruthy()
    expect(screen.getByText(/nobody closes it alone/i)).toBeTruthy()
  })
})
