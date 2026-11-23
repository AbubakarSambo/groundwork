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
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
import { todayApi } from '@/api/today'

const MORNING = new Date(2026, 8, 23, 9, 0)
const tomorrowAt4 = new Date(2026, 8, 24, 16, 0).toISOString()
const friday = new Date(2026, 8, 25, 9, 0).toISOString()

const LEAD_READ = {
  count: 3,
  line: 'In Sales team, Q3, 5 of 6 have checked in for check-in 38; Omar hasn’t yet.',
  needs: [
    { key: 'turn-f', kind: 'decide', title: 'Your first check-in for Faith, first 90 days', detail: 'About ten minutes. Everyone else’s answers are read against yours.', action: { label: 'Start it', to: '/checkin/f1' }, groundId: 'f', organizationId: 'o' },
    { key: 'end-k', kind: 'decide', title: 'Decide how Kwame, first 90 days ends', detail: 'The last check-in is done.', action: { label: 'Decide', to: '/grounds/k' }, groundId: 'k', organizationId: 'o' },
    { key: 'turn-l', kind: 'decide', title: 'Your own check-in for Leadership, Q3', detail: 'About ten minutes.', action: { label: 'Start it', to: '/checkin/l2' }, groundId: 'l', organizationId: 'o' },
  ],
  comingUp: [
    { at: tomorrowAt4, what: 'Check-in 39 of Sales team, Q3 opens.', to: '/grounds/s' },
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
  /* Reset between tests: a test that gives the lead's daily nudge its own outstanding items must
     not leak into the next one, which expects the server's ordinary "nothing outstanding" (null). */
  ;(todayApi.outstanding as any).mockReset().mockResolvedValue(null)
})
afterEach(() => { vi.useRealTimers() })

/* Rebuilt from the shared parts (group 2): the row is now the shared `EdgeRow` (`gwui-edge-row`,
   `gwui-edge-h`, `gwui-edge-s`), in place of the old `NeedsYouRow` (`gw-need`, `gw-need-h`, `gw-need-s`) -
   the same shape, one shared part used by every list of things that need a reader. */
/* 24 October: the prototype's own row markup (.item, .h, .s), one stylesheet, the prototype's. */
/* 23 November (journey 3, the design system): the shared row draws its own design-system markup (.ds-row, its title at
   .ds-text-card and its detail at .ds-text-secondary) on the rebuilt Today; the row's own title link is .ds-row-link. */
const rows = () => [...document.querySelectorAll('.ds-row')].map(li => ({
  title: li.querySelector('.ds-text-card')?.textContent,
  detail: li.querySelector('.ds-row-main > .ds-text-secondary')?.textContent ?? null,
  /* The row's own link (a row is tapped as a whole, as the prototype's phone Today) is its title, not its action. */
  action: [...li.querySelectorAll('a:not(.ds-row-link)')].map(a => [a.textContent, a.getAttribute('href')]),
}))

