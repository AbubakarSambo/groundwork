import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { authApi } from '@/api/auth'

/**
 * FAULT 2: ONE MONTH, WEEKLY (walk item 2; section 20).
 *
 * `HELP_TEAM_UNDERSTAND` is the anchor's own situation key and carries no entry in
 * `SCENARIO_FACTS` (scenario-catalog.ts says so deliberately - it is not a picker card). Before
 * this fix the save card's schedule lookup found nothing for it, so the cadence stayed the
 * component's bare `useState('FORTNIGHTLY')` default and no end date was ever computed - the
 * saved check-in committed with cadence every 2 weeks and `lastCheckInBy` empty (`ends_at: null`
 * once the server built it). Section 20 asks for a weekly cadence over one month for the anchor.
 *
 * This seeds an anchor draft with words already in history (so the save card, not a fresh first
 * check-in, is what renders - the same seeding EntryChatPage.cadenceNotChosen.spec.tsx uses), and
 * checks what the save actually commits: cadence 'WEEKLY' and a lastCheckInBy one calendar month
 * after the start date. The lead can still change either from the schedule section; this only
 * fixes what goes out the door if they do not.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-anchor-1' }) },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function seedAnchorDraft() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'HELP_TEAM_UNDERSTAND',
    closed: true,
    flowPath: 'lead',
    onboardingStep: 7,
    history: [
      { role: 'user', content: 'Nobody on my team sees how the renewals land.' },
      { role: 'assistant', content: 'Noted.' },
    ],
    lead: { email: 'lead@x.test', name: 'Lead' },
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  }))
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("the anchor's schedule default is one month, weekly", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('shows the weekly rhythm on the save card, not every 2 weeks', async () => {
    seedAnchorDraft()
    renderPage()
    await screen.findByPlaceholderText(/your@email/i, {}, { timeout: 4000 })
    /*
     * SCREEN FAULT 3 (live walk, 6 October 2026): THE WEEKLY DEFAULT IS NOW A CHOSEN ONE, NOT AN
     * UNCONFIRMED GUESS. Before this fix the schedule showed "Not set yet. This will run every
     * week unless you pick one." - true to what was actually sent (cadence WEEKLY,
     * cadenceChosen false, which the server reads as nobody having picked anything and falls back
     * to its own FORTNIGHTLY default). Now the anchor's weekly rhythm is sent as a real choice, so
     * the screen shows it the same way: "Every week" selected, no "not set yet" warning.
     */
    await waitFor(() => expect(screen.getByRole('button', { name: 'Every week' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.queryByText(/not set yet/i)).toBeNull()
  })

  it('commits cadence WEEKLY and an end date one month after the start', async () => {
    seedAnchorDraft()
    renderPage()
    const emailField = await screen.findByPlaceholderText(/your@email/i, {}, { timeout: 4000 })
    fireEvent.change(emailField, { target: { value: 'lead@x.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Start my Groundwork\.$/i }))

    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    const payload = (authApi.entrySave as any).mock.calls[0][1].payload
    expect(payload.cadence).toBe('WEEKLY')
    /*
     * SCREEN FAULT 3 (live walk, 6 October 2026): `cadence` alone is not enough. The server
     * (entry.service.ts) only honours a cadence when `cadenceChosen === true`; unmarked, it reads
     * as nobody having picked one and falls back to its own default (FORTNIGHTLY) regardless of
     * what this screen showed or sent. The anchor's weekly default has to be sent as a choice.
     */
    expect(payload.cadenceChosen).toBe(true)
    expect(payload.lastCheckInBy).toBeTruthy()

    const start = payload.checkInBy ? new Date(`${payload.checkInBy}T00:00:00`) : new Date()
    const expectedEnd = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
    const expected = `${expectedEnd.getFullYear()}-${String(expectedEnd.getMonth() + 1).padStart(2, '0')}-${String(expectedEnd.getDate()).padStart(2, '0')}`
    expect(payload.lastCheckInBy).toBe(expected)
  })
})

describe('screen fault 2 (live walk, 6 October 2026): the name is the served sentence, nothing left to name', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('commits the served groundLabel, not the aim or the organisation fallback', async () => {
    seedAnchorDraft()
    renderPage()
    const emailField = await screen.findByPlaceholderText(/your@email/i, {}, { timeout: 4000 })
    fireEvent.change(emailField, { target: { value: 'lead@x.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Start my Groundwork\.$/i }))

    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    const payload = (authApi.entrySave as any).mock.calls[0][1].payload
    expect(payload.groundLabel).toBe('Help my team understand')
  })

  it('never shows "Name this situation" or "Still to set", after the email is sent', async () => {
    seedAnchorDraft()
    renderPage()
    const emailField = await screen.findByPlaceholderText(/your@email/i, {}, { timeout: 4000 })
    fireEvent.change(emailField, { target: { value: 'lead@x.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Start my Groundwork\.$/i }))

    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    expect(screen.queryByText('Name this situation')).toBeNull()
    expect(screen.queryByText(/Still to set/i)).toBeNull()
  })
})
