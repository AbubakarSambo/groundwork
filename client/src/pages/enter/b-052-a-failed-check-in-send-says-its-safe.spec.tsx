import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EntryChatPage } from './EntryChatPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

/**
 * B-052: A FAILED CHECK-IN MESSAGE SAID ONLY "MESSAGE FAILED. TRY AGAIN."
 *
 * Found during the small-states sweep (F4-small-states/states.txt, "Not saved": the prototype
 * always pairs a failed send with what is still true - "What you typed is still here." - never a
 * bare failure. This toast was two clipped words with no such sentence, even though the turn that
 * failed genuinely does stay on screen (`setHistory(msgs)`) and was already written to
 * localStorage by `persistCheckin` before the request went out (see b-041's own fix). The wording
 * just never said so. Fixed to read as the same kind of sentence `ChatPage.tsx`'s own failed-send
 * toast already uses ("That did not send. Your message is back in the box, try again.").
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    chatStream: vi.fn().mockRejectedValue(new Error('network')),
    report: vi.fn(),
    onboard: vi.fn(),
    onboardStream: vi.fn(),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null, confidence: 'low' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/** A session already in its check-in phase (setup finished), the same shape `restoreTheSavedSetup` expects. */
function seedCheckinInProgress() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT',
    history: [
      { role: 'assistant', content: 'How is the project going so far?' },
    ],
    closed: false,
    onboardingStep: 7,
    onboardingSelections: { mode: 'new', initial: 'We are starting a new project' },
    onboardingHistory: [],
  }))
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { localStorage.clear(); seedCheckinInProgress() })

describe('B-052: a failed check-in send says what is still true', () => {
  it('tells the reader their words are still here, not just that it failed', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/How is the project going/i)).toBeTruthy())

    const box = screen.getByPlaceholderText(/Type your response/i)
    fireEvent.change(box, { target: { value: 'We shipped the first milestone on time.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    const said = vi.mocked(toast.error).mock.calls.map(c => c[0]).join(' | ')
    expect(said).toMatch(/what you wrote is still here/i)
    expect(said).not.toMatch(/^message failed\.?$/i)

    // And it really is still here, not silently dropped from the record.
    expect(screen.getByText('We shipped the first milestone on time.')).toBeTruthy()
  })
})
