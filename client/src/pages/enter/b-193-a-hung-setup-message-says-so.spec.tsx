import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * B-193: THE SET-UP CHAT (`/start`) SAID NOTHING WHEN THE STREAM NEVER ANSWERED.
 *
 * `sendOnboarding`'s call to `entryApi.onboardStream` had no watchdog, unlike `ChatPage`'s own
 * `open()`. A stream that never sends a delta and never settles - the live shape of "Entry stream
 * failed" on the server - left Wairimu's description on screen for 90 seconds (and after
 * reopening the page) with no writing indicator, no error and no way forward: the promise never
 * resolved or rejected, so the function's own `catch` never ran.
 *
 * Fixed with a watchdog: a stream that has sent not one delta in 45 seconds is now treated as
 * failed, the same generous allowance ChatPage's own watchdog gives a request that never truly
 * started. The composer gets the words back and a message says what the check-in chat already
 * says in the same state.
 */
const onboardStream = vi.fn().mockImplementation(() => new Promise(() => { /* never settles */ }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'

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

describe('the set-up chat: a stream that never answers', () => {
  beforeEach(() => {
    localStorage.clear()
    onboardStream.mockClear()
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => { vi.useRealTimers() })

  /*
   * B-220 (test follow-up, said why here too): this used to check the failure through a toast -
   * `toast.error`, gone on its own after about four seconds. The failure is now a persistent
   * sentence on the page itself, by the composer (`onboardingSendError`), so this reads it there
   * instead; the toast assertion is gone, not just updated, since there is no longer a toast for
   * this failure.
   */
  it('says so after 45 seconds of silence, and puts the words back in the box', async () => {
    openStart()
    const field = await screen.findByPlaceholderText('For example: our sales targets this quarter')
    fireEvent.change(field, { target: { value: 'A new hire starting Monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // REGRESSION: this used to sit silent forever - nothing ever threw, so nothing was ever said.
    await vi.advanceTimersByTimeAsync(46_000)

    expect(await screen.findByText(/conversation could not be reached just now/i)).toBeTruthy()
    expect(toast.error).not.toHaveBeenCalled()
    expect(await screen.findByDisplayValue('A new hire starting Monday')).toBeTruthy()
  })
})
