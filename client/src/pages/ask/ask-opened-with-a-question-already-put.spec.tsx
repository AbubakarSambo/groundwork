import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), finding: vi.fn() } }))
vi.mock('@/components/gw/AskGroundwork', () => ({
  AskGroundwork: ({ initialMessage }: { initialMessage?: string | null }) => (
    <div data-testid="ask-box">{initialMessage ?? '(nothing asked yet)'}</div>
  ),
}))

import { groundsApi } from '@/api/grounds'
import { useAskStore } from '@/stores/ask'
import { AskPage } from './AskPage'

/**
 * ASK OPENED WITH A QUESTION ALREADY PUT (docs/answers-from-engine.md, 8 October, "the engagement
 * work", point 3: "I can help you do that"). `/chat?about=<check-in id>` opens Ask with a question
 * already asked, rather than an empty box the lead has to fill in themselves after clicking
 * through from the first-insight mail.
 *
 * REQUEST 198 (a), DONE (docs/answers-from-engine.md, 8 October (late night)): `GET
 * /grounds/:groundId/report/finding` serves the real finding, read exactly as the mail's own
 * subject reads it - `finding: null` when the picture is not released to this reader yet, or names
 * nothing open. `AskPage.tsx` asks about the real finding when there is one and keeps the neutral
 * question otherwise, so a reader with nothing open yet is never left asking Ask about a sentence
 * that does not exist - Ask still opens, on a real question about their own check-in, and the
 * conversation continues from there rather than dead-ending on an empty box.
 */
function renderAsk(entry: string) {
  useAskStore.setState({ open: false, pendingMessage: null, openedFromCheckInSetupGroundId: null })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="/chat" element={<AskPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ask opened with a question already put', () => {
  beforeEach(() => {
    vi.mocked(groundsApi.get).mockReset()
    vi.mocked(groundsApi.finding).mockReset()
    vi.mocked(groundsApi.finding).mockResolvedValue({ groundId: 'g1', label: '', sessionNumber: null, finding: null, moreStillOpen: 0, conversationWorthHaving: null })
  })

  it('asks a neutral question naming the check-in, once the check-in is read', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Q4 priorities' } as any)
    renderAsk('/chat?about=g1')
    expect(await screen.findByText('Help me prepare for the conversation about Q4 priorities.')).toBeTruthy()
    expect(groundsApi.get).toHaveBeenCalledWith('g1')
  })

  it('asks about the real finding when the shared picture has one for this reader', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Kenya launch' } as any)
    vi.mocked(groundsApi.finding).mockResolvedValue({ groundId: 'g1', label: 'Kenya launch', sessionNumber: 1, finding: 'Who owns the next step with the distributor is not agreed upon by the team.', moreStillOpen: 0, conversationWorthHaving: null })
    renderAsk('/chat?about=g1')
    expect(await screen.findByText('Help me with what the shared picture found about Kenya launch. Who owns the next step with the distributor is not agreed upon by the team.')).toBeTruthy()
    expect(groundsApi.finding).toHaveBeenCalledWith('g1')
    /* NOT A DEAD END: the panel is actually open, with the finding as its first message, not just
       a sentence sitting unread in the store. */
    expect(useAskStore.getState().open).toBe(true)
  })

  /**
   * REQUEST 198 (a): A READER WITH NO FINDING YET IS NOT LEFT ASKING ABOUT NOTHING. `finding: null`
   * is served both when the picture is not released to this reader and when it names nothing open
   * - either way, Ask still opens on a real, neutral question about their own check-in rather than
   * the box staying empty or the page erroring out.
   */
  it('a reader with no finding yet still gets a real, open conversation - never a dead end', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g2', label: 'Night rota' } as any)
    vi.mocked(groundsApi.finding).mockResolvedValue({ groundId: 'g2', label: 'Night rota', sessionNumber: null, finding: null, moreStillOpen: 0, conversationWorthHaving: null })
    renderAsk('/chat?about=g2')
    expect(await screen.findByText('Help me prepare for the conversation about Night rota.')).toBeTruthy()
    expect(useAskStore.getState().open).toBe(true)
  })

  it('falls back to a neutral question with no name when the check-in cannot be read', async () => {
    vi.mocked(groundsApi.get).mockRejectedValue({ response: { status: 403 } })
    renderAsk('/chat?about=g-not-mine')
    expect(await screen.findByText('Help me prepare for this conversation.')).toBeTruthy()
  })

  it('asks nothing extra when there is no "about" in the address', async () => {
    renderAsk('/chat')
    expect(await screen.findByText('(nothing asked yet)')).toBeTruthy()
    expect(groundsApi.get).not.toHaveBeenCalled()
  })
})
