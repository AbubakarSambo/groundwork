import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReferencesAndResourcesPage } from './ReferencesAndResources'
import { groundsApi } from '@/api/grounds'
import { theContextTabsName } from '@/lib/the-references-tab'

/**
 * REFERENCES AND RESOURCES, AS EACH READER READS IT (Release 1B, pull request 2 of 3). The sales check-in of the B6 pictures,
 * "Sales team, Q4" at Drop Access, rendered from what the server serves each reader (the payloads are the server's, word for
 * word, as references-and-resources-as-each-reader-is-served-it.spec.ts proves them):
 *  - Grace Achieng, who runs it, reads every section in the pictures' order, with Add, her suggestions and People;
 *  - Kevin, a team member, reads the same sections without Add, suggestions or People, and only his own evidence;
 *  - with the organisation's switch off, the tab keeps its old name.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return {
    ...actual,
    groundsApi: {
      ...actual.groundsApi,
      referencesAndResources: vi.fn(),
      referencesEvidence: vi.fn(),
      baselineHistory: vi.fn(async () => [{ id: 'b1', successLooksLike: '120 dispensers sold with proof by 31 December.', conditions: [], changeReason: null, version: 1, statedAt: '2026-10-01T08:00:00Z', statedBy: 'Grace' }]),
    },
  }
})

const ABOUT = {
  purpose: 'Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.',
  whose: 'Grace, at setup',
  keyFacts: [
    { id: 'f1', label: 'Customers', fact: 'Hardware shops and schools, Nairobi and Kiambu' },
    { id: 'f2', label: 'Product', fact: '20 L dispenser, KES 4,500 list price' },
    { id: 'f3', label: 'Sold means', fact: 'A signed order or a payment, with proof' },
  ],
  alsoWorthKnowing: [],
  emptySays: null,
}
const HOW_WE_WORK = {
  rules: [{ id: 'r1', text: 'Drop a lead after three calls with no reply.' }, { id: 'r2', text: 'Discounts above 5% need Grace’s yes.' }],
  stageNeeds: [
    { id: 'template-stage-0', text: 'Qualified: need, budget, decision maker and buying date.', fromTheTemplate: true },
    { id: 'template-stage-1', text: 'Quoted: the customer has the quote, with a photo or the email.', fromTheTemplate: true },
    { id: 'template-stage-2', text: 'Won: a signed order or a payment, with proof.', fromTheTemplate: true },
  ],
  coaching: [{ id: 'c1', text: 'Name the next step and its day on every open deal.' }, { id: 'c2', text: 'Find the decision maker before quoting.' }],
  risks: [{ id: 'k1', text: 'A price below KES 4,200.' }, { id: 'template-risk-0', text: 'A deal marked won without a signed order or payment.', fromTheTemplate: true }],
  startingSetSays: 'Lines marked as Groundwork’s are the starting set for a sales team.',
}
const DOCS = [
  { id: 'd1', name: 'Q4 sales strategy.pdf', added: 'Grace, 1 October', addedOn: '2026-10-01', summary: 'Hardware shops first, schools before the January term.', whoCanSee: 'Everyone', kind: 'PDFs' },
  { id: 'd2', name: 'Juja Hardware price request.pdf', added: 'Joseph, 15 October', addedOn: '2026-10-15', summary: 'Asks for 20 units at KES 3,900; includes a competitor’s quote.', whoCanSee: 'Joseph and you', kind: 'PDFs' },
]
const ORDER = { id: 'e1', readAs: 'A signed order', shows: '25 units, signed 13 October.', belongsTo: 'Greenfield Hardware', addedBy: 'Mercy', addedById: 'p-mercy', addedOn: '16 October', on: '2026-10-16', countsAsProof: true, group: 'Orders and quotes' }
const PAYMENT = { id: 'e2', readAs: 'A payment', shows: 'KES 180,000, 12 October.', belongsTo: 'Kilele Supplies', addedBy: 'Kevin', addedById: 'p-kevin', addedOn: '12 October', on: '2026-10-12', countsAsProof: true, group: 'Payments' }

const SERVED_TO_GRACE = {
  on: true, view: 'lead', checkInName: 'Sales team, Q4', leadName: 'Grace Achieng', mayAdd: true, itemWord: 'deal',
  topLine: 'Your team’s reference for this work. They can read it, except People. Only you can add to it.',
  about: ABOUT,
  suggested: [{ id: 'pp1', what: 'a rule', from: 'From Q4 plan.pdf, 14 October', says: 'Lowest price: KES 4,200 a unit. Anything lower needs Grace’s yes.', saidAs: 'Never go below 4,200 a unit without asking me.' }],
  howWeWork: HOW_WE_WORK,
  documents: { total: 2, items: DOCS, notOpenToYou: false },
  evidence: { total: 2, page: 1, pageSize: 25, items: [ORDER, PAYMENT], people: [{ id: 'p-kevin', name: 'Kevin' }, { id: 'p-mercy', name: 'Mercy' }] },
  evidenceSays: 'Photos, slips and documents your team added as proof. Each also shows on the board.',
  questions: { total: 0, items: [], emptySays: 'Nobody has asked about this work yet. Questions asked with Ask about this work will show here, with their answers.' },
  people: [
    { participantId: 'p-kevin', name: 'Kevin Omondi', role: 'Rep, Nairobi hardware', note: { id: 'n1', text: 'Closes well. Doesn’t write down next steps.' }, helpWith: { id: 'h1', text: 'A next step and a day on every deal.' }, earlier: [] },
    { participantId: 'p-mercy', name: 'Mercy Wairimu', role: 'Rep, Kiambu and schools', note: null, helpWith: null, earlier: ['Wants to grow into school accounts.'] },
  ],
}
const SERVED_TO_KEVIN = {
  on: true, view: 'member', checkInName: 'Sales team, Q4', leadName: 'Grace Achieng', mayAdd: false, itemWord: 'deal',
  topLine: 'Your team’s reference for this work, kept by Grace.',
  about: ABOUT,
  howWeWork: HOW_WE_WORK,
  documents: { total: 1, items: [DOCS[0]], notOpenToYou: false },
  evidence: { total: 1, page: 1, pageSize: 25, items: [{ ...PAYMENT, addedBy: 'You' }], people: [] },
  evidenceSays: 'Proof you added in your check-ins. Each also shows on the board.',
  questions: { total: 0, items: [], emptySays: 'Nobody has asked about this work yet. Ask about this work, and the question and its answer will show here.' },
}

const GROUND = { id: 'g-sales', label: 'Sales team, Q4', release1bTabsOn: true, contextEnabled: true, createdAt: '2026-10-01T08:00:00Z' }

function renderAs(served: any, isTheLead: boolean) {
  ;(groundsApi.referencesAndResources as any).mockResolvedValue(served)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReferencesAndResourcesPage groundId="g-sales" ground={GROUND} isTheLead={isTheLead} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

beforeEach(() => vi.clearAllMocks())

describe('Grace, who runs it, reads every section in the pictures’ order', () => {
  it('the top line, Ask about this work and Add, then the sections in order, People last', async () => {
    renderAs(SERVED_TO_GRACE, true)
    await screen.findByText(SERVED_TO_GRACE.topLine)
    expect(screen.getByRole('button', { name: 'Ask about this work' })).toBeTruthy()
    /* Add in the top bar first; then on her one suggestion, and for Mercy's note and what to help her with, which are empty. */
    const adds = screen.getAllByRole('button', { name: 'Add' })
    expect(adds).toHaveLength(4)
    expect(adds[0].closest('[data-gw-references-top]')).toBeTruthy()
    await screen.findByText('120 dispensers sold with proof by 31 December.')
    expect(headings()).toEqual([
      'About this work', 'What doing well looks like', 'Suggested from your check-ins', 'How we work', 'Documents', 'Evidence', 'Questions and answers', 'People',
    ])
  })

  it('About this work in her words, with the three key facts; How we work with its four lists', async () => {
    renderAs(SERVED_TO_GRACE, true)
    await screen.findByText('“Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.”')
    expect(screen.getByText('Grace, at setup')).toBeTruthy()
    expect(screen.getByText('Hardware shops and schools, Nairobi and Kiambu')).toBeTruthy()
    expect(screen.getByText('Check-ins use these to guide each person and to know what to ask about.')).toBeTruthy()
    for (const t of ['Rules', 'What each stage needs', 'Coaching', 'Risks to watch for']) expect(screen.getByRole('heading', { name: t })).toBeTruthy()
    expect(screen.getByText('Find the decision maker before quoting.')).toBeTruthy()
    expect(screen.getByText('Qualified: need, budget, decision maker and buying date.')).toBeTruthy()
    expect(screen.getAllByText('Groundwork’s').length).toBe(4)
  })

  it('her suggestion with Add, Edit and Dismiss, and People with her note on each person', async () => {
    renderAs(SERVED_TO_GRACE, true)
    await screen.findByText('From Q4 plan.pdf, 14 October, a rule.')
    expect(screen.getByText('Lowest price: KES 4,200 a unit. Anything lower needs Grace’s yes.')).toBeTruthy()
    expect(screen.getByText('The plan says “Never go below 4,200 a unit without asking me.”')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy()
    expect(screen.getByText('Only you see this. Your notes on each person. They never see them. Their check-ins do not use them yet.')).toBeTruthy()
    expect(screen.getByText('Closes well. Doesn’t write down next steps.')).toBeTruthy()
    expect(screen.getByText('A next step and a day on every deal.')).toBeTruthy()
    expect(screen.getByText('Written before References and resources. Their check-ins do not use these.')).toBeTruthy()
  })

  it('Documents with who can see each, and every piece of evidence with what it belongs to', async () => {
    renderAs(SERVED_TO_GRACE, true)
    await screen.findByText('Juja Hardware price request.pdf')
    expect(screen.getByText('2 documents.')).toBeTruthy()
    expect(screen.getByText('Joseph and you')).toBeTruthy()
    expect(screen.getByText('2 pieces of evidence. Photos, slips and documents your team added as proof. Each also shows on the board.')).toBeTruthy()
    expect(screen.getByText('Greenfield Hardware')).toBeTruthy()
    expect(screen.getByText('Newest first. 1 to 2 of 2.')).toBeTruthy()
    expect(screen.getByText('On the board, each deal shows its own evidence, so nobody has to scroll this list to find it.')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Person' })).toBeTruthy()
  })
})

