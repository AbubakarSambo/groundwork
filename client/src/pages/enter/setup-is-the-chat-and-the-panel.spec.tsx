import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * SETUP IS THE CHAT AND THE PANEL BESIDE IT (Hafsah, 22 November 2026, setting up a check-in on live: "one giant setup page that goes
 * forever"). After her setup chat one pop-up opened by itself and held a session-1 header, every schedule control, three paragraphs
 * about people, a tick-list with its own Add, an invite link, "What happens next", "Save this" and her whole first report; under the
 * chat sat a second way to save. She typed "weekly updates on bills from Abubakar Sambo abu@x.test and my national assembly team,
 * Mondays from 4pm". As she reads it now, for each reader: the panel (new.txt) names what is set, each with Change, and ends with one
 * button; Change opens the setup page (setup.txt); nothing opens by itself and the report is never part of setup.
 */
const state: { user: any } = { user: { id: 'u-hafsah', email: 'hafsah@example.test', firstName: 'Hafsah', organization: { name: 'Groundwork' } } }
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn().mockResolvedValue(null),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), onboard: vi.fn(), classifyIntent: vi.fn(), chat: vi.fn(),
    report: vi.fn(),
    theDates: vi.fn().mockResolvedValue({ days: ['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21'], count: 6 }),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 't' }), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn(), situationsOffered: vi.fn().mockResolvedValue({}) } }))
import { entryApi } from '@/api/entry'
import { authApi } from '@/api/auth'

const SAID = 'weekly updates on bills from Abubakar Sambo abu@x.test and my national assembly team, Mondays from 4pm'

/* What the one reading of her conversation holds (api what-setup-knows.ts): one person with his own email; the group is not a person. */
function seedHerSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: '', closed: false, onboardingStep: 2, history: [], cadence: 'WEEKLY', cadenceChosen: true,
    schedule: { cadenceAnchorDay: 1 },
    onboardingSelections: {
      mode: 'new', initial: SAID, classifiedScenario: 'TEAM_UPDATES_ONGOING', kindName: 'Get updates from your team',
      name: 'Bill updates from Abubakar', peopleNamed: ['Abubakar Sambo'], peopleEmails: { 'Abubakar Sambo': 'abu@x.test' }, cadenceAnchorDay: 1,
    },
    onboardingHistory: [
      { role: 'user', content: SAID },
      { role: 'assistant', content: 'So you want a weekly read on the bills from Abubakar. Is that right?' },
    ],
  }))
}
const renderIt = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
  </QueryClientProvider>,
)

