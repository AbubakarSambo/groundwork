import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * "GROUNDWORK IS WRITING…" IN THE SET-UP CHAT (Hafsah, 9 October). It said "Thinking" before, with
 * bare dots alongside. Fails before this change: no sentence a screen reader could read, and a
 * different label from every other chat's wait.
 */
let resolveStream!: (reply: string) => void
const onboardStream = vi.fn().mockImplementation(() =>
  new Promise((resolve) => { resolveStream = (reply: string) => resolve({ reply, extracted: {} }) }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openStart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the set-up chat: the writing indicator', () => {
  beforeEach(() => { localStorage.clear(); onboardStream.mockClear() })

  it('shows "Groundwork is writing…" from the moment the first message is sent until the reply is drawn', async () => {
    openStart()
    const field = await screen.findByPlaceholderText('For example: our sales targets this quarter')
    fireEvent.change(field, { target: { value: 'A new hire starting Monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    resolveStream('Who is starting, and what should they be doing by the end of week one?')
    expect(await screen.findByText('Who is starting, and what should they be doing by the end of week one?')).toBeTruthy()
    expect(screen.queryByText('Groundwork is writing…')).toBeNull()
  })
})
