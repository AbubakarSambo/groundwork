import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyPage } from './CompanyPage'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import type { CompanyPage as Page, TheDesk, NotYourDesk } from '@/api/company'

/**
 * THE DESK (S7, 20 November 2026; the Company page renamed, D2, #/company), AS EACH PERSON SEES IT. What each person is
 * served is tested on the server (api/src/modules/grounds/the-desk-as-each-reader-reads-it.spec.ts and
 * the-company-page-as-each-reader-reads-it.spec.ts). Here: what each person reads, top to bottom, and what the page never
 * says.
 *
 * CHANGED FOR THE DESK (S7): company context (#/company/context) is folded into this page and its own tests moved here.
 * It drew the priorities a second time, with "Owner:" as a colon label, "Leadership only" as a tag and a privacy note
 * under the heading; the Desk draws the priorities once, says who owns each in a sentence, and carries no privacy
 * notes. A guest was shown the server's 403 as an error; the server now serves them one plain sentence instead.
 */
vi.mock('@/api/company', () => ({ companyApi: { get: vi.fn(), document: vi.fn(), addDocument: vi.fn() } }))
vi.mock('@/api/direction', () => ({ directionApi: { read: vi.fn(async () => ({ on: false })) } }))
vi.mock('@/api/policy', () => ({ policyApi: { board: vi.fn(async () => ({ on: false })) } }))
import { companyApi } from '@/api/company'

const DESK: TheDesk = {
  documents: [
    { key: 'desk:leave-policy', title: 'Leave policy', summary: 'Everyone has 21 days of leave a year. Ask your manager at least two weeks before you go.', added: 'Grace Wanjiru added this on 19 November 2026.' },
    { key: 'policy-board', title: 'Baridi Appliances’ policy board', summary: null, added: null },
  ],
  directory: [
    { id: 'u-g', name: 'Grace Wanjiru', jobTitle: 'Chief executive', team: null, reportsTo: null, phone: '+254700000001' },
    { id: 'u-m', name: 'Miriam Otieno', jobTitle: 'Sales rep', team: 'Sales', reportsTo: 'Wairimu Kamau', phone: null },
    { id: 'u-w', name: 'Wairimu Kamau', jobTitle: null, team: 'Sales', reportsTo: 'Grace Wanjiru', phone: '+254700000003' },
  ],
  mayAdd: true,
}

/* What an admin is served: every priority, with what success looks like, and the Desk. */
const GRACES: Page = {
  name: 'Baridi Appliances',
  line: '2 teams and 5 people work here, and there were 3 check-ins this week.',
  readsTargets: true,
  priorities: [
    { id: 's1', number: 1, title: 'Grow revenue 50%, enterprise first', owner: 'Wairimu Kamau', tag: null, fedBy: 'Fed by Sales team, Q3', staleSays: null, measure: 'Qualified enterprise deals', target: '12 this quarter' },
    { id: 's2', number: 2, title: 'Improve delivery', owner: 'Otieno Ouma', tag: null, fedBy: 'Fed by Operations, Q3', staleSays: 'This was last updated on 28 August.', measure: 'On-time delivery', target: '95%' },
    { id: 's3', number: 3, title: 'Build a stronger organisation', owner: null, tag: 'Nobody owns it yet', fedBy: 'No team feeds it', staleSays: null, measure: null, target: null },
  ],
  desk: DESK,
}
/* What a lead is served: no targets, and she may add a document. */
const WAIRIMUS: Page = { ...GRACES, line: '2 teams, 5 people.', readsTargets: false, priorities: GRACES.priorities.map(({ measure: _m, target: _t, ...p }) => p), desk: { ...DESK, mayAdd: true } }
/* What a member is served: the same priorities, no targets, no count of check-ins, only the check-in she is in, and she may not add. */
const MIRIAMS: Page = {
  name: 'Baridi Appliances',
  line: '2 teams, 5 people.',
  readsTargets: false,
  priorities: GRACES.priorities.map(({ measure: _m, target: _t, ...p }) => ({ ...p, fedBy: p.number === 2 ? null : p.fedBy })),
  desk: { ...DESK, mayAdd: false },
}
const KOFIS: NotYourDesk = { name: 'Baridi Appliances', outsider: 'The Desk is for the people who work at Baridi Appliances, so there is nothing here for you to read. You can still open any check-in you were added to.' }

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const KOFI = { id: 'u-k', firstName: 'Kofi', role: 'GUEST', organizationName: 'Baridi Appliances' }

