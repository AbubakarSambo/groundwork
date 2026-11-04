import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage, THE_OPENING_QUESTION, whatWasSaid, withoutTheOpeningLine, SITUATION_CARDS } from './EntryChatPage'

/**
 * PAGE HELP IS NOT PART OF THE CONVERSATION (round 7, the field programme lead).
 *
 * The page's opening line carries a worked example ("procure 300 organic chickens from Kaduna by 31 March"). It sat in the setup's
 * history as the first assistant turn, was saved as the first session's record, and the save's readers took it as said: her goal and
 * her weekly report read "The team is aiming to procure 300 organic chickens from Kaduna by 31 March". The line stays on the page; the
 * history that leaves the page (to the model each turn, and as the record at the save) never carries it, nor a card's sentence.
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
  const state = { user: { id: 'u-akua', email: 'akua@field.test', firstName: 'Akua' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

const HER_SETUP = [
  { role: 'assistant', content: THE_OPENING_QUESTION },
  { role: 'user', content: 'Track farmer progress to report to our donor.' },
  { role: 'assistant', content: 'Who is on the team?' },
  { role: 'user', content: 'Kofi, Ama, Kwame and Adwoa.' },
]

describe('the page’s own lines', () => {
  it('are left out of what was said, and nothing the person typed is', () => {
    /* Changed in F5: the worked example is gone from the page altogether; the line is still left out of what was said. */
    expect(THE_OPENING_QUESTION).not.toMatch(/organic chickens|For example/)
    const said = whatWasSaid(HER_SETUP as any)
    expect(said.map((t) => t.content)).toEqual(['Track farmer progress to report to our donor.', 'Who is on the team?', 'Kofi, Ama, Kwame and Adwoa.'])
    expect(JSON.stringify(said)).not.toMatch(/chickens/)
  })

  it('a card’s sentence is page text in the record too', () => {
    const card = SITUATION_CARDS[0]
    const said = whatWasSaid([{ role: 'assistant', content: THE_OPENING_QUESTION }, { role: 'user', content: card.message }, { role: 'assistant', content: 'Who is on the team?' }] as any)
    expect(said.map((t) => t.content)).toEqual(['Who is on the team?'])
    /* The model is still told which card was clicked (withoutPickedOpener), so only the opening line goes from what it reads. */
    expect(withoutTheOpeningLine([{ role: 'assistant', content: THE_OPENING_QUESTION }, { role: 'user', content: card.message }] as any)).toHaveLength(1)
  })
})

describe('the field lead saves her setup', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('saves the conversation without the opening line or its example', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', closed: false, onboardingStep: 3, history: [],
      onboardingSelections: { mode: 'new', initial: 'Track farmer progress to report to our donor.' },
      onboardingHistory: HER_SETUP,
    }))
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    await screen.findByLabelText('Your team, one per line')
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(JSON.stringify(payload.history)).not.toMatch(/organic chickens|Describe it in your own words/)
    expect(payload.history[0]).toEqual({ role: 'user', content: 'Track farmer progress to report to our donor.' })
  })
})
