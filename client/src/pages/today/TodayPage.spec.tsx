import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { whenItComes } from './when-it-comes'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * TODAY (C1, #/today), AS EACH READER READS IT. The page shows what the server's read gives this
 * reader (GET /today, see api/src/modules/grounds/what-needs-you.spec.ts for what each reader is
 * given). Wording from today-lead.txt, today-admin.txt and today-participant-with-groundwork-message.txt.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn() } }))
import { todayApi } from '@/api/today'

const MORNING = new Date(2026, 8, 23, 9, 0)
const tomorrowAt4 = new Date(2026, 8, 24, 16, 0).toISOString()
const friday = new Date(2026, 8, 25, 9, 0).toISOString()

const LEAD_READ = {
  count: 3,
  line: 'In Sales team, Q3, 5 of 6 have checked in for session 38; Omar hasn’t yet.',
  needs: [
    { key: 'turn-f', kind: 'decide', title: 'Your first check-in for Faith, first 90 days', detail: 'About two minutes. Everyone else’s answers are read against yours.', action: { label: 'Start it', to: '/checkin/f1' }, groundId: 'f', organizationId: 'o' },
    { key: 'end-k', kind: 'decide', title: 'Decide how Kwame, first 90 days ends', detail: 'The last session is done.', action: { label: 'Decide', to: '/grounds/k' }, groundId: 'k', organizationId: 'o' },
    { key: 'turn-l', kind: 'decide', title: 'Your own check-in for Leadership, Q3', detail: 'About two minutes.', action: { label: 'Start it', to: '/checkin/l2' }, groundId: 'l', organizationId: 'o' },
  ],
  comingUp: [
    { at: tomorrowAt4, what: 'Session 39 of Sales team, Q3 opens.', to: '/grounds/s' },
    { at: friday, what: 'Kwame, first 90 days ends.', to: '/grounds/k' },
  ],
}

const PARTICIPANT_READ = {
  count: 2,
  line: 'Your check-in for Sales team, Q3 is open.',
  needs: [
    { key: 'report-s', kind: 'ready', title: 'The report for Sales team, Q3 is ready', detail: 'Three deals moved stage.', action: { label: 'Read it', to: '/grounds/s/report' }, groundId: 's', organizationId: 'o' },
    { key: 'own-s', kind: 'ready', title: 'Your own report for Sales team, Q3', detail: 'Only you see it.', action: { label: 'Read it', to: '/checkin/c4/report' }, groundId: 's', organizationId: 'o' },
  ],
  comingUp: [],
}

const NEW_ORG = { people: 1, admins: 1, checkIns: 0, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: false }

function open(user: any, read: any, rollout: any = NEW_ORG, path = '/today') {
  ;(todayApi.get as any).mockResolvedValue(read)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: rollout } as any)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><TodayPage /></MemoryRouter></QueryClientProvider>)
}

const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Nyali Foods', organization: { name: 'Nyali Foods' } }

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MORNING)
})
afterEach(() => { vi.useRealTimers() })

/* Rebuilt from the shared parts (group 2): the row is now the shared `EdgeRow` (`gwui-edge-row`,
   `gwui-edge-h`, `gwui-edge-s`), in place of the old `NeedsYouRow` (`gw-need`, `gw-need-h`, `gw-need-s`) -
   the same shape, one shared part used by every list of things that need a reader. */
