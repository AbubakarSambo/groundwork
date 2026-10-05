import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyPage } from './CompanyPage'
import { CompanyContextPage } from './CompanyContextPage'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import type { CompanyPage as Page, CompanyCard } from '@/api/company'

/**
 * THE COMPANY PAGE (D2, #/company) AND COMPANY CONTEXT (#/company/context), AS EACH PERSON SEES
 * THEM. What each person is served is tested on the server (api/src/modules/grounds/
 * the-company-page-as-each-reader-reads-it.spec.ts). Here: what each person reads, in the
 * prototype's words (company.txt, company-context.txt), and what the pages never say.
 */
vi.mock('@/api/company', () => ({ companyApi: { get: vi.fn(), cards: vi.fn() } }))
import { companyApi } from '@/api/company'

/* What an admin is served: every priority, with what success looks like. */
const GRACES: Page = {
  name: 'Baridi Appliances',
  line: '2 teams and 5 people work here, and there were 3 check-ins this week.',
  readsTargets: true,
  priorities: [
    { id: 's1', number: 1, title: 'Grow revenue 50%, enterprise first', owner: 'Wairimu Kamau', tag: null, fedBy: 'Fed by Sales team, Q3', staleSays: null, measure: 'Qualified enterprise deals', target: '12 this quarter' },
    { id: 's2', number: 2, title: 'Improve delivery', owner: 'Otieno Ouma', tag: null, fedBy: 'Fed by Operations, Q3', staleSays: 'This was last updated on 28 August.', measure: 'On-time delivery', target: '95%' },
    { id: 's3', number: 3, title: 'Build a stronger organisation', owner: null, tag: 'Nobody owns it yet', fedBy: 'No team feeds it', staleSays: null, measure: null, target: null },
  ],
}
/* What a member is served: the same priorities, no targets, no count of check-ins, and only the check-in she is in. */
const MIRIAMS: Page = {
  name: 'Baridi Appliances',
  line: '2 teams, 5 people.',
  readsTargets: false,
  priorities: GRACES.priorities.map(({ measure: _m, target: _t, ...p }) => ({ ...p, fedBy: p.number === 2 ? null : p.fedBy })),
}
const CARDS: CompanyCard[] = [
  { key: 'leave', kind: 'HANDBOOK', title: 'Leave', body: '21 days a year. Ask your manager at least 2 weeks before.', effectiveFrom: '2026-09-01' },
  { key: 'deck', kind: 'RESOURCE', title: 'Strategy v2.pdf', body: 'The three priorities and the reasoning.', effectiveFrom: '2026-09-01' },
  { key: 'quote', kind: 'PLAYBOOK', title: 'A photo of the quote brings deposits faster', body: 'Deals with a quote photo paid 5 days sooner on average.', effectiveFrom: '2026-09-03' },
]

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const KOFI = { id: 'u-k', firstName: 'Kofi', role: 'GUEST', organizationName: 'Baridi Appliances' }

function open(user: any, at: '/company' | '/company/context', served: Page | Error, cards: CompanyCard[] = CARDS) {
  if (served instanceof Error) (companyApi.get as any).mockRejectedValue(served)
  else (companyApi.get as any).mockResolvedValue(served)
  ;(companyApi.cards as any).mockResolvedValue(cards)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>{at === '/company' ? <CompanyPage /> : <CompanyContextPage />}</MemoryRouter>
    </QueryClientProvider>,
  )
}
const priority = (n: number) => screen.getByRole('region', { name: `Priority ${n}` })
const refusal = () => Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only people in this organisation can read its company page.' } } })

beforeEach(() => { vi.clearAllMocks(); useAskStore.setState({ open: false }) })

const LEVELS = [
  { id: 'l0', depth: 0, level: 'Priority 2', title: 'Improve delivery', changedHere: null, fedBy: null },
  { id: 'l1', depth: 1, level: 'Objective', title: 'Reduce delivery delays', changedHere: null, fedBy: 'Fed by Operations, Q3' },
  { id: 'l2', depth: 2, level: 'Project', title: 'Buy 20 delivery vans', changedHere: 'The meaning changed here, from orders arriving on time to more vans.', fedBy: null },
]

