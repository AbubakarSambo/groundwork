import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), finding: vi.fn() } }))
const askSpy = vi.fn()
vi.mock('@/components/gw/AskGroundwork', () => ({
  AskGroundwork: ({ initialMessage }: { initialMessage?: string | null }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { if (initialMessage) askSpy(initialMessage) }, [initialMessage])
    return <div data-testid="ask-box">{initialMessage ?? '(nothing asked yet)'}</div>
  },
}))

import { groundsApi } from '@/api/grounds'
import { useAskStore } from '@/stores/ask'
import { AskPage } from './AskPage'

/**
 * B-210 (REVIEW 4): A RELOAD OR BACK SENT THE QUESTION AGAIN.
 *
 * `askedAboutRef` only guards a second run of the SAME mount's effect (StrictMode's double
 * invoke) - a reload, or going Back to `#/chat?about=<id>`, is a fresh mount with a fresh ref, so
 * the question was queued and sent again every time, piling up in the reader's own private Ask
 * history. Fixed by remembering, in `sessionStorage` (per tab, so a reload and Back share it but a
 * fresh click on the email link in a new tab does not), that this exact check-in and question were
 * already sent.
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

beforeEach(() => {
  vi.clearAllMocks()
  askSpy.mockClear()
  sessionStorage.clear()
  vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Q4 priorities' } as any)
  vi.mocked(groundsApi.finding).mockResolvedValue({ groundId: 'g1', label: '', sessionNumber: null, finding: null, moreStillOpen: 0, conversationWorthHaving: null })
})

describe('the question is sent once per link, not once per visit', () => {
  it('a second mount on the same link (a reload, or Back) does not send it again', async () => {
    const first = renderAsk('/chat?about=g1')
    expect(await screen.findByText('Help me prepare for the conversation about Q4 priorities.')).toBeTruthy()
    expect(askSpy).toHaveBeenCalledTimes(1)
    first.unmount()

    renderAsk('/chat?about=g1')
    /* Wait for the second mount's own reads to finish - the same two calls the first mount made -
       before checking nothing more was asked, so this does not pass merely because the assertion
       ran before the (old, defective) second `queueMessage` had a chance to fire. */
    await waitFor(() => expect(groundsApi.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(groundsApi.finding).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('ask-box')).toHaveTextContent('(nothing asked yet)')
    expect(askSpy).toHaveBeenCalledTimes(1)
  })

  it('a different check-in is still asked about, even in the same tab', async () => {
    const first = renderAsk('/chat?about=g1')
    await screen.findByText('Help me prepare for the conversation about Q4 priorities.')
    first.unmount()

    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g2', label: 'Night rota' } as any)
    renderAsk('/chat?about=g2')
    expect(await screen.findByText('Help me prepare for the conversation about Night rota.')).toBeTruthy()
    expect(askSpy).toHaveBeenCalledTimes(2)
  })

  it('a fresh tab (empty sessionStorage) sends the same link again', async () => {
    const first = renderAsk('/chat?about=g1')
    await screen.findByText('Help me prepare for the conversation about Q4 priorities.')
    first.unmount()
    sessionStorage.clear() // what a brand new tab starts with

    renderAsk('/chat?about=g1')
    await screen.findByText('Help me prepare for the conversation about Q4 priorities.')
    expect(askSpy).toHaveBeenCalledTimes(2)
  })
})
