import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * A DEFAULT MUST NOT LOOK LIKE A DECISION.
 *
 * The cadence picker showed "Every 2 weeks" already selected - blue border, blue
 * fill, exactly as it looks once you pick it - whether or not anybody had ever
 * mentioned a rhythm. `cadence` was a useState default and nothing distinguished
 * "they chose this" from "nobody said".
 *
 * That one value decides the size of the whole ground: ninety days weekly is
 * twelve check-ins, fortnightly is six. And the setup conversation can finish
 * without ever asking, because the extraction prompt is correctly told never to
 * guess a cadence - so the common path is that nobody says anything, a default
 * is applied, and the screen presents it as a settled choice.
 *
 * Seen live: a ground scripted as "90 days, weekly" came out fortnightly with
 * half the sessions, and the picker showed fortnightly selected as though that
 * had been asked for.
 *
 * The ground still gets the same default if they say nothing. What changes is
 * that the screen stops claiming they chose it.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-1' }) },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/**
 * The setup panel only appears once the ground has been saved, and `emailSent`
 * is not restored from storage - so the save is driven for real rather than
 * seeded, which is closer to what the person does anyway.
 */
function seedSaved() {
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

async function saveTheGround() {
  const emailBox = await screen.findByPlaceholderText(/your@email/i, {}, { timeout: 4000 })
  fireEvent.change(emailBox, { target: { value: 'sahar@x.test' } })
  fireEvent.click(screen.getByRole('button', { name: /Save my ground/i }))
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

describe('the cadence nobody picked', () => {
  beforeEach(() => { localStorage.clear() })

  it('says the rhythm is not set yet, rather than showing a silent default', async () => {
    seedSaved()
    renderPage()
    await saveTheGround()
    // THE REGRESSION: this read as a settled choice with nothing to indicate
    // otherwise.
    await waitFor(() => expect(screen.getByText(/Not set yet/i)).toBeTruthy())
    expect(screen.getByText(/run every 2 weeks unless you pick/i)).toBeTruthy()
  })

  it('stops saying so once the person picks one', async () => {
    seedSaved()
    renderPage()
    await saveTheGround()
    await waitFor(() => expect(screen.getByText(/Not set yet/i)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /^Weekly$/i }))

    await waitFor(() => expect(screen.queryByText(/Not set yet/i)).toBeNull())
  })

  it('still offers every rhythm, including the default one', async () => {
    // The point is the claim, not the options - nothing here should make a
    // cadence harder to choose.
    seedSaved()
    renderPage()
    await saveTheGround()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Weekly$/i })).toBeTruthy())
    for (const label of ['One time', 'Daily', 'Weekly', 'Every 2 weeks', 'Monthly']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeTruthy()
    }
  })
})