function open(user: any, served: Page | NotYourDesk | Error) {
  if (served instanceof Error) (companyApi.get as any).mockRejectedValue(served)
  else (companyApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/company']}><CompanyPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const priority = (n: number) => screen.getByRole('region', { name: `Priority ${n}` })
const sections = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)

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
    open(GRACE, onlyMeasure)
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
    open(GRACE, { ...GRACES, priorities: [{ ...GRACES.priorities[0], measure: null, target: '3 by 31 December 2026' }] })
    expect(await within(await screen.findByRole('region', { name: 'Priority 1' })).findByText('The target is 3 by 31 December 2026.')).toBeInTheDocument()
  })

  it('Miriam, served no measure, target or levels, reads none and no empty heading', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(document.body.textContent).not.toMatch(/measured by|the target is|What each level understood/)
  })

  it('a priority with only itself in its levels and nothing changed draws no list', async () => {
    open(GRACE, { ...GRACES, priorities: [{ ...GRACES.priorities[0], levels: [LEVELS[0]] }] })
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(screen.queryByText('What each level understood')).toBeNull()
  })
})


describe('Grace, an admin, reads the Desk top to bottom', () => {
  it('the shared context first, then the directory, then the strategy, each drawn once', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByText('2 teams and 5 people work here, and there were 3 check-ins this week.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Baridi Appliances' })).toBeInTheDocument()
    expect(screen.getByText('Desk')).toBeInTheDocument()
    expect(screen.getByText('This is where Baridi Appliances keeps its policies, handbook, procedures and documents, and a list of everyone who works here.')).toBeInTheDocument()
    expect(sections()).toEqual(['Policies, handbook and documents', 'Who works here', 'Is the strategy moving?'])
    /* The priorities are drawn once: there is no second page, and no link to one. */
    expect(screen.getAllByRole('region', { name: 'Priority 1' })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Company context' })).toBeNull()
  })

  it('reads each document with its kept summary and who added it, and opens it in full', async () => {
    ;(companyApi.document as any).mockResolvedValue({ key: 'desk:leave-policy', title: 'Leave policy', summary: null, text: 'Leave\n\nEveryone has 21 days of leave a year.' })
    open(GRACE, GRACES)
    const docs = await screen.findByRole('list', { name: 'Baridi Appliances documents' })
    const items = [...docs.querySelectorAll(':scope > li')].map(li => li.textContent)
    expect(items).toEqual([
      'Leave policyEveryone has 21 days of leave a year. Ask your manager at least two weeks before you go.Grace Wanjiru added this on 19 November 2026.Read it in full',
      'Baridi Appliances’ policy boardThere is no summary of this document yet. Open it to read it in full.Read it in full',
    ])
    fireEvent.click(within(docs).getAllByRole('button', { name: 'Read it in full' })[0])
    expect(await screen.findByLabelText('Leave policy in full')).toHaveTextContent('Everyone has 21 days of leave a year.')
    expect(companyApi.document).toHaveBeenCalledWith('desk:leave-policy')
  })

  it('reads the directory in plain sentences, with phone numbers where people have them', async () => {
    open(GRACE, GRACES)
    const list = await screen.findByRole('list', { name: 'Who works here' })
    expect([...list.querySelectorAll(':scope > li')].map(li => li.textContent)).toEqual([
      'Grace WanjiruChief executive. Their phone number is +254700000001.',
      'Miriam OtienoSales rep in Sales. Reports to Wairimu Kamau.',
      'Wairimu KamauWorks in Sales. Reports to Grace Wanjiru. Their phone number is +254700000003.',
    ])
  })

  it('can add a document by pasting it, and is told when it is on the Desk', async () => {
    ;(companyApi.addDocument as any).mockResolvedValue({ key: 'desk:travel', title: 'Travel', summary: 'Book travel five working days ahead.' })
    open(GRACE, GRACES)
    const add = await screen.findByRole('region', { name: 'Add a document' })
    expect(within(add).getByText('Choose a file, or give it a title and paste the text. It is read, a short summary is written, and both are kept on the Desk.')).toBeInTheDocument()
    const button = within(add).getByRole('button', { name: 'Add it to the Desk' })
    expect(button).toBeDisabled()
    fireEvent.change(within(add).getByLabelText('Its title'), { target: { value: 'Travel' } })
    fireEvent.change(within(add).getByLabelText('Or paste the text'), { target: { value: 'Use the travel form five working days before you travel.' } })
    fireEvent.click(button)
    await waitFor(() => expect(companyApi.addDocument).toHaveBeenCalledWith({ file: null, title: 'Travel', text: 'Use the travel form five working days before you travel.' }))
    expect(await within(add).findByText('Travel is on the Desk now.')).toBeInTheDocument()
  })

  it('reads the server\'s own sentence when a document is refused', async () => {
    ;(companyApi.addDocument as any).mockRejectedValue(Object.assign(new Error('400'), { response: { data: { message: 'I could not find any words in Travel, so there is nothing to add. If it is a scan, try a copy that has the text in it.' } } }))
    open(GRACE, GRACES)
    const add = await screen.findByRole('region', { name: 'Add a document' })
    fireEvent.change(within(add).getByLabelText('Its title'), { target: { value: 'Travel' } })
    fireEvent.change(within(add).getByLabelText('Or paste the text'), { target: { value: ' x ' } })
    fireEvent.click(within(add).getByRole('button', { name: 'Add it to the Desk' }))
    expect(await within(add).findByRole('alert')).toHaveTextContent('I could not find any words in Travel, so there is nothing to add.')
  })

  it('reads each priority with who owns it in a sentence, and what success looks like', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'Is the strategy moving?' })
    expect(priority(1).textContent).toBe('Priority 1Grow revenue 50%, enterprise firstWairimu Kamau is responsible for this.Fed by Sales team, Q3It is measured by qualified enterprise deals, and the target is 12 this quarter.')
    expect(priority(2).textContent).toBe('Priority 2Improve deliveryOtieno Ouma is responsible for this.This was last updated on 28 August.Fed by Operations, Q3It is measured by on-time delivery, and the target is 95%.')
    expect(priority(3).textContent).toBe('Priority 3Nobody owns it yetBuild a stronger organisationNo team feeds it')
  })

  it('the one button opens Ask, on the organisation', async () => {
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('button', { name: 'Ask about the whole organisation' }))
    expect(useAskStore.getState().open).toBe(true)
  })

  it('reads the engine\'s parts once they are served, in the prototype\'s words, with no privacy note', async () => {
    open(GRACE, {
      ...GRACES,
      priorities: [{ ...GRACES.priorities[1], reading: { tag: 'At risk', says: 'On time is 88% against 95%.' } }],
      notReaching: [{ id: 'o1', observation: 'Priority 3 has no owner and nothing underneath it', question: 'Who owns becoming less dependent on the founders?', forWhom: 'For you' }],
      namedByTeams: [{ id: 'n1', title: 'No way for customers to order in bulk', touches: 'Touches priorities 1 and 2. Nobody owns it.', teams: [{ team: 'Sales', says: '2 enterprise deals lost over it. Named in 5 check-ins.' }] }],
      saidAndShown: [{ id: 'r1', area: 'Revenue', youSaid: 'Enterprise first.', checkInsShow: '6 in 10 sales visits went to small shops.' }],
    })
    expect(await screen.findByText('On time is 88% against 95%.')).toBeInTheDocument()
    expect(within(priority(2)).getByText('At risk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Where the strategy isn’t reaching the work' })).toBeInTheDocument()
    expect(screen.getByText('For you')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Named by more than one team' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What you say, and where the time goes' })).toBeInTheDocument()
    expect(screen.getByText('“Enterprise first.”')).toBeInTheDocument()
    /* Changed (S7): "People appear here as counts. What each person said stays with them and their own lead." was a privacy note on screen. */
    expect(document.body.textContent).not.toContain('People appear here as counts')
  })

  it('draws none of the engine\'s parts while none is served', async () => {
    open(GRACE, GRACES)
    await screen.findByText('2 teams and 5 people work here, and there were 3 check-ins this week.')
    for (const h of ['Where the strategy isn’t reaching the work', 'Named by more than one team', 'What you say, and where the time goes', 'Kept from check-ins']) {
      expect(screen.queryByRole('heading', { name: h })).toBeNull()
    }
  })

  it('reads what was kept from check-ins, as a plain line with where it came from, and no note on who reads it', async () => {
    open(GRACE, { ...GRACES, whatWeKeep: { items: [{ id: 'm1', kind: 'rule', says: 'Every quote over 1 million needs Amina’s sign-off', source: 'Picked up from your check-in on 22 September' }] } })
    const list = await screen.findByRole('list', { name: 'Kept from check-ins' })
    expect(list.textContent).toBe('Every quote over 1 million needs Amina’s sign-off.Picked up from your check-in on 22 September')
    expect(screen.queryByRole('button', { name: /Confirm|Not now/ })).toBeNull()
    expect(document.body.textContent).not.toMatch(/can read this|Everyone else cannot/)
  })
})