describe('Kevin, a team member, never reads People, and cannot add', () => {
  it('the same sections without Suggested or People, and no Add', async () => {
    renderAs(SERVED_TO_KEVIN, false)
    await screen.findByText('Your team’s reference for this work, kept by Grace.')
    await screen.findByText('120 dispensers sold with proof by 31 December.')
    expect(headings()).toEqual(['About this work', 'What doing well looks like', 'How we work', 'Documents', 'Evidence', 'Questions and answers'])
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ask about this work' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('Closes well')
    expect(document.body.textContent).not.toContain('Juja Hardware price request.pdf')
  })

  it('his own evidence, said as his, with no filter by person', async () => {
    renderAs(SERVED_TO_KEVIN, false)
    await screen.findByText('1 piece of evidence. Proof you added in your check-ins. Each also shows on the board.')
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Person' })).toBeNull()
  })
})

describe('with the switch off', () => {
  it('the tab keeps the name it had, and is renamed only where the switch is on', () => {
    expect(theContextTabsName({ release1bTabsOn: false }, 'Context and resources')).toBe('Context and resources')
    expect(theContextTabsName(null, 'Documents')).toBe('Documents')
    expect(theContextTabsName({ release1bTabsOn: true }, 'Context and resources')).toBe('References and resources')
  })

  it('the page draws nothing when the server says the switch is off', async () => {
    ;(groundsApi.referencesAndResources as any).mockResolvedValue({ on: false })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(<QueryClientProvider client={qc}><MemoryRouter><ReferencesAndResourcesPage groundId="g-sales" ground={GROUND} isTheLead /></MemoryRouter></QueryClientProvider>)
    await waitFor(() => expect(groundsApi.referencesAndResources).toHaveBeenCalled())
    await waitFor(() => expect(container.textContent).toBe(''))
  })
})
