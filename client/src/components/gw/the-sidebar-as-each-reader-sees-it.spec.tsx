import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * A1, THE SIDEBAR, AS EACH READER SEES IT (docs/prototype/screens/A1-look-and-layout/
 * layout-computer.txt): the organisation card, "Start a check-in", "Check-ins" with each check-in's
 * dot and badge, "Closed (n)", and "Settings, help, sign out".
 *
 * Mounted, with the check-ins in the cache exactly as the list endpoint returns them, so what is
 * checked is what a person reads in the rail, not the source.
 */
const LEAD = {
  id: 'u-lead', email: 'hafsah@coamana.test', firstName: 'Hafsah', lastName: 'Jumare',
  role: 'MEMBER', organizationId: 'o1', organizationName: 'Coamana',
} as any

const past = new Date(Date.now() - 2 * 86_400_000).toISOString()
const longAgo = new Date(Date.now() - 20 * 86_400_000).toISOString()

const GROUNDS = [
  {
    id: 'g-turn', label: 'Coamana growth, Q3', status: 'AWAITING_PARTIES', initiatorId: 'u-lead',
    participants: [{ id: 'p1', userId: 'u-lead' }, { id: 'p2', userId: 'u-other' }],
    checkIns: [{ participantId: 'p1', sessionNumber: 1, status: 'IN_PROGRESS', availableFrom: past }],
  },
  {
    id: 'g-late', label: 'Supplier review', status: 'AWAITING_PARTIES', initiatorId: 'u-x',
    participants: [{ id: 'p3', userId: 'u-lead' }, { id: 'p4', userId: 'u-x' }],
    checkIns: [{ participantId: 'p3', sessionNumber: 2, status: 'IN_PROGRESS', availableFrom: longAgo }],
  },
  {
    id: 'g-wait', label: 'Leadership, Q3', status: 'AWAITING_PARTIES', initiatorId: 'u-x',
    participants: [{ id: 'p5', userId: 'u-lead' }, { id: 'p6', userId: 'u-x' }],
    checkIns: [
      { participantId: 'p5', sessionNumber: 1, status: 'COMPLETED' },
      { participantId: 'p6', sessionNumber: 1, status: 'IN_PROGRESS' },
    ],
  },
  {
    id: 'g-ready', label: 'Sales team, Q3', status: 'REPORT_READY', initiatorId: 'u-x',
    participants: [{ id: 'p7', userId: 'u-lead' }], checkIns: [],
  },
  {
    id: 'g-closed', label: 'Kwame, first 90 days', status: 'CLOSED', initiatorId: 'u-x',
    closedAt: past, participants: [{ id: 'p8', userId: 'u-lead' }], checkIns: [],
  },
]

function shell(user: any, orgs: any[] = [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true }], today: any = { count: 0, needs: [], line: null, comingUp: [] }) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], GROUNDS)
  qc.setQueryData(['today'], today)
  qc.setQueryData(['my-organizations'], orgs)
  const out = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds']}>
        <AppShell><div>page body</div></AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const rail = out.container.querySelector('.gw-sidebar-desktop') as HTMLElement
  return { ...out, rail }
}

const row = (rail: HTMLElement, name: string) =>
  [...rail.querySelectorAll('a.gw-ci-row')].find(a => a.querySelector('.gw-ci-nm')?.textContent === name) as HTMLElement | undefined

beforeEach(() => useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as any))