describe('a signed-in lead, after her setup chat', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state.user = { id: 'u-hafsah', email: 'hafsah@example.test', firstName: 'Hafsah', organization: { name: 'Groundwork' } } })

  it('reads the panel, not a pop-up: the name from the chat, one person with his own email, and one button', async () => {
    seedHerSetup()
    renderIt()
    const panel = await screen.findByRole('complementary', { name: 'What is set so far' })
    expect(within(panel).getAllByText('Bill updates from Abubakar').length).toBeGreaterThan(0)
    expect(within(panel).getByText('Invited so far')).toBeTruthy()
    await waitFor(() => expect(within(panel).getByText(/Abubakar Sambo.*abu@x\.test/)).toBeTruthy())
    expect(panel.textContent).not.toContain('national assembly')
    expect(within(panel).getAllByRole('button', { name: /^Change/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Send 1 invitation' })).toBeTruthy()
    /* Nothing of the old pop-up, and no second way to end setup. */
    for (const gone of ['This is check-in 1', 'This will be check-in 1', 'What happens next', 'Save this', 'Start over instead', 'What you told me', 'Find a colleague', 'Copy link']) {
      expect(document.body.textContent).not.toContain(gone)
    }
    expect(document.querySelector('.gwui-ec-savecard-overlay')).toBeNull()
    expect(screen.queryByRole('button', { name: 'End check-in' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('saves on one press, with the name, the kind and the Monday from the one reading, and Abubakar on his own address', async () => {
    seedHerSetup()
    renderIt()
    fireEvent.click(await screen.findByRole('button', { name: 'Send 1 invitation' }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.groundLabel).toBe('Bill updates from Abubakar')
    expect(payload.scenario).toBe('TEAM_UPDATES_ONGOING')
    expect(payload.scenario).not.toBe('new')
    expect(payload.cadence).toBe('WEEKLY')
    expect(payload.cadenceAnchorDay).toBe(1)
    expect(payload.contributors).toEqual([expect.objectContaining({ email: 'abu@x.test', displayName: 'Abubakar Sambo' })])
    /* The record is what she said, so the server makes her first report from it: the page sends no report of its own. */
    expect(payload.history.some((t: any) => t.role === 'user' && t.content === SAID)).toBe(true)
    expect(payload.reportSummary).toBeUndefined()
    expect(entryApi.report).not.toHaveBeenCalled()
  })

  it('Change opens the setup page in place of the chat, in setup.txt’s words, with the dates the server gives', async () => {
    seedHerSetup()
    renderIt()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0])
    expect(await screen.findByText('Set up from your conversation. Change anything before it starts; after, changes apply from the next check-in.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Bill updates from Abubakar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New check-in' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Start it and invite 1 person' })).toBeTruthy()
    for (const block of ['When it starts', 'How often', 'When it ends', 'Who’s in it']) expect(screen.getByRole('region', { name: block })).toBeTruthy()
    expect(await screen.findByText('Check-ins open on Mon 23 November, Mon 30, Mon 7 December, Mon 14, Mon 21 and on from there, 6 check-ins in all.')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Mon' })).toHaveAttribute('aria-checked', 'true')
    /* No pop-up, no report, no tick-list with its own Add. */
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.textContent).not.toContain('What you told me')
    expect(screen.queryAllByRole('checkbox')).toEqual([])
    /* Back to the conversation from the breadcrumb. */
    fireEvent.click(screen.getByRole('button', { name: 'New check-in' }))
    expect(await screen.findByRole('complementary', { name: 'What is set so far' })).toBeTruthy()
  })

  it('whatever is typed in the box on the setup page goes with the start, nothing lost', async () => {
    seedHerSetup()
    renderIt()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0])
    fireEvent.change(await screen.findByLabelText('Your team, one per line'), { target: { value: 'Grace Achieng, grace@x.test' } })
    fireEvent.click(await screen.findByRole('button', { name: /^Start it and invite/ }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const emails = (vi.mocked(entryApi.commit).mock.calls[0][0] as any).contributors.map((c: any) => c.email).sort()
    expect(emails).toEqual(['abu@x.test', 'grace@x.test'])
  })

  it('somebody named with no email is one line in the panel, and is not a person invited', async () => {
    seedHerSetup()
    const kept = JSON.parse(localStorage.getItem('gw_entry_session')!)
    kept.onboardingSelections.peopleNamed = ['Abubakar Sambo', 'Omar']
    localStorage.setItem('gw_entry_session', JSON.stringify(kept))
    renderIt()
    expect(await screen.findByText('1 more you mentioned: Omar. Add their email in the chat.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send 1 invitation' })).toBeTruthy()
  })
})

describe('somebody not signed in, after the setup chat', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state.user = null })

  it('reads start-chat.txt’s one block where the panel ends: an email and Save it, and nothing that sends', async () => {
    seedHerSetup()
    renderIt()
    expect(await screen.findByText('Keep this conversation')).toBeTruthy()
    expect(screen.getByText('You’re not signed in, so it lives only in this tab. Add your email and it’s saved as you go, and you can come back to it from any device.')).toBeTruthy()
    expect(screen.getByText('No password. We send a link when you want to come back.')).toBeTruthy()
    expect(screen.getByPlaceholderText('you@company.com')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Send \d|^Send 1/ })).toBeNull()
    expect(screen.queryByPlaceholderText('Organisation name (optional)')).toBeNull()
    /* "You mentioned" is drawn for her too: the panel lists the team from the conversation whoever reads it. */
    await waitFor(() => expect(screen.getAllByText(/Abubakar Sambo.*abu@x\.test/).length).toBeGreaterThan(0))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Hafsah Jumare' } })
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'hafsah@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }))
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(1))
    const [, draft] = vi.mocked(authApi.entrySave).mock.calls[0] as any
    expect(draft.payload.contributors.map((c: any) => c.email)).toEqual(['abu@x.test'])
    expect(await screen.findByText('Check your email')).toBeTruthy()
  })
})
