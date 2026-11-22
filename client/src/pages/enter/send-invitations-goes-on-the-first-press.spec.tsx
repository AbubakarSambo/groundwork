import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * STAGING CHECK S10 (4 November 2026). Stella named her two reps by first name in setup, "9 from Rita and 5 from Remy", and gave their
 * emails. The page wrote "Rita, rita@…" and "Remy, remy@…" into the team's lines. The one team reader keeps a name beside an address
 * only when it is two words or more, so both lines came back with no name, Rita and Remy read as left out, and the first press of
 * "Send 2 invitations" saved nothing (its sentence sat below the fold). The second press went. Now the first press saves.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn().mockResolvedValue(null),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), onboard: vi.fn(), classifyIntent: vi.fn(), chat: vi.fn(),
    report: vi.fn(() => new Promise(() => {})),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-stella', email: 'stella@example.test', firstName: 'Stella' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

function seedHerSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'PULSE_CHECK', closed: false, onboardingStep: 3, history: [],
    onboardingSelections: {
      mode: 'new', initial: 'I want updates from my sales team.', peopleNamed: ['Rita', 'Remy'],
      peopleEmails: { Rita: 'rita@example.test', Remy: 'remy@example.test' },
    },
    onboardingHistory: [
      { role: 'assistant', content: 'Who is on the team?' },
      { role: 'user', content: 'Rita, rita@example.test, and Remy, remy@example.test.' },
    ],
  }))
}

describe('saving the setup, with the team named by first name only', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('saves on the first press, and invites both', async () => {
    seedHerSetup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    /* The panel holds the one save from the moment something is said: no End check-in first (22 November 2026). */
    fireEvent.click(await screen.findByRole('button', { name: 'Send 2 invitations' }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/but they are not in the box/)).toBeNull()
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors.map((c: any) => c.email).sort()).toEqual(['remy@example.test', 'rita@example.test'])
    /* And the invitations carry their names, as the lead said them. */
    expect(payload.contributors.map((c: any) => c.displayName).sort()).toEqual(['Remy', 'Rita'])
  })
})