describe('the sidebar, as a lead reads it', () => {
  it('opens on the organisation card: its initials, its name and what you are in it', () => {
    const { rail } = shell(LEAD)
    const card = (rail.querySelector('.gw-rl-org') as HTMLElement)
    expect(card).toHaveTextContent('CO')
    expect(card).toHaveTextContent('Coamana')
    /* U.3 review: the People page's words, "Takes part", not "Member". */
    expect(card).toHaveTextContent('Takes part')
    expect(card).not.toHaveTextContent('Member')
    expect(card).toHaveAttribute('aria-expanded', 'false')
  })

  it('every role reads in the People page\'s words, on the card and in the menu (U.3 review)', () => {
    const { rail } = shell({ ...LEAD, role: 'LEAD' }, [
      { id: 'o1', name: 'Coamana', role: 'LEAD', active: true },
      { id: 'o2', name: 'Kilimo Traders', role: 'GUEST', active: false },
      { id: 'o3', name: 'Baridi', role: 'MEMBER', active: false },
    ])
    expect(rail.querySelector('.gw-rl-org') as HTMLElement).toHaveTextContent('Can open check-ins')
    fireEvent.click((rail.querySelector('.gw-rl-org') as HTMLElement))
    const menu = [...rail.querySelectorAll('.gw-rl-menu-item')].map(el => (el.textContent ?? '').replace('✓', '').trim())
    expect(menu).toEqual(expect.arrayContaining(['COCoamanaCan open check-ins', 'KTKilimo TradersGuest', 'BABaridiTakes part']))
    expect(rail).not.toHaveTextContent(/\bMember\b|\bLead\b/)
  })

  it('the card opens the organisation menu, with the one you are in ticked', () => {
    const { rail } = shell(LEAD, [
      { id: 'o1', name: 'Coamana', role: 'MEMBER', active: true },
      { id: 'o2', name: 'Kilimo Traders', role: 'ADMIN', active: false },
    ])
    fireEvent.click((rail.querySelector('.gw-rl-org') as HTMLElement))
    expect(rail).toHaveTextContent('Organisations')
    expect(within(rail).getByRole('button', { name: /Kilimo Traders/ })).toHaveTextContent('Admin')
    expect(within(rail).getByLabelText('You are in this organisation')).toBeInTheDocument()
  })

  it('the check-ins that need you come first, each saying "Your turn"', () => {
    const { rail } = shell(LEAD)
    const names = [...rail.querySelectorAll('.gw-rl-list')][0].querySelectorAll('.gw-ci-nm')
    expect([...names].map(n => n.textContent)).toEqual(['Supplier review', 'Coamana growth, Q3', 'Leadership, Q3', 'Sales team, Q3'])
    expect(row(rail, 'Coamana growth, Q3')).toHaveTextContent('Your turn')
    expect(row(rail, 'Coamana growth, Q3')!.querySelector('.gw-ci-dot-turn')).not.toBeNull()
  })

  it('a late one still says "Your turn", in red, and the reason is on the row, never a label on anyone', () => {
    const { rail } = shell(LEAD)
    const late = row(rail, 'Supplier review')!
    expect(late).toHaveTextContent('Your turn')
    expect(late.querySelector('.gw-rail-bdg-late')).not.toBeNull()
    expect(late.querySelector('.gw-ci-dot-late')).not.toBeNull()
    // In a sentence, from her side (this check-in has no plan, so no "of 12").
    expect(late.getAttribute('title')).toMatch(/^Supplier review\. Your session 2 is \d+ days past its date\.$/)
    expect(late).toHaveAccessibleName(late.getAttribute('title')!)
  })

  it('a check-in waiting on others has a quiet dot and no badge; a finished report says so', () => {
    const { rail } = shell(LEAD)
    const waiting = row(rail, 'Leadership, Q3')!
    expect(waiting.querySelector('.gw-rail-bdg')).toBeNull()
    expect(waiting.querySelector('.gw-ci-dot-quiet')).not.toBeNull()
    expect(row(rail, 'Sales team, Q3')).toHaveTextContent('Report ready')
  })

  it('closed ones are folded under "Closed (n)" until you open it', () => {
    const { rail } = shell(LEAD)
    expect(row(rail, 'Kwame, first 90 days')).toBeUndefined()
    const fold = within(rail).getByRole('button', { name: /Closed \(1\)/ })
    expect(fold).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(fold)
    expect(fold).toHaveAttribute('aria-expanded', 'true')
    expect(row(rail, 'Kwame, first 90 days')).toBeDefined()
  })

  it('the rename pencil is on the one she leads and nowhere else', () => {
    const { rail } = shell(LEAD)
    expect(within(rail).getAllByRole('button', { name: /^Rename / }).map(b => b.getAttribute('aria-label')))
      .toEqual(['Rename Coamana growth, Q3'])
  })

  it('ends with her own name and "Settings, help, sign out"', () => {
    const { rail } = shell(LEAD)
    const me = within(rail).getByRole('button', { name: /Settings, help, sign out/ })
    expect(me).toHaveTextContent('Hafsah Jumare')
    expect(me).toHaveTextContent('HJ')
  })

  it('and it is light, not the old navy', () => {
    const { rail } = shell(LEAD)
    expect(rail).toHaveClass('gw-rl')
    expect(rail.getAttribute('style') ?? '').not.toMatch(/#0D1A2B/i)
  })
})

/*
 * WALKTHROUGH PASS 2, ITEM 1: TWO CHECK-INS, ONE NAME. The rail found "Help a new hire get
 * started, from 27 September" listed three times with nothing to say which row was which. When
 * the list carries more than one check-in under the same label, the row now says what tells it
 * apart - when it started - and leaves a label that is already unique alone.
 */
describe('two check-ins that share one label', () => {
  const DUPES = [
    { ...GROUNDS[3], id: 'g-dup-1', label: 'Help a new hire get started', startsAt: '2026-09-27T00:00:00.000Z' },
    { ...GROUNDS[3], id: 'g-dup-2', label: 'Help a new hire get started', startsAt: '2026-10-01T00:00:00.000Z' },
    { ...GROUNDS[0], id: 'g-unique', label: 'Coamana growth, Q3' },
  ]

  it('says when each one started, so the rail does not read the same name twice with nothing to tell them apart', () => {
    useAuthStore.setState({ user: LEAD, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], DUPES)
    qc.setQueryData(['today'], { count: 0, needs: [], line: null, comingUp: [] })
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true }])
    const out = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds']}>
          <AppShell><div>page body</div></AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const rail = out.container.querySelector('.gw-sidebar-desktop') as HTMLElement
    const names = [...rail.querySelectorAll('.gw-ci-nm')].map(n => n.textContent)
    expect(names).toContain('Help a new hire get started, started 27 September')
    expect(names).toContain('Help a new hire get started, started 1 October')
    /* The one label that is already unique on this rail is left exactly as it reads elsewhere. */
    expect(names).toContain('Coamana growth, Q3')
  })
})