describe('Today, as the lead', () => {
  it('greets her, says the date and who has checked in, in full sentences', async () => {
    open(WAIRIMU, LEAD_READ)
    expect(screen.getByRole('heading', { level: 1, name: 'Morning, Wairimu' })).toBeTruthy()
    expect(await screen.findByText('Wednesday 23 September. In Sales team, Q3, 5 of 6 have checked in for check-in 38; Omar hasn’t yet.')).toBeTruthy()
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
      { title: 'Your first check-in for Faith, first 90 days', detail: 'About ten minutes. Everyone else’s answers are read against yours.', action: [['Start it', '/checkin/f1']] },
      { title: 'Decide how Kwame, first 90 days ends', detail: 'The last check-in is done.', action: [['Decide', '/grounds/k']] },
      { title: 'Your own check-in for Leadership, Q3', detail: 'About ten minutes.', action: [['Start it', '/checkin/l2']] },
    ])
  })

  /* Live walk at a hundred people, fault 2, and the use-case walk of 2 November: each item's link is the server's `to`, unchanged.
     The server sends an approval to the approver's own queue (`/suite/queue?suite=`) and finance's item to the requests for finance.
     The page used to rewrite every `/suite/spend` to the approvals queue, so Njeri's finance item opened an empty queue. */
  it('opens each item where the server says: an approval in the queue, and finance’s item in the requests for finance', async () => {
    open(WAIRIMU, {
      ...LEAD_READ,
      needs: [
        { key: 'approve-leave-0', kind: 'decide', title: 'Aisha asked for leave from Monday 12 October to Friday 16 October.', detail: 'It is waiting for you to approve.', action: { label: 'Look at it', to: '/suite/queue?suite=leave' }, groundId: '', organizationId: 'o' },
        { key: 'approve-spend-0', kind: 'decide', title: 'Kamau asked to spend KES 18,000 on fuel.', detail: 'It is waiting for you to approve.', action: { label: 'Look at it', to: '/suite/queue?suite=spend' }, groundId: '', organizationId: 'o' },
        { key: 'spend-finance', kind: 'decide', title: 'One approved request to spend is waiting for you in finance.', detail: 'It has not been checked yet.', action: { label: 'Open them', to: '/suite/spend/finance' }, groundId: '', organizationId: 'o' },
      ],
    })
    const links = await screen.findAllByRole('link', { name: 'Look at it' })
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/suite/queue?suite=leave', '/suite/queue?suite=spend'])
    expect(screen.getByText('One approved request to spend is waiting for you in finance.')).toBeInTheDocument()
    expect((await screen.findAllByRole('link', { name: 'Open them' })).map(a => a.getAttribute('href'))).toEqual(['/suite/spend/finance'])
  })

  it('says what is coming up, in her own time', async () => {
    open(WAIRIMU, LEAD_READ)
    const aside = await screen.findByRole('complementary', { name: 'Coming up' })
    expect([...aside.querySelectorAll('.ds-when')].map(li => li.textContent)).toEqual([
      'Tomorrow, 4pmCheck-in 39 of Sales team, Q3 opens.',
      'FridayKwame, first 90 days ends.',
    ])
    expect(within(aside).getByRole('link', { name: 'Check-in 39 of Sales team, Q3 opens.' })).toHaveAttribute('href', '/grounds/s')
  })

  it('a member never sees the admin’s welcome card or checklist', async () => {
    open(WAIRIMU, LEAD_READ)
    await screen.findByText('3 things, most important first')
    expect(document.body.textContent).not.toMatch(/You’re an admin|going$|Get .* going/)
  })
})

/**
 * THE LEAD'S DAILY NUDGE'S OWN LINK (decision 120, GET /today/outstanding): "Needs you", "Overdue
 * on your team" and "Risks", every sentence already worded by the server.
 *
 * UPDATED 24 October (Hafsah: the prototype's structure, same sections in the same order): the prototype's Today has one
 * list, "What needs you", most important first. The nudge's three lists are rows of it, after the ones Today serves, in
 * the order served, never sections of their own. Every sentence is still drawn, once.
 */
