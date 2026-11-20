import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * B-194: "THE CONVERSATION COULD NOT BE REACHED JUST NOW ..." WAS SAID TWICE.
 *
 * When `conversationApi.open` fails, the onError handler both set the permanent banner
 * (`setOpenFailedMessage` + `setOpenFailed(true)`, rendered with "Try again") AND fired
 * `toast.error(message)` with the SAME sentence - a second copy in a fading red toast, on top
 * of the first. At 390px the toast sat over the tab row. The block of comments right above this
 * handler already explains why a persistent banner, not a toast, is the right place for a state
 * that does not resolve itself ("the server's own sentence is shown - permanently, in the banner
 * below, not a toast that fades") - the toast call contradicted the design it sits next to.
 *
 * Fix: drop the toast call. The banner alone still says the message, with "Try again".
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Wairimu', email: 'wairimu@msingi.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn() },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { toast } from 'sonner'

const MESSAGE = 'The conversation could not be reached just now, so this check-in cannot continue this minute.'

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/ci1']}>
        <Routes><Route path="/checkin/:checkInId" element={<ChatPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the conversation-unreachable banner is said once, not also as a toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockRejectedValue(new Error('no transcript either'))
    ;(conversationApi.open as any).mockRejectedValue({ response: { data: { message: MESSAGE } } })
  })

  it('shows the banner with "Try again", and never calls the toast with the same message', async () => {
    renderChat()
    expect(await screen.findByText(MESSAGE, {}, { timeout: 3000 })).toBeTruthy()
    expect(await screen.findByRole('button', { name: /Try again/i })).toBeTruthy()
    // Only one element on screen carries the sentence - no second, plain-text copy.
    expect(screen.getAllByText(MESSAGE).length).toBe(1)
    expect((toast.error as any)).not.toHaveBeenCalled()
  })
})