const rows = () => [...document.querySelectorAll('.gwui-edge-row')].map(li => ({
  title: li.querySelector('.gwui-edge-h')?.textContent,
  detail: li.querySelector('.gwui-edge-s')?.textContent ?? null,
  action: [...li.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')]),
}))

describe('Today, as the lead', () => {
  it('greets her, says the date and who has checked in, in full sentences', async () => {
    open(WAIRIMU, LEAD_READ)
    expect(screen.getByRole('heading', { level: 1, name: 'Morning, Wairimu' })).toBeTruthy()
    expect(await screen.findByText('Wednesday 23 September. In Sales team, Q3, 5 of 6 have checked in for session 38; Omar hasn’t yet.')).toBeTruthy()
  })

  /* Signup stores whatever was typed for "Your name" whole, in `firstName` (AuthPage.tsx), so an
     account like Rukia's carries "Rukia Otieno" there. The greeting used to print it whole,
     "Morning, Rukia Otieno" - group 2's review, fault D. It greets by the first word alone. */
  it('greets by the first word alone, when the account holds a whole name', async () => {
    open({ ...WAIRIMU, firstName: 'Rukia Otieno' }, LEAD_READ)
    expect(screen.getByRole('heading', { level: 1, name: 'Morning, Rukia' })).toBeTruthy()
  })

  it('lists what needs her, most important first, each with the one button that does it', async () => {
    open(WAIRIMU, LEAD_READ)
    expect(await screen.findByText('3 things, most important first')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What needs you' })).toBeTruthy()
    expect(rows()).toEqual([
      { title: 'Your first check-in for Faith, first 90 days', detail: 'About two minutes. Everyone else’s answers are read against yours.', action: [['Start it', '/checkin/f1']] },
      { title: 'Decide how Kwame, first 90 days ends', detail: 'The last session is done.', action: [['Decide', '/grounds/k']] },
      { title: 'Your own check-in for Leadership, Q3', detail: 'About two minutes.', action: [['Start it', '/checkin/l2']] },
    ])
  })

  it('says what is coming up, in her own time', async () => {
    open(WAIRIMU, LEAD_READ)
    const aside = await screen.findByRole('complementary', { name: 'Coming up' })
    expect([...aside.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      'Tomorrow, 4pmSession 39 of Sales team, Q3 opens.',
      'FridayKwame, first 90 days ends.',
    ])
    expect(within(aside).getByRole('link', { name: 'Session 39 of Sales team, Q3 opens.' })).toHaveAttribute('href', '/grounds/s')
  })

  it('a member never sees the admin’s welcome card or checklist', async () => {
    open(WAIRIMU, LEAD_READ)
    await screen.findByText('3 things, most important first')
    expect(document.body.textContent).not.toMatch(/You’re an admin|going$|Get .* going/)
  })
})

describe('Today, as a participant', () => {
  it('reads her turn in the line, her report and her own report, and nothing about anyone else', async () => {
    open(MIRIAM, PARTICIPANT_READ)
    expect(await screen.findByText('Wednesday 23 September. Your check-in for Sales team, Q3 is open.')).toBeTruthy()
    expect(rows()).toEqual([
      { title: 'The report for Sales team, Q3 is ready', detail: 'Three deals moved stage.', action: [['Read it', '/grounds/s/report']] },
      { title: 'Your own report for Sales team, Q3', detail: 'Only you see it.', action: [['Read it', '/checkin/c4/report']] },
    ])
    expect(screen.queryByRole('complementary', { name: 'Coming up' })).toBeNull()
  })
})

describe('Today, for a new organisation’s admin', () => {
  it('starts with the welcome card, its doors, and "Get <organisation> going", and says nothing needs you yet', async () => {
    open(GRACE, { count: 0, line: null, needs: [], comingUp: [] })
    expect(await screen.findByRole('heading', { name: 'You’re an admin at Nyali Foods' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
    expect(screen.getByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.getByText('Wednesday 23 September.')).toBeTruthy()
    expect(screen.queryByText(/most important first/)).toBeNull()
    /* Answered 29 September, item 11 conflict B: Hafsah's exact sentence, naming the exceptions
       decision 5 now covers (a performance plan, promotion or renewal alike), replaces the old
       held sentence that pointed "They" at nobody. */
    /* Ask is named for the organisation (decision 100): "Ask Nyali Foods", not "Ask Groundwork". */
    expect(screen.getByText(
      'You can see every board and report, including what people said in them. You never see anyone’s questions to Ask Nyali Foods, anyone’s own report, or a lead’s private notes, and never a performance plan, promotion or renewal unless given access to that check-in.',
    )).toBeTruthy()
  })
})

describe('Today, appeals to decide (C3, U.13)', () => {
  const APPEAL = {
    id: 's-d', checkIn: { id: 'g-d', label: 'Daniel, the next six weeks' }, aboutName: 'Daniel', leadName: 'Wairimu',
    headline: 'Groundwork suggests a performance plan for Daniel', why: 'In the last 4 weeks, Daniel kept 11 of his 20 commitments.',
    whatWouldChangeIt: null, theirOwnAnswer: null,
    decision: { says: 'A 6-week plan.', reasons: 'Seven sales have been stuck.', at: null },
    theirSide: null, appeal: { says: 'The records were the job I was given.', at: null }, appealDecision: null, mayDecide: true,
  }

  it('an admin reads the appeals waiting for her at the top', async () => {
    ;(todayApi.get as any).mockResolvedValue({ count: 0, line: null, needs: [], comingUp: [] })
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) =>
      ({ data: url === '/suggestions/appeals' ? { appeals: [APPEAL] } : { ...NEW_ORG, checkIns: 3, welcomeCardSeen: true } }) as any)
    useAuthStore.setState({ user: GRACE, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TodayPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('heading', { name: 'Appeals to decide' })).toBeTruthy()
    expect(screen.getByText('Daniel appealed Wairimu’s decision')).toBeTruthy()
  })

  it('a lead or a participant never asks for appeals, and reads none', async () => {
    for (const who of [WAIRIMU, MIRIAM]) {
      const view = open(who, LEAD_READ)
      await screen.findByText('3 things, most important first')
      expect((apiClient.get as any).mock.calls.map((c: any[]) => c[0])).not.toContain('/suggestions/appeals')
      expect(screen.queryByText('Appeals to decide')).toBeNull()
      view.unmount()
    }
  })
})

describe('when the read fails', () => {
  it('says so, says nothing written is affected, and offers to try again', async () => {
    ;(todayApi.get as any).mockRejectedValue(new Error('offline'))
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: NEW_ORG } as any)
    useAuthStore.setState({ user: WAIRIMU, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TodayPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('What needs you did not load. Nothing you have written is affected.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByText('Nothing needs you right now.')).toBeNull()
  })
})

describe('the words for when', () => {
  it('today and tomorrow with the hour, then the day of the week, then the date', () => {
    expect(whenItComes(new Date(2026, 8, 23, 18, 0), MORNING)).toBe('Today, 6pm')
    expect(whenItComes(new Date(2026, 8, 24, 16, 30), MORNING)).toBe('Tomorrow, 4:30pm')
    expect(whenItComes(new Date(2026, 8, 28, 9, 0), MORNING)).toBe('Monday')
    expect(whenItComes(new Date(2026, 9, 1, 9, 0), MORNING)).toBe('1 October')
  })
})

describe('Today has one navy button', () => {
  /* Hafsah, 30 September: at most one primary button per screen. The prototype's own Today draws
     every "Start it" navy; with two check-ins open that is two at once. Only the first is navy. */
  it('with two check-ins to start, only the first "Start it" is navy', async () => {
    open(WAIRIMU, LEAD_READ)
    const starts = await screen.findAllByRole('link', { name: 'Start it' })
    expect(starts).toHaveLength(2)
    expect(starts[0].className).toContain('gwui-btn-primary')
    expect(starts[1].className).not.toContain('gwui-btn-primary')
    expect(document.querySelectorAll('.gwui-btn-primary')).toHaveLength(1)
  })
})