describe('Wairimu, a lead, reads the Desk', () => {
  it('can add a document, and reads no targets', async () => {
    open(WAIRIMU, WAIRIMUS)
    expect(await screen.findByRole('region', { name: 'Add a document' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('12 this quarter')
  })
})

describe('Miriam, a member, reads only what she is served', () => {
  it('reads the documents and the directory, but is not offered to add a document', async () => {
    open(MIRIAM, MIRIAMS)
    expect(await screen.findByText('Leave policy')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Who works here' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Add a document' })).toBeNull()
  })

  it('reads the priorities, no count of check-ins, no check-in she is not in, and no targets', async () => {
    open(MIRIAM, MIRIAMS)
    expect(await screen.findByText('2 teams, 5 people.')).toBeInTheDocument()
    expect(priority(1).textContent).toBe('Priority 1Grow revenue 50%, enterprise firstWairimu Kamau is responsible for this.Fed by Sales team, Q3')
    expect(priority(2).textContent).toBe('Priority 2Improve deliveryOtieno Ouma is responsible for this.This was last updated on 28 August.')
    expect(document.body.textContent).not.toContain('Operations, Q3')
    expect(document.body.textContent).not.toMatch(/check-ins this week|12 this quarter|Leadership only|What success looks like|Owner:/)
  })
})

describe('Kofi, a guest from another company', () => {
  it('reads one plain sentence, not an error, and nothing of the organisation', async () => {
    open(KOFI, KOFIS)
    expect(await screen.findByText(KOFIS.outsider)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ask about the whole organisation' })).toBeNull()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })
})

describe('when there is nothing yet, or it fails', () => {
  it('says there are no priorities, no documents and nobody listed yet', async () => {
    open(GRACE, { ...GRACES, priorities: [], desk: { documents: [], directory: [], mayAdd: false } })
    expect(await screen.findByText('No priorities yet.')).toBeInTheDocument()
    expect(screen.getByText('Nothing has been added to the Desk yet.')).toBeInTheDocument()
    expect(screen.getByText('Nobody is listed here yet.')).toBeInTheDocument()
  })

  it('says it did not load, and offers to try again', async () => {
    open(GRACE, new Error('network'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The Desk did not load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('what nobody reads', () => {
  it('no ratings or labels on anybody, no colon labels, no privacy notes, whoever reads it', async () => {
    for (const [who, served] of [[GRACE, GRACES], [WAIRIMU, WAIRIMUS], [MIRIAM, MIRIAMS]] as const) {
      const { unmount } = open(who, served)
      await screen.findByText(served.line!)
      const text = document.body.textContent ?? ''
      expect(text).not.toMatch(/checkab|rating|score|\bPIP\b|exit/i)
      expect(text).not.toMatch(/Owner:|Leadership only|leadership only|can read this|stays with them/)
      unmount()
    }
  })
})
