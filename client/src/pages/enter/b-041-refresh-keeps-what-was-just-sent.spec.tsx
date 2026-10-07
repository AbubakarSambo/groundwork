import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * B-041: REFRESHING /start WHILE GROUNDWORK WAS STILL COMPOSING ITS REPLY RETURNED TO THE VERY
 * FIRST BLANK "SET UP A CHECK-IN" SCREEN, WITH WHAT WAS TYPED GONE AND NO HISTORY.
 *
 * The draft is kept server-side too (the post-email patch flow), but a lead who has not given an
 * email yet has only this browser's own localStorage (`gw_entry_session`) to come back to - and
 * that was only ever written once a reply came back (`persistOnboarding`/`persistCheckin`, both
 * called from the mutation's `onSuccess`). Sending a message set it in React state first, so a
 * refresh in the gap between sending and the reply arriving lost it outright. Fixed by persisting
 * the moment a message is sent, not only once it is answered.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn(),
    onboard: vi.fn(),
    onboardStream: vi.fn(() => new Promise(() => { /* never resolves: still "composing" */ })),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null, confidence: 'low' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/** A session mid-onboarding: a card was picked and the engine has replied once already. */
function seedMidConversation() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: '',
    history: [],
    closed: false,
    onboardingStep: 1,
    onboardingSelections: { mode: 'new', initial: 'We are starting a new project' },
    onboardingHistory: [
      { role: 'assistant', content: 'What brings you here? Scroll for the full list of situations, pick the one that fits, or describe your own at the bottom.' },
      { role: 'user', content: 'We are starting a new project and I want to get the team aligned.' },
      { role: 'assistant', content: 'Got it, a new project. Who is on the team with you?' },
    ],
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

beforeEach(() => { localStorage.clear(); seedMidConversation() })

describe('B-041: what is sent is saved before the reply comes back', () => {
  it('keeps the message just sent in localStorage while Groundwork is still composing', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/Got it, a new project/i)).toBeTruthy())

    const box = screen.getByPlaceholderText(/Type your response/i)
    fireEvent.change(box, { target: { value: 'Amani Wekesa and Baraka Mutua are on the team.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    /* The reply mock never resolves - this is exactly the "still Thinking…" window a refresh can
       land in. The message must already be on disk. */
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('gw_entry_session') ?? '{}')
      const said = (saved.onboardingHistory ?? []).map((t: any) => t.content)
      expect(said).toContain('Amani Wekesa and Baraka Mutua are on the team.')
    })
  })
})
