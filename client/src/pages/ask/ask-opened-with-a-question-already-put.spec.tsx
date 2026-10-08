import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
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
 * work", point 3: "I can help you do that"). `/chat?about=<check-in id>` should open Ask with a
 * question already asked, rather than an empty box the lead has to fill in themselves after
 * clicking through from the first-insight mail.
 *
 * There is no server route yet that serves the actual finding for a check-in id on its own (see
 * the request in docs/requests-to-engine.md), so this opens with a neutral question naming the
 * check-in instead of inventing the sentence client-side.
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
  })

  it('asks a neutral question naming the check-in, once the check-in is read', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Q4 priorities' } as any)
    renderAsk('/chat?about=g1')
    expect(await screen.findByText('Help me prepare for the conversation about Q4 priorities.')).toBeTruthy()
    expect(groundsApi.get).toHaveBeenCalledWith('g1')
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
