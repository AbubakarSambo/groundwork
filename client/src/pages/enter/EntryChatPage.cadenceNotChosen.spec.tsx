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
 * Seen live: a check-in scripted as "90 days, weekly" came out fortnightly with
 * half the sessions, and the picker showed fortnightly selected as though that
 * had been asked for.
 *
 * The check-in still gets the same default if they say nothing. What changes is
 * that the screen stops claiming they chose it.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(), theDates: vi.fn().mockResolvedValue({ days: [], count: null }), peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)) },
}))
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-1' }) },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

/**
 * U.6: the schedule used to appear only after the check-in was saved, so this spec drove the save.
 * It is set before saving now (TheSetup, from the prototype's setup.txt), so the spec reads it on
 * the save card directly. The rhythms are named as the prototype names them ("Every week", not
 * "Weekly"); what the spec holds - that an unchosen rhythm says so - is unchanged.
 */
/* Changed 22 November 2026: the schedule is on the setup page, opened by Change in the panel, not on a save card at the end. */
function seedSaved() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: false, onboardingStep: 2, history: [],
    onboardingSelections: { mode: 'new', initial: 'New project', peopleNamed: ['Ama'] },
    onboardingHistory: [
      { role: 'user', content: 'The launch is in six weeks and two of us disagree on scope.' },
      { role: 'assistant', content: 'So the launch is six weeks out and the scope is not agreed. Is that right?' },
    ],
  }))
}

async function saveTheGround() {
  fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }, { timeout: 4000 }))[0])
  await screen.findByText(/Set up from your conversation/)
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

    fireEvent.click(screen.getByRole('radio', { name: /^Every week$/i }))

    await waitFor(() => expect(screen.queryByText(/Not set yet/i)).toBeNull())
  })

  it('still offers every rhythm, including the default one', async () => {
    // The point is the claim, not the options - nothing here should make a
    // cadence harder to choose.
    seedSaved()
    renderPage()
    await saveTheGround()
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Every week$/i })).toBeTruthy())
    for (const label of ['Once', 'Every day', 'Every week', 'Every 2 weeks', 'Every month', 'When I choose']) {
      /* Setup page, piece 3a: the rhythms are the shared `Choices` now (the prototype's `.seg`), one radio each. */
      expect(screen.getByRole('radio', { name: new RegExp(`^${label}$`, 'i') })).toBeTruthy()
    }
  })
})