describe('Start a check-in', () => {
  it('is offered to somebody who may start one', () => {
    const { rail } = shell({ ...LEAD, mayOpenCheckIns: true })
    expect(within(rail).getByRole('button', { name: 'Start a check-in' })).toBeInTheDocument()
  })

  it('and not to somebody the server would refuse', () => {
    const { rail } = shell({ ...LEAD, mayOpenCheckIns: false })
    expect(within(rail).queryByRole('button', { name: 'Start a check-in' })).toBeNull()
  })
})

describe('the sidebar, as a participant and as an admin read it', () => {
  it('a participant sees their check-ins and their own menu, and no organisation pages', () => {
    const { rail } = shell({ ...LEAD, id: 'u-other', firstName: 'Adam', lastName: 'Grunewald' })
    expect(rail).toHaveTextContent('Coamana growth, Q3')
    expect(within(rail).queryByRole('link', { name: /People|Connections|Suites|Plan and billing/ })).toBeNull()
    expect(within(rail).queryAllByRole('button', { name: /^Rename / })).toHaveLength(0)
  })

  /*
   * HAFSAH, 10 OCTOBER (B-146): A PARTICIPANT NOW SEES "BOARDS" TOO. The second deep page audit
   * found /boards already worked for a member - groundsApi.list already scopes it to what they
   * take part in - but there was no door to it in her side menu or her More menu. This used to be
   * folded into the list above, pinning that gap; it is its own assertion now, with the reason.
   */
  /* THE SIDEBAR IS THE PROTOTYPE'S (Hafsah, 25 October): Boards, Connections, All check-ins and Plan and billing are in the organisation
     menu; the sidebar itself is the check-ins, then Today, Company, You, People for an admin, and Suites, with no heading of its own. */
  const openTheOrgMenu = (rail: HTMLElement) => { fireEvent.click(rail.querySelector('.gw-rl-org') as HTMLElement); return rail.querySelector('.gw-rl-menu-org') as HTMLElement }
  it('a participant reaches Boards from the organisation menu, not the sidebar', () => {
    const { rail } = shell({ ...LEAD, id: 'u-other', firstName: 'Adam', lastName: 'Grunewald' })
    expect(within(rail.querySelector('.gw-rl-scroll') as HTMLElement).queryByRole('link', { name: 'Boards' })).toBeNull()
    expect(within(openTheOrgMenu(rail)).getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/boards')
  })

  it('an admin reads People and Suites in the one list, and the rest in the organisation menu', () => {
    const { rail } = shell({ ...LEAD, role: 'ADMIN' }, [{ id: 'o1', name: 'Coamana', role: 'ADMIN', active: true }])
    const headings = [...rail.querySelectorAll('.gw-rl-h')].map(h => h.textContent)
    expect(headings).toEqual(['Check-ins'])
    const list = rail.querySelector('.gw-rl-scroll') as HTMLElement
    for (const [name, href] of [['People', '/org/members'], ['Suites', '/settings/suites']]) expect(within(list).getByRole('link', { name })).toHaveAttribute('href', href)
    for (const name of ['Boards', 'Connections', 'Plan and billing', 'All check-ins']) expect(within(list).queryByRole('link', { name })).toBeNull()
    const menu = openTheOrgMenu(rail)
    for (const [name, href] of [['All check-ins', '/grounds'], ['Boards', '/boards'], ['Connections', '/settings/connections'], ['Plan and billing', '/billing']]) {
      expect(within(menu).getByRole('link', { name })).toHaveAttribute('href', href)
    }
    expect((rail.querySelector('.gw-rl-org') as HTMLElement)).toHaveTextContent('Admin')
  })
})

describe('Today in the sidebar (C1, U.5), as layout-computer.txt draws it', () => {
  it('sits first under the check-ins, goes to Today, and carries the count the server gives', () => {
    const { rail } = shell(LEAD, undefined, { count: 5, needs: [], line: null, comingUp: [] })
    const pages = [...rail.querySelectorAll('.gw-rl-pages a')]
    expect(pages[0].getAttribute('href')).toBe('/today')
    expect(pages[0].textContent).toBe('Today55 things need you')
    expect(within(pages[0] as HTMLElement).getByText('5 things need you')).toHaveClass('gw-sr-only')
  })

  it('says one thing in the singular, and shows no count when nothing needs you', () => {
    const one = shell(LEAD, undefined, { count: 1, needs: [], line: null, comingUp: [] })
    expect(one.rail.querySelector('.gw-rl-pages a')?.textContent).toBe('Today11 thing needs you')
    one.unmount()
    const none = shell(LEAD)
    expect(none.rail.querySelector('.gw-rl-pages a')?.textContent).toBe('Today')
  })
})

describe('Company and You in the sidebar (D2, U.15; C2, U.12), as layout-computer.txt draws them', () => {
  /* U.15: Company sits between Today and You, so You moved from the second place to the third. */
  it('Company sits straight after Today and goes to the Company page', () => {
    const { rail } = shell(LEAD)
    const pages = [...rail.querySelectorAll('.gw-rl-pages a')]
    expect(pages[1].getAttribute('href')).toBe('/company')
    expect(pages[1].textContent).toBe('Company')
  })

  it('You sits after Company and goes to the You board', () => {
    const { rail } = shell(LEAD)
    const pages = [...rail.querySelectorAll('.gw-rl-pages a')]
    expect(pages[2].getAttribute('href')).toBe('/you')
    expect(pages[2].textContent).toBe('You')
  })
})

describe('Suites in the sidebar (E, U.17), as the prototype draws it for each reader', () => {
  it('a lead has Suites straight after You, and no organisation pages', () => {
    const { rail } = shell({ ...LEAD, role: 'LEAD' })
    const pages = [...rail.querySelectorAll('.gw-rl-pages a')]
    expect(pages.slice(0, 4).map(a => a.textContent)).toEqual(['Today', 'Company', 'You', 'Suites'])
    expect(pages[3].getAttribute('href')).toBe('/settings/suites')
    expect(within(rail).queryByRole('link', { name: /People|Connections|Plan and billing/ })).toBeNull()
  })

  it('a member has no Suites, because the server would refuse them', () => {
    const { rail } = shell(LEAD)
    expect(within(rail).queryByRole('link', { name: 'Suites' })).toBeNull()
  })
})

/*
 * RENAMED, THEN REMOVED (group 1 review, then group 1 re-review fault D): "Start my own
 * workspace" was renamed to "Create an organisation" first, then removed outright - the
 * prototype's own "More" draws only the "Join or create an organisation" link, and creating one
 * is still reachable through the page that link opens (WelcomePage.tsx -> /org-new). Only the
 * note explaining why you are in the one organisation you did not choose is left here now.
 */
describe('why you are in the one organisation you did not make (U.3 review)', () => {
  const PERSON = { ...LEAD, email: 'ama@coamana.test' }
  const note = (rail: HTMLElement) => {
    fireEvent.click(rail.querySelector('.gw-rl-org') as HTMLElement)
    return rail.querySelector('.gw-rl-menu-note') as HTMLElement | null
  }
  const reads = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

  it('on its list of people', () => {
    const { rail } = shell(PERSON, [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true, joinedHow: 'list' }])
    expect(reads(note(rail))).toBe('You are in Coamana because your email address was on its list of people.')
  })

  it('by email domain', () => {
    const { rail } = shell(PERSON, [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true, joinedHow: 'domain' }])
    expect(reads(note(rail))).toBe('You are in Coamana because anyone with an @coamana.test email can join it.')
  })

  it('by the invite link', () => {
    const { rail } = shell(PERSON, [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true, joinedHow: 'link' }])
    expect(reads(note(rail))).toBe('You are in Coamana because you joined through its invite link.')
  })

  it('with no reason from the server, no note is shown at all', () => {
    const { rail } = shell(PERSON, [{ id: 'o1', name: 'Coamana', role: 'MEMBER', active: true, joinedHow: null }])
    expect(note(rail)).toBeNull()
    expect(rail).not.toHaveTextContent(/because/)
    expect(rail).not.toHaveTextContent('Create an organisation')
  })
})
