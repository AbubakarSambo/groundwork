import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * A REFRESH MID-CONVERSATION MUST NOT THROW THE CONVERSATION AWAY.
 *
 * GW-003. The intro effect depends on `phase`, and the restore path sets `phase`
 * to 'onboarding'. So on a refresh it ran with a stale `onboardingHistory.length`
 * of 0 - captured before the restore applied - and overwrote the restored turns
 * with the single intro message.
 *
 * What the user saw: refresh while answering, and the seventeen-card picker is
 * back (it renders when the history has exactly one turn), the conversation has
 * vanished from the screen, and there is no input to carry on in - while every
 * turn is still sitting in localStorage. Reproduced live, then fixed with a
 * functional update that reads the current history instead of a captured one.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/** A session mid-onboarding: a card was picked and the engine has replied. */
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

describe('GW-003: restoring a conversation after refresh', () => {
  beforeEach(() => { localStorage.clear(); seedMidConversation() })

  it('keeps the conversation on screen', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Got it, a new project/i)).toBeTruthy()
    })
    expect(screen.getByText(/We are starting a new project and I want to get the team aligned/i)).toBeTruthy()
  })

  it('does not put the situation picker back', async () => {
    // The picker renders when the history has exactly one turn - the signature
    // of the intro having overwritten everything.
    renderPage()
    await waitFor(() => expect(screen.getByText(/Got it, a new project/i)).toBeTruthy())
    expect(screen.queryByText(/situations, grouped/i)).toBeNull()
  })

  it('leaves a way to carry on answering', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/Got it, a new project/i)).toBeTruthy())
    expect(screen.getByPlaceholderText(/Type your response/i)).toBeTruthy()
  })
})
