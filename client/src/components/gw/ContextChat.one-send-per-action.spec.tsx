import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextChat } from './ContextChat'
import { groundsApi } from '@/api/grounds'

/**
 * SCREEN FAULT (engine workspace, 9 October night, test bed copy a, "Nakuru win-back"): "sending it
 * again worked (the message then shows twice)." While a send is still waiting on its reply, the
 * Send button already disables itself - but the Enter key's own handler called `submit()` with no
 * such check at all, so retyping the same message and pressing Enter again, before the first reply
 * had landed, queued a second `send.mutate` on top of the still-pending first one.
 *
 * Fails before the fix (Enter has no re-entrancy guard, so this calls `groundsApi.contextChat` for
 * the send a second time while the first is still pending) and passes after (the second call is
 * dropped: `submit()` now checks `send.isPending` itself, the one function both the key and the
 * button call).
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { contextChat: vi.fn() },
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./remembering-the-context-conversation', () => ({
  rememberConversation: vi.fn(), recallConversation: vi.fn(() => null), forgetConversation: vi.fn(),
}))

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ContextChat groundId="g1" />
    </QueryClientProvider>,
  )
}

describe('Context chat: one send per action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pressing Enter again with the same words, while the first send is still pending, does not send it twice', async () => {
    ;(groundsApi.contextChat as any)
      .mockResolvedValueOnce({ reply: 'What should this check-in be held against?', done: false })
    // The send itself never resolves within this test - the point is to act while it is pending.
    ;(groundsApi.contextChat as any).mockImplementation(() => new Promise(() => {}))
    mount()
    await screen.findByText('What should this check-in be held against?')

    const input = screen.getByPlaceholderText('Type your answer…')
    fireEvent.change(input, { target: { value: 'We are pushing to win Nakuru back.' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(groundsApi.contextChat).toHaveBeenCalledTimes(2)) // the opening turn, then the send

    /* The first send is still waiting on its reply. She retypes the same words and presses Enter
       again, the way a lead who sees nothing happen yet would. */
    fireEvent.change(input, { target: { value: 'We are pushing to win Nakuru back.' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(groundsApi.contextChat).toHaveBeenCalledTimes(2)
    expect(screen.getAllByText('We are pushing to win Nakuru back.')).toHaveLength(1)
  })
})