describe('what each level understood, and the figures, as each reader is served them', () => {
  const withLevels = (page: Page): Page => ({ ...page, priorities: page.priorities.map(p => (p.number === 2 ? { ...p, levels: LEVELS } : p)) })

  it('Grace reads each level top down, with where the meaning changed, and a measure with no target in a plain sentence', async () => {
    const onlyMeasure = withLevels({ ...GRACES, priorities: GRACES.priorities.map(p => (p.number === 1 ? { ...p, measure: 'companies', target: null } : p)) })
    open(GRACE, '/company', onlyMeasure)
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(within(priority(1)).getByText('It is measured by companies.')).toBeInTheDocument()
    const levels = within(priority(2)).getByRole('list', { name: 'What each level understood, priority 2' })
    expect([...levels.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      'Priority 2Improve delivery',
      'ObjectiveReduce delivery delaysFed by Operations, Q3',
      'ProjectBuy 20 delivery vansThe meaning changed here, from orders arriving on time to more vans.',
    ])
    expect(within(priority(2)).getByRole('heading', { level: 3, name: 'What each level understood' })).toBeInTheDocument()
  })

  it('a target with no measure reads "The target is ..."', async () => {
    open(GRACE, '/company', { ...GRACES, priorities: [{ ...GRACES.priorities[0], measure: null, target: '3 by 31 December 2026' }] })
    expect(await within(await screen.findByRole('region', { name: 'Priority 1' })).findByText('The target is 3 by 31 December 2026.')).toBeInTheDocument()
  })

  it('Miriam, served no measure, target or levels, reads none and no empty heading', async () => {
    open(MIRIAM, '/company', MIRIAMS)
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(document.body.textContent).not.toMatch(/measured by|the target is|What each level understood/)
  })

  it('a priority with only itself in its levels and nothing changed draws no list', async () => {
    open(GRACE, '/company', { ...GRACES, priorities: [{ ...GRACES.priorities[0], levels: [LEVELS[0]] }] })
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(screen.queryByText('What each level understood')).toBeNull()
  })
})

