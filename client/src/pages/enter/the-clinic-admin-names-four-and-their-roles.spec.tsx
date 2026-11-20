import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { toast } from 'sonner'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'

/**
 * ROUND 7, THE CLINIC ADMIN (1 November 2026). She added three clinic managers on People, then in setup named them and Emeka Nnamdi,
 * the operations lead, and said what each does. She wrote her three managers' full lines over the box, so Emeka's line went and the
 * save invited three; and after saving each person read "Nobody has described it yet" until she set every role by hand.
 *
 * Now a save that would leave out somebody she named says who and saves nothing, once; and what she said each person does goes with
 * them into the check-in, from the setup's reading (peopleRoles).
 */
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), warning: vi.fn(), success: vi.fn() } }))
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
vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(),
    colleagues: vi.fn().mockResolvedValue([
      { id: 'c-aisha', name: 'Aisha Musa', role: 'LEAD', team: null },
      { id: 'c-chinedu', name: 'Chinedu Obi', role: 'LEAD', team: null },
      { id: 'c-fatima', name: 'Fatima Bello', role: 'LEAD', team: null },
    ]),
  },
}))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-ngozi', email: 'ngozi@clinic.test', firstName: 'Ngozi' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

const NAMED = ['Aisha Musa', 'Chinedu Obi', 'Fatima Bello', 'Emeka Nnamdi']
const ROLES = { 'Aisha Musa': 'clinic manager, runs check-in at her clinic', 'Chinedu Obi': 'clinic manager, runs check-in at his clinic', 'Fatima Bello': 'clinic manager, runs check-in at her clinic', 'Emeka Nnamdi': 'operations lead' }

function seedHerSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: false, onboardingStep: 3, history: [],
    onboardingSelections: { mode: 'new', initial: 'Patients wait too long at check-in.', peopleNamed: NAMED, peopleRoles: ROLES },
    onboardingHistory: [
      { role: 'assistant', content: 'Who is on your team, and what part does each person play?' },
      { role: 'user', content: 'Aisha Musa, Chinedu Obi, and Fatima Bello are the clinic managers. They are responsible for check-in at their clinics. Emeka Nnamdi is the operations lead.' },
    ],
  }))
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the clinic admin saves her setup', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  /* Changed in the team-skip hotfix (live pilot): the first press used to say she named him and save nothing, and only a second press saved.
     It is one press now, and the same sentence is said after it, in the same words as for anybody with no email. */
  it('with Emeka written over, one press saves the three and says he is not on the check-in yet', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End check-in' }))
    await screen.findByLabelText('Your team, one per line')
    addThroughTheTeamBox(['Aisha Musa, aisha@clinic.test', 'Chinedu Obi, chinedu@clinic.test', 'Fatima Bello, fatima@clinic.test'].join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    expect(toast.info).toHaveBeenCalledWith('Emeka Nnamdi is not on the check-in yet, because there is no email for them. Add them under People when you have their emails.', expect.anything())
    expect(screen.queryByText(/This was not saved/)).toBeNull()
  })

  it('what she said each person does goes with them into the check-in', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End check-in' }))
    await screen.findByLabelText('Your team, one per line')
    addThroughTheTeamBox(['Aisha Musa', 'Chinedu Obi', 'Fatima Bello', 'Emeka Nnamdi, emeka@clinic.test'].join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-aisha', context: ROLES['Aisha Musa'] }))
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-chinedu', context: ROLES['Chinedu Obi'] }))
    expect(payload.contributors).toContainEqual(expect.objectContaining({ email: 'emeka@clinic.test', context: 'operations lead' }))
  })
})
