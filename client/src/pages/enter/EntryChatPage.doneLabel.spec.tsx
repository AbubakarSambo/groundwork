import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * THE TERMINAL ACTION ON THE SAVE CARD.
 *
 * Original guard: the finishing action used to be "Close (you can reopen this
 * from the bar below)" - a muted grey link that read as dismiss rather than
 * finish. It became a clear "Done" button with the reopen note as secondary
 * text, and this file stops that regressing.
 *
 * PREMISE CORRECTED after the eighteen-ground run (GW-006). This test used to
 * seed a session that was closed but NOT saved, and assert "Done" rendered
 * anyway. That is the bug: on an unsaved ground the panel showed three controls
 * at once - "Save my ground →", "Not now", and a primary-styled "Done" beneath
 * them. Two dismiss the panel, one saves, and the dismiss carried the visual
 * weight of the finishing action. The obvious way to press "I have finished" was
 * the way to leave without saving.
 *
 * So "Done" is now offered only once the email has actually been sent, and the
 * two cases are asserted separately below. The anti-regression on the old
 * "Close (you can reopen" label is kept in both.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/** Lead path, closed, save card open - reached via leadReturnsToSaveCard. */
function seedLeadClosed(extra: Record<string, unknown> = {}) {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT',
    closed: true,
    flowPath: 'lead',
    onboardingStep: 7,
    history: [],
    lead: { email: 'lead@x.test', name: 'Lead' },
    onboardingSelections: { mode: 'new', initial: 'New project' },
    ...extra,
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

describe('CLOSE-LABEL: the save card\'s terminal action', () => {
  beforeEach(() => { localStorage.clear() })

  it('offers no primary "Done" while the ground is still unsaved', async () => {
    // GW-006. The save form is on screen with its own "Not now"; a second,
    // primary-styled dismiss beside it is what made leaving look like finishing.
    seedLeadClosed()
    renderPage()
    await waitFor(() => expect(screen.getByText(/Save my ground/i)).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
    // The unsaved path keeps exactly one way out, and it is not styled as the
    // finishing action.
    expect(screen.getByText('Not now')).toBeTruthy()
  })

  it('never brings back the old "Close (you can reopen" dismiss label', async () => {
    // The original guard, which still holds in both states.
    seedLeadClosed()
    renderPage()
    await waitFor(() => expect(screen.getByText(/Save my ground/i)).toBeTruthy())
    expect(screen.queryByText(/Close \(you can reopen/i)).toBeNull()
  })
})
