import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * ROUND 6, THE LAW FIRM LEAD (1 November 2026, rated it 1).
 *
 * 1. She asked eleven times to add her team while she talked, and the side panel only said "You mentioned ...". The panel's "Who’s in it"
 *    now holds the one team box (the prototype's "Let Daniel share his side / His email, once you’re ready", start-chat.txt), filled with
 *    everybody named, the same lines the save card takes.
 * 2. "The save button did not work and there was no message to say why." A press that does not save says why, beside the button.
 * 3. She corrected the setup's report ("Esther is my finance officer in charge of billing") and the next screen still had it wrong. A
 *    correction on the card goes into the setup's conversation, so it is saved with it, and a report made before it is not sent: the
 *    server makes the report from the whole conversation.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn().mockResolvedValue(null),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), onboard: vi.fn(), classifyIntent: vi.fn(),
    chat: vi.fn().mockResolvedValue({ reply: 'Thank you. Esther is your finance officer and is in charge of billing.', sessionComplete: false }),
    report: vi.fn().mockResolvedValue({ report: { alignmentStatus: 'Clear', whatGroundworkSaw: 'Joseph handles billing.', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] } }),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-amina', email: 'amina@law.test', firstName: 'Amina' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

const NAMED = ['David Ochieng', 'Fatima Kariuki', 'Joseph Muthama', 'Esther Wanjiru']

function seedHerSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: false, onboardingStep: 3, history: [],
    onboardingSelections: { mode: 'new', initial: 'The firm is drowning in paperwork.', peopleNamed: NAMED },
    onboardingHistory: [
      { role: 'assistant', content: 'What do you want your team to check in about?' },
      { role: 'user', content: 'The firm is drowning in paperwork.' },
      { role: 'assistant', content: 'Who is involved?' },
      { role: 'user', content: 'My team is David Ochieng, Fatima Kariuki, Joseph Muthama and Esther Wanjiru. They have the details. Let me add them.' },
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

describe('the law firm lead, while she is still talking', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('finds her four people in the team box beside the conversation, and what she writes there is kept with the setup', async () => {
    seedHerSetup()
    open()
    const panel = (await screen.findByText('Who’s in it')).closest('aside') as HTMLElement
    expect(within(panel).getByText('Their emails, once you’re ready. You can add them now or at the end.')).toBeTruthy()
    const box = within(panel).getByLabelText('Your team, one per line') as HTMLTextAreaElement
    expect(box.value.split('\n')).toEqual(NAMED)

    const lines = NAMED.map((n) => `${n}, ${n.split(' ')[0].toLowerCase()}@law.test`).join('\n')
    fireEvent.change(box, { target: { value: lines } })
    expect(JSON.parse(localStorage.getItem('gw_entry_session')!).teamText).toBe(lines)
  })

  it('and once she ends the setup, the save card has the same lines in its box', async () => {
    seedHerSetup()
    open()
    const panel = (await screen.findByText('Who’s in it')).closest('aside') as HTMLElement
    const lines = NAMED.map((n) => `${n}, ${n.split(' ')[0].toLowerCase()}@law.test`).join('\n')
    fireEvent.change(within(panel).getByLabelText('Your team, one per line'), { target: { value: lines } })
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await waitFor(() => expect(screen.getAllByLabelText('Your team, one per line')).toHaveLength(1))
    expect((screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement).value).toBe(lines)
  })
})

describe('the law firm lead on the save card', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('is told beside Save why it did not save', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    await screen.findByLabelText('Your team, one per line')
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    const why = await screen.findByText('This was not saved. Add an email for David Ochieng, Fatima Kariuki, Joseph Muthama and Esther Wanjiru, or take them off the list.')
    expect(why.closest('.gwui-ec-savecard-section')?.textContent).toContain('Save this')
    expect(entryApi.commit).not.toHaveBeenCalled()
  })

  it('a correction she makes is saved with the setup, and the report made before it is not sent', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    fireEvent.click(await screen.findByText('This isn’t right, correct it'.replace('’', "'")))
    fireEvent.change(screen.getByPlaceholderText('e.g. The deadline is not May - it is March 1.'), { target: { value: 'Esther is my finance officer in charge of billing.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(entryApi.chat).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Your team, one per line'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    /* Her four are named and the box is empty: the first press says so (round 7), and the second saves without them, as she chose. */
    expect(await screen.findByText(/This was not saved\. You named David Ochieng, Fatima Kariuki, Joseph Muthama and Esther Wanjiru in the conversation, but they are not in the box\./)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.history.map((t: any) => t.content).join(' ')).toContain('Esther is my finance officer in charge of billing.')
    expect(payload.reportSummary).toBeUndefined()
  })
})

/*
 * ROUND 7: ON A PHONE (375 wide), WHILE SHE TALKS. The panel was hidden below 1000px, so a lead on a phone could not reach the team box
 * until setup ended. The same panel now sits at the top of the conversation where it does not fit beside it: one panel, one box.
 */
describe('the law firm lead on a phone, 375px wide, while she is still talking', () => {
  const wide = window.matchMedia
  beforeEach(() => {
    localStorage.clear(); vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    window.matchMedia = ((q: string) => ({ matches: /min-width:\s*(\d+)px/.test(q) ? 375 >= Number(q.match(/min-width:\s*(\d+)px/)![1]) : false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as any
  })
  afterEach(() => { window.matchMedia = wide })

  it('reaches the one team box in the conversation, filled with her four, and can type into it', async () => {
    seedHerSetup()
    open()
    const boxes = await screen.findAllByLabelText('Your team, one per line')
    expect(boxes).toHaveLength(1)
    const box = boxes[0] as HTMLTextAreaElement
    expect(box.closest('.gwui-ec-messages')).toBeTruthy()
    expect(document.querySelector('.gw-fills-in')).toBeNull()
    expect(box.value.split('\n')).toEqual(NAMED)
    expect(screen.getByText('Their emails, once you’re ready. You can add them now or at the end.')).toBeTruthy()

    const lines = NAMED.map((n) => `${n}, ${n.split(' ')[0].toLowerCase()}@law.test`).join('\n')
    fireEvent.change(box, { target: { value: lines } })
    expect(box.value).toBe(lines)
    expect(JSON.parse(localStorage.getItem('gw_entry_session')!).teamText).toBe(lines)
    /* The conversation goes on below it. */
    expect(screen.getByPlaceholderText('Type your response, or add a document.')).toBeTruthy()
  })
})
