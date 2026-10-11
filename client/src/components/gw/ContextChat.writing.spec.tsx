import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextChat } from './ContextChat'
import { groundsApi } from '@/api/grounds'

/**
 * "GROUNDWORK IS WRITING…" IN THE OLD CONTEXT CHAT (Hafsah, 9 October). Replaces the bare
 * "Thinking…" line. Fails before this change: the old markup said only "Thinking…", no name, no
 * role="status" sentence shared with the rest of the product.
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

describe('Context chat: the writing indicator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Groundwork is writing…" while the opening turn is being fetched, and clears it once it lands', async () => {
    let resolveOpening!: (v: unknown) => void
    ;(groundsApi.contextChat as any).mockReturnValue(new Promise((resolve) => { resolveOpening = resolve }))
    mount()
    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    resolveOpening({ reply: 'What should this check-in be held against?', done: false })
    expect(await screen.findByText('What should this check-in be held against?')).toBeTruthy()
    expect(screen.queryByText('Groundwork is writing…')).toBeNull()
  })
})