describe('Grace, an admin, reads the Company page', () => {
  it('reads the name, the buttons, the week, and each priority as company.txt has it', async () => {
    open(GRACE, '/company', GRACES)
    expect(await screen.findByText('2 teams and 5 people work here, and there were 3 check-ins this week.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Baridi Appliances' })).toBeInTheDocument()
    /* Walkthrough pass 2, item 7 (request 154, item 4): both buttons open a chat about one
       check-in, not the whole organisation or the strategy - labelled for what actually opens
       until the engine gives Ask that wider choice. */
    expect(screen.getByRole('button', { name: 'Ask about a check-in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask Groundwork' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Company context' })).toHaveAttribute('href', '/company/context')
    expect(screen.getByRole('heading', { level: 2, name: 'Is the strategy moving?' })).toBeInTheDocument()

    /* Changed: an admin is served the measure and the target of each priority (decision 86, item 3), and now reads them. */
    expect(priority(1).textContent).toBe('Priority 1Grow revenue 50%, enterprise firstFed by Sales team, Q3It is measured by qualified enterprise deals, and the target is 12 this quarter.')
    expect(priority(2).textContent).toBe('Priority 2Improve deliveryThis was last updated on 28 August.Fed by Operations, Q3It is measured by on-time delivery, and the target is 95%.')
    expect(priority(3).textContent).toBe('Priority 3Nobody owns it yetBuild a stronger organisationNo team feeds it')
  })

  it('either button opens Ask Groundwork, about a check-in', async () => {
    open(GRACE, '/company', GRACES)
    fireEvent.click(await screen.findByRole('button', { name: 'Ask Groundwork' }))
    expect(useAskStore.getState().open).toBe(true)
    useAskStore.setState({ open: false })
    fireEvent.click(screen.getByRole('button', { name: 'Ask about a check-in' }))
    expect(useAskStore.getState().open).toBe(true)
  })

  it('reads the engine\'s parts once they are served, in the prototype\'s words', async () => {
    open(GRACE, '/company', {
      ...GRACES,
      priorities: [{ ...GRACES.priorities[1], reading: { tag: 'At risk', says: 'On time is 88% against 95%.' } }],
      notReaching: [{ id: 'o1', observation: 'Priority 3 has no owner and nothing underneath it', question: 'Who owns becoming less dependent on the founders?', forWhom: 'For you' }],
      namedByTeams: [{ id: 'n1', title: 'No way for customers to order in bulk', touches: 'Touches priorities 1 and 2. Nobody owns it.', teams: [{ team: 'Sales', says: '2 enterprise deals lost over it. Named in 5 check-ins.' }] }],
      saidAndShown: [{ id: 'r1', area: 'Revenue', youSaid: 'Enterprise first.', checkInsShow: '6 in 10 sales visits went to small shops.' }],
    })
    expect(await screen.findByText('On time is 88% against 95%.')).toBeInTheDocument()
    expect(within(priority(2)).getByText('At risk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Where the strategy isn’t reaching the work' })).toBeInTheDocument()
    expect(screen.getByText('Questions for the person who can answer each one')).toBeInTheDocument()
    expect(screen.getByText('For you')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Named by more than one team' })).toBeInTheDocument()
    expect(screen.getByText('Nobody on a single team would see this')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What you say, and where the time goes' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'You said' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'The check-ins show' })).toBeInTheDocument()
    expect(screen.getByText('“Enterprise first.”')).toBeInTheDocument()
    expect(screen.getByText('People appear here as counts. What each person said stays with them and their own lead.')).toBeInTheDocument()
  })

  it('draws none of the engine\'s parts while none is served', async () => {
    open(GRACE, '/company', GRACES)
    await screen.findByText('2 teams and 5 people work here, and there were 3 check-ins this week.')
    for (const h of ['Where the strategy isn’t reaching the work', 'Named by more than one team', 'What you say, and where the time goes', 'What new people keep asking']) {
      expect(screen.queryByRole('heading', { name: h })).toBeNull()
    }
  })

  it('reads company context: priorities with what success looks like, the handbook, resources and the rest', async () => {
    open(GRACE, '/company/context', GRACES)
    expect(await screen.findByRole('heading', { level: 2, name: 'Priorities' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'What the company is trying to do, and how it reaches every team' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Company' })).toHaveAttribute('href', '/company')
    expect(screen.getByText('Everyone reads the priorities. Targets and numbers are leadership only.')).toBeInTheDocument()
    expect(priority(1).textContent).toBe('Priority 1Grow revenue 50%, enterprise firstWhat success looks like Leadership onlyQualified enterprise deals12 this quarterOwner: Wairimu Kamau')
    expect(priority(3).textContent).toBe('Priority 3Build a stronger organisationOwner: No owner yet')
    expect(await screen.findByRole('heading', { name: 'The staff handbook, short and simple' })).toBeInTheDocument()
    expect(screen.getByText('Ask Groundwork answers from this, and says so')).toBeInTheDocument()
    expect(screen.getByText('21 days a year. Ask your manager at least 2 weeks before.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What Baridi Appliances has learned, promised and has to hand' })).toBeInTheDocument()
  })
})

describe('Miriam, a member, reads only what she is served', () => {
  it('reads the priorities, no count of check-ins, and no check-in she is not in', async () => {
    open(MIRIAM, '/company', MIRIAMS)
    expect(await screen.findByText('2 teams, 5 people.')).toBeInTheDocument()
    expect(priority(2).textContent).toBe('Priority 2Improve deliveryThis was last updated on 28 August.')
    expect(document.body.textContent).not.toContain('Operations, Q3')
    expect(document.body.textContent).not.toMatch(/check-ins this week/)
  })

  it('reads no targets in company context, and no "Leadership only"', async () => {
    open(MIRIAM, '/company/context', MIRIAMS)
    await screen.findByRole('heading', { name: 'The staff handbook, short and simple' })
    expect(priority(1).textContent).toBe('Priority 1Grow revenue 50%, enterprise firstOwner: Wairimu Kamau')
    expect(document.body.textContent).not.toContain('12 this quarter')
    expect(document.body.textContent).not.toContain('Leadership only')
    expect(document.body.textContent).not.toContain('What success looks like')
  })
})

describe('Kofi, a guest from another company', () => {
  it('reads the server\'s refusal, and nothing else', async () => {
    open(KOFI, '/company', refusal())
    expect(await screen.findByRole('alert')).toHaveTextContent('Only people in this organisation can read its company page.')
    expect(screen.queryByRole('button', { name: 'Ask about a check-in' })).toBeNull()
  })

  it('is not even asked for the company\'s handbook on company context', async () => {
    open(KOFI, '/company/context', refusal())
    expect(await screen.findByRole('alert')).toHaveTextContent('Only people in this organisation can read its company page.')
    expect(companyApi.cards).not.toHaveBeenCalled()
  })
})

describe('when there is nothing yet, or it fails', () => {
  it('says there are no priorities yet', async () => {
    open(GRACE, '/company', { ...GRACES, priorities: [] })
    expect(await screen.findByText('No priorities have come in from your organisation’s own systems yet.')).toBeInTheDocument()
  })

  it('says nothing has been added to company context yet', async () => {
    open(GRACE, '/company/context', { ...GRACES, priorities: [] }, [])
    expect(await screen.findByText('Nothing about how Baridi Appliances does things has been added yet.')).toBeInTheDocument()
  })

  it('says it did not load, and offers to try again', async () => {
    open(GRACE, '/company', new Error('network'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The company page did not load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('what nobody reads', () => {
  it('no ratings or labels on anybody, whoever reads it', async () => {
    for (const [who, served] of [[GRACE, GRACES], [MIRIAM, MIRIAMS]] as const) {
      const { unmount } = open(who, '/company', served)
      await screen.findByText(served.line!)
      expect(document.body.textContent).not.toMatch(/checkab|rating|score|\bPIP\b|exit/i)
      unmount()
    }
  })
})
