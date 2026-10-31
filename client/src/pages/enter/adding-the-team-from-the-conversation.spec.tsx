import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'

/**
 * HOW FAST A LEAD GETS HER WHOLE TEAM IN (Hafsah, 31 October 2026: "Make adding a team the top pattern ... Judge it by how fast a lead
 * can get their whole team in, with phone numbers, without repeating themselves.").
 *
 * Round 3's founder named his four people with their phone numbers in the setup conversation, and then typed them three more times.
 * Here a lead who named four people with their numbers finds them already in the team box, one per line, with their numbers. She
 * types four emails, presses "Add everyone" once, and saves: all four are on the check-in with their names, and each number goes to
 * its person. Nobody is asked "What do they do", and nobody is typed twice.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-founder', email: 'founder@startup.test' }, isAuthenticated: true }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: {
  get: vi.fn(async () => ({ participants: ['amina', 'brian', 'chege', 'dorcas'].map((n) => ({ id: `p-${n}`, email: `${n}@startup.test` })) })),
  addTheirWhatsAppNumber: vi.fn(async () => ({ said: 'kept' })),
} }))

const NAMED = ['Amina Odhiambo', 'Brian Kiprop', 'Chege Mwangi', 'Dorcas Wanjiru']
const PHONES: Record<string, string> = {
  'Amina Odhiambo': '+254 711 000 001', 'Brian Kiprop': '+254 711 000 002', 'Chege Mwangi': '+254 711 000 003', 'Dorcas Wanjiru': '+254 711 000 004',
}

function seedTheFoundersSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: true, onboardingStep: 7,
    history: [{ role: 'assistant', content: 'Who is on the team?' }, { role: 'user', content: 'Amina, Brian, Chege and Dorcas, with their numbers.' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    groundName: 'Startup team',
    onboardingSelections: { mode: 'new', initial: 'Our startup team.', peopleNamed: NAMED, peoplePhones: PHONES },
  }))
}

describe('a lead who named four people with their numbers in the conversation', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('finds them in the team box with their numbers, adds four emails, presses once, and all four are on the check-in with their numbers', async () => {
    seedTheFoundersSetup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByText(/Invite and finish/))

    /* The box is open, and already holds all four, one per line, with the number each one gave. */
    const box = (await screen.findByLabelText('Your team, one per line')) as HTMLTextAreaElement
    expect(box.value.split('\n')).toEqual(NAMED.map((n) => `${n}, ${PHONES[n]}`))

    /* She types only the four emails, one on each line, and presses once. */
    const withEmails = NAMED.map((n) => `${n}, ${n.split(' ')[0].toLowerCase()}@startup.test, ${PHONES[n]}`).join('\n')
    addThroughTheTeamBox(withEmails)
    await waitFor(() => expect(screen.getByText(/Dorcas Wanjiru \(dorcas@startup\.test\)/)).toBeTruthy())
    expect(screen.queryByText(/What do you want them to focus on or cover\?|What do they do/)).toBeNull()
    /* Nobody is left in the box to type again. */
    expect(box.value).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    const { entryApi } = await import('@/api/entry')
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    for (const n of NAMED) {
      expect(payload.contributors).toContainEqual(expect.objectContaining({ email: `${n.split(' ')[0].toLowerCase()}@startup.test`, displayName: n }))
    }
    expect(payload.contributors).toHaveLength(4)

    /* Each number goes to its person, through the one writer for a lead's number, once the check-in is saved. */
    const { groundsApi } = await import('@/api/grounds')
    await waitFor(() => expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledTimes(4))
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g-created', 'p-amina', '+254 711 000 001')
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g-created', 'p-dorcas', '+254 711 000 004')
  })

  it('a line still missing an email stays in the box, said once, and the others go on', async () => {
    seedTheFoundersSetup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByText(/Invite and finish/))
    await screen.findByLabelText('Your team, one per line')
    addThroughTheTeamBox(`Amina Odhiambo, amina@startup.test, ${PHONES['Amina Odhiambo']}\nBrian Kiprop, ${PHONES['Brian Kiprop']}`)
    await waitFor(() => expect(screen.getByText(/Amina Odhiambo \(amina@startup\.test\)/)).toBeTruthy())
    expect(screen.getByText('Add an email for Brian Kiprop, then press Add everyone again.')).toBeTruthy()
    expect((screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement).value).toBe(`Brian Kiprop, ${PHONES['Brian Kiprop']}`)
  })
})
