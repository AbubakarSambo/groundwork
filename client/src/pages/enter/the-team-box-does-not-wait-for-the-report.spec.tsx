import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'

/**
 * THE TEAM BOX AND SAVE DO NOT WAIT FOR THE REPORT (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost").
 *
 * Round 5: the save card's team box and its Save button appeared only once the report had been written, about thirty-five seconds
 * after the setup ended, under "Finding what is still open...". Impatient leads left before then. The field programme lead was told
 * "Your board is ready. You can add your team below.", pressed End session, was sent to Today, and typed his four field officers again
 * on People. Now End session ends the setup where it is and opens the save card, the team box and Save are there at once with everybody
 * named in it, the report fills in when it is ready, and a save made before then is not held for it.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    /* The report is still being written, the whole time. */
    report: vi.fn(() => new Promise(() => {})),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-ama', email: 'ama@field.test', firstName: 'Ama' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))

const NAMED = ['Kwame Owusu', 'Akua Boateng', 'Kofi Nkrumah', 'Adwoa Agyemang']
const PHONES: Record<string, string> = { 'Kwame Owusu': '024 123 3613', 'Akua Boateng': '055 789 3710', 'Kofi Nkrumah': '020 987 3807', 'Adwoa Agyemang': '054 321 3904' }
const emailOf = (n: string) => `${n.split(' ')[0].toLowerCase()}@field.test`

/** The field lead's setup, part way, as he left it: still talking, with his team and their numbers said. */
function seedTheFieldLeadsSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: '', closed: false, onboardingStep: 2, history: [],
    onboardingSelections: { mode: 'new', initial: 'Track our farmer training.', peopleNamed: NAMED, peoplePhones: PHONES },
    onboardingHistory: [
      { role: 'assistant', content: 'Who is on the team delivering the training?' },
      { role: 'user', content: 'Kwame Owusu 024 123 3613, Akua Boateng 055 789 3710, Kofi Nkrumah 020 987 3807, Adwoa Agyemang 054 321 3904. Now set up the board.' },
      { role: 'assistant', content: 'Your board is ready. You can add your team below.' },
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

describe('the field lead presses End session while the setup is still talking', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('opens the save card with his four people in the team box and Save ready, while the report is still being written', async () => {
    seedTheFieldLeadsSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))

    const box = (await screen.findByLabelText('Your team, one per line')) as HTMLTextAreaElement
    expect(box.value.split('\n')).toEqual(NAMED.map((n) => `${n}, ${PHONES[n]}`))
    expect(screen.getByRole('status').textContent).toMatch(/\S/)
    const save = screen.getByRole('button', { name: 'Save this' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
  })

  it('keeps the ended setup at once, so leaving before the report comes back to it', async () => {
    seedTheFieldLeadsSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    await screen.findByLabelText('Your team, one per line')

    const kept = JSON.parse(localStorage.getItem('gw_entry_session')!)
    expect(kept.closed).toBe(true)
    expect(kept.history.filter((t: any) => t.role === 'user').map((t: any) => t.content)).toEqual([expect.stringContaining('Kwame Owusu 024 123 3613')])
  })

  it('saves at once with the team and their numbers, without waiting for the report', async () => {
    seedTheFieldLeadsSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    await screen.findByLabelText('Your team, one per line')
    addThroughTheTeamBox(NAMED.map((n) => `${n}, ${emailOf(n)}, ${PHONES[n]}`).join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    const { entryApi } = await import('@/api/entry')
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors).toHaveLength(4)
    for (const n of NAMED) expect(payload.contributors).toContainEqual({ email: emailOf(n), displayName: n, phone: PHONES[n] })
    /* No report was read yet, so none is sent: the server makes it from the same conversation. */
    expect(payload.reportSummary).toBeUndefined()
    expect(payload.history.length).toBeGreaterThan(0)
  })
})
