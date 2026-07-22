import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * Close-label guard: after a completed check-in with the save card open, the
 * terminal action used to read "Close (you can reopen this from the bar
 * below)" - a muted grey link that reads as dismiss, not finish. It is now a
 * clear "Done" completion button, with the reopen note kept as secondary
 * text. Revert -> "Close (you can reopen" comes back and "Done" is gone ->
 * this bites.
 *
 * Reaches the save card via the lead-path restore (flowPath:'lead' + closed
 * -> leadReturnsToSaveCard -> showSave=true) so the terminal action renders
 * without driving the whole flow.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function seedLeadClosed() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT',
    closed: true,
    flowPath: 'lead',
    onboardingStep: 7,
    history: [],
    lead: { email: 'lead@x.test', name: 'Lead' },
    onboardingSelections: { mode: 'new', initial: 'New project' },
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

describe('CLOSE-LABEL: finished save card shows a "Done" completion action', () => {
  beforeEach(() => { localStorage.clear(); seedLeadClosed() })

  it('renders "Done" and not the old "Close (you can reopen" dismiss label', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy())
    expect(screen.queryByText(/Close \(you can reopen/i)).toBeNull()
    // reopen reassurance kept, but as secondary text (not the action label)
    expect(screen.getByText(/reopen this any time from the bar below/i)).toBeTruthy()
  })
})