describe('Today: the lead’s daily nudge, "to see everything"', () => {
  it('draws all three lists, in the order served, as rows of What needs you', async () => {
    ;(todayApi.outstanding as any).mockResolvedValue({
      needsYou: ['Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.'],
      overdueOnYourTeam: ['Omar committed to “send the price list” by Tuesday 6 October, and it is six days late.'],
      risks: ['Bisi has been waiting on Omar for the price list since Monday 21 September.'],
    })
    open(WAIRIMU, LEAD_READ)
    /* Each as a row: one line of title, the rest as its detail (Hafsah, 25 October). */
    await screen.findByText('Kofi is waiting on you for the pricing for Q4.')
    expect(screen.getByText('Since Thursday 8 October.')).toBeTruthy()
    const titles = rows().map(r => r.title)
    const at = (t: string) => titles.indexOf(t)
    expect(at('Kofi is waiting on you for the pricing for Q4.')).toBeLessThan(at('Omar committed to “send the price list” by Tuesday 6 October.'))
    expect(at('Omar committed to “send the price list” by Tuesday 6 October.')).toBeLessThan(at('Bisi has been waiting on Omar for the price list.'))
    expect(screen.queryByRole('heading', { name: 'Needs you' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Risks' })).toBeNull()
  })

  it('adds a row for each sentence served, and none for an empty list', async () => {
    ;(todayApi.outstanding as any).mockResolvedValue({ needsYou: [], overdueOnYourTeam: ['Omar is six days late.'], risks: [] })
    open(WAIRIMU, LEAD_READ)
    await screen.findByText('Omar is six days late.')
    expect(rows().filter(r => r.title === 'Omar is six days late.')).toHaveLength(1)
    expect(screen.getByText('4 things, most important first')).toBeTruthy()
  })

  it('draws nothing for a member, since the server gives her null', async () => {
    ;(todayApi.outstanding as any).mockResolvedValue(null)
    open(MIRIAM, PARTICIPANT_READ)
    await screen.findByText('Wednesday 23 September. Your check-in for Sales team, Q3 is open.')
    expect(screen.queryByRole('heading', { name: 'Needs you' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Overdue on your team' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Risks' })).toBeNull()
  })

  it('does not say twice, under "Needs you", a sentence "What needs you" already says', async () => {
    ;(todayApi.outstanding as any).mockResolvedValue({
      needsYou: [
        'Decide whether a price range counts as a budget',
        'Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.',
      ],
      overdueOnYourTeam: [],
      risks: [],
    })
    open(WAIRIMU, {
      ...LEAD_READ,
      needs: [
        { key: 'd', kind: 'decide', title: 'Decide whether a price range counts as a budget', detail: 'Brian and Miriam both raised it.', action: { label: 'Decide', to: '/x' }, groundId: 'g', organizationId: 'o' },
      ],
    })
    expect(await screen.findByText('Kofi is waiting on you for the pricing for Q4.')).toBeTruthy()
    expect(screen.getAllByText('Decide whether a price range counts as a budget')).toHaveLength(1)
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
  /*
   * SCREEN FAULT 7, 6 OCTOBER: THE WELCOME CARD USED TO COME FIRST, ABOVE THE GREETING AND "WHAT
   * NEEDS YOU". On a phone - where this page is one column, not the side-by-side layout a wide
   * screen draws - that put "You're an admin" and "Get <organisation> going" as the entire first
   * screen, with the greeting and anything that actually needed her two screens further down.
   * This test used to pin that order ("starts with the welcome card..."); it now pins the
   * corrected one, the reason this file's assertions on greeting-before-welcome-card exist below.
   */
  it('greets her and says what needs her before the welcome card and "Get <organisation> going"', async () => {
    const { container } = open(GRACE, { count: 0, line: null, needs: [], comingUp: [] })
    /* The welcome card is one line now (page audit, 24 November 2026, row 10): "You’re an admin. Set things up". */
    expect(await screen.findByText(/You’re an admin\./)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Get Nyali Foods going' })).toBeTruthy()
    expect(screen.getByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.getByText('Wednesday 23 September.')).toBeTruthy()
    expect(screen.queryByText(/most important first/)).toBeNull()
    const text = container.textContent ?? ''
    const greetingAt = text.indexOf('Morning, Grace')
    const needsAt = text.indexOf('What needs you')
    const welcomeAt = text.indexOf('You’re an admin.')
    const goingAt = text.indexOf('Get Nyali Foods going')
    expect(greetingAt).toBeGreaterThan(-1)
    expect(needsAt).toBeGreaterThan(-1)
    expect(welcomeAt).toBeGreaterThan(-1)
    expect(goingAt).toBeGreaterThan(-1)
    expect(greetingAt).toBeLessThan(welcomeAt)
    expect(needsAt).toBeLessThan(welcomeAt)
    expect(welcomeAt).toBeLessThan(goingAt)
    /* The privacy paragraph is taken off the first screen (Hafsah, 30 October 2026: plain
       language for an impatient first-time lead; the prototype's Today has none). It stays in the
       guide for leads and admins and on a person's own page. */
    expect(text).not.toMatch(/You can see every board and report/)
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
    expect(await screen.findByText('What needs you didn’t load. Try again.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByText('Nothing needs you right now.')).toBeNull()
  })
})

/**
 * SCREEN FAULT 4 (FINAL WALK): "YOU HAVE NOT CHECKED IN YET." BESIDE "NOTHING NEEDS YOU RIGHT NOW."
 *
 * Walked live as a lead with no open session anywhere (the check-in's own tab agreed: "No check-in
 * open right now") - the greeting still carried this exact claim while "What needs you" said
 * nothing needed him, which cannot both be true read together.
 */
describe('Today: the greeting never claims what "What needs you" does not', () => {
  it('drops "You have not checked in yet." when nothing needs the lead', async () => {
    open(WAIRIMU, { count: 0, line: 'You have not checked in yet.', needs: [], comingUp: [] })
    expect(await screen.findByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.queryByText(/You have not checked in yet/)).toBeNull()
    expect(screen.getByText('Wednesday 23 September.')).toBeTruthy()
  })

  it('keeps the greeting line once an open session actually is something that needs the lead', async () => {
    open(WAIRIMU, {
      count: 1,
      line: 'You have not checked in yet.',
      needs: [{ key: 'turn-s', kind: 'decide', title: 'Your own check-in for Sales team, Q3', detail: 'About ten minutes.', action: { label: 'Start it', to: '/checkin/s1' }, groundId: 's', organizationId: 'o' }],
      comingUp: [],
    })
    expect(await screen.findByText(/You have not checked in yet\./)).toBeTruthy()
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
    expect(starts[0].className).toContain('ds-btn-main')
    expect(starts[1].className).not.toContain('ds-btn-main')
    expect(document.querySelectorAll('.ds-btn-main')).toHaveLength(1)
  })
})

/*
 * THE LEAD'S TODAY ALSO DRAWS WHAT HER MAIL TELLS HER (request 198, b): nobody has started, and what
 * Groundwork would do this week. The sentences are the server's (what-the-lead-is-told-on-today.ts).
 */
describe('the lead’s Today, with what her mail also tells her', () => {
  const FOR_THE_LEAD = {
    nobodyHasStarted: [{ groundId: 'd', label: 'Distributor review', subject: 'Nobody has started “Distributor review” yet, and Groundwork is following up', lines: ['You invited Kito and Lerato three days ago.', 'Groundwork is reminding them.'], linkLabel: 'See who has started', to: '/grounds/d' }],
    whatIWouldDoThisWeek: [{ groundId: 's', label: 'Sales team, Q3', lines: ['Here is what I would do this week.', 'Ask Omar about the Naivas order, because it has been open for a fortnight.'] }],
  }
  /* Today is one list (Hafsah, 25 October: merge Needs you, Risks and From Groundwork into "What needs you", with no repeats): each is a row of it,
     its title, one line of detail and its one action. */
  it('draws each as a row of What needs you, once, with its link, for the lead', async () => {
    open(WAIRIMU, { ...LEAD_READ, forTheLead: FOR_THE_LEAD })
    const region = await screen.findByRole('list', { name: 'What needs you' })
    expect(within(region).getAllByText('Nobody has started “Distributor review” yet, and Groundwork is following up')).toHaveLength(1)
    expect(within(region).getByText('You invited Kito and Lerato three days ago.')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'See who has started' })).toHaveAttribute('href', '/grounds/d')
    expect(within(region).getByText('Ask Omar about the Naivas order, because it has been open for a fortnight.')).toBeInTheDocument()
    expect(within(region).getByText('In Sales team, Q3.')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/grounds/s')
    expect(screen.queryByRole('list', { name: 'From Groundwork' })).toBeNull()
  })
  it('draws nothing for a reader the server gave no key', async () => {
    open(MIRIAM, PARTICIPANT_READ)
    await screen.findByText('Your own report for Sales team, Q3')
    expect(screen.queryByRole('list', { name: 'From Groundwork' })).toBeNull()
  })
})

/* F5, the approved journey, stage 8: the count in its words, "Send it to them again" for who has not joined, and the report row naming who differs. */
describe('Akinyi’s day one, as she reads Today', () => {
  const AKINYI = { id: 'u-a', firstName: 'Akinyi', role: 'MEMBER', organizationName: 'Westgate Supplies' }
  const DAY_ONE = {
    count: 1,
    line: 'In Deal progress, 2 of 4 have checked in; Peter and Mary haven’t joined yet.',
    lineGroundId: 'g-deals',
    lineResend: { groundId: 'g-deals', participantIds: ['p-peter', 'p-mary'], firstNames: ['Peter', 'Mary'] },
    needs: [
      { key: 'report-g-deals', kind: 'ready', title: 'Today’s report for Deal progress is ready', detail: 'Jane and John see the Westgate deal differently.', action: { label: 'Read it', to: '/grounds/g-deals/report' }, groundId: 'g-deals', organizationId: 'o' },
    ],
    comingUp: [],
  }
  it('reads the count, who has not joined, a way to send it again, and who differs', async () => {
    open(AKINYI, DAY_ONE)
    expect(await screen.findByText(/In Deal progress, 2 of 4 have checked in; Peter and Mary haven’t joined yet\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send it to them again' })).toBeTruthy()
    expect(screen.getByText('Today’s report for Deal progress is ready')).toBeTruthy()
    expect(screen.getByText('Jane and John see the Westgate deal differently.')).toBeTruthy()
  })
  it('names the one person when only one has not joined', async () => {
    open(AKINYI, { ...DAY_ONE, line: 'In Deal progress, 3 of 4 have checked in; Peter hasn’t joined yet.', lineResend: { groundId: 'g-deals', participantIds: ['p-peter'], firstNames: ['Peter'] } })
    expect(await screen.findByRole('button', { name: 'Send it to Peter again' })).toBeTruthy()
  })
})
