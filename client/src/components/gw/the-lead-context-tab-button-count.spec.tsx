import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn(), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { planCardsWaiting: vi.fn(), contextChat: vi.fn(), confirmContext: vi.fn(), readAPlan: vi.fn(), update: vi.fn() },
}))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  ...['David', 'Samuel', 'Brian', 'Miriam', 'Aisha'].map((n, i) => ({ id: `p${i}`, userId: `u${i}`, partyType: 'PARTY', user: { firstName: n, lastName: 'X' } })),
]
const card = (id: string, says: string) => ({ id, kind: 'rule', says, heading: 'A rule, from your check-in on 22 September. It would go in how we work.', fromThePlan: 'x', landsIn: 'How we work' })

/** The e2e's own rule (e2e/the-prototype-count-of-buttons.spec.ts): buttons only, a quiet text link is a link, a tab or a switch is not a button, and a label seen three times or more counts once. */
function countedButtons(): string[] {
  const nodes = [...document.querySelectorAll('button')].filter((e) => {
    if (e.classList.contains('gwui-plain-link')) return false
    const role = e.getAttribute('role')
    if (role === 'switch' || role === 'checkbox' || role === 'tab' || e.closest('[role="tablist"]')) return false
    return true
  })
  const labels = nodes.map((e) => (e.textContent || '').trim().slice(0, 40))
  const times = new Map<string, number>()
  labels.forEach((l) => times.set(l, (times.get(l) ?? 0) + 1))
  const seen = new Set<string>()
  return labels.filter((l) => {
    if ((times.get(l) ?? 0) < 3) return true
    if (seen.has(l)) return false
    seen.add(l)
    return true
  })
}

/*
 * THE LEAD'S CONTEXT TAB HAS NO MORE BUTTONS THAN THE PROTOTYPE'S (request 148, part 2).
 *
 * The prototype's Context screen for the lead (docs/prototype/screens/B2-context/context.txt) has 16
 * buttons under the e2e's own counting rule (counted by opening the prototype with that rule: Upload a
 * plan, Send, Confirm, Edit and Not now on two cards, Rewrite, Change, Decide twice, Change who sees
 * them, Notes on 5 others, and the page's own two at the top). The product had 18. Hafsah's rule of 30
 * September: something that sends or changes something stays a button; something that only opens a
 * form, hides one or hands a sentence to the chat is a quiet text link. So "Paste a plan instead",
 * "Close", "Say what it assumes", "Something agreed on a call" and the choice of kind of line behind
 * "Add a line" are links now, and every one of them is still on the page. "Upload a plan", "Send", the
 * paperclip, "Delete", "Attach it" and "Attach something" send a file or change something, so they stay
 * buttons. This page alone is kept two under 16, because the check-in's own header and the "Attach it"
 * and "Attach something" of a lead who has promised something add to it on the live page.
 */
it('has room under the prototype\'s sixteen, and every action is still on the page', async () => {
  ;(documentsApi.list as any).mockResolvedValue([
    { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: true, usedFor: 'Checks the product and price in each deal' },
    { id: 'd2', name: 'Sales playbook.docx', uploadedAt: '2026-09-02T10:00:00Z', visibility: 'OPEN', mine: true },
    { id: 'd3', name: 'Q3 price list.pdf', uploadedAt: '2026-09-20T10:00:00Z', visibility: 'OWN', mine: true },
  ])
  ;(groundsApi.planCardsWaiting as any).mockResolvedValue({ proposals: [card('c1', 'Drop a lead after 3 follow-ups'), card('c2', 'Samuel: 10 new leads a week')] })
  ;(groundsApi.contextChat as any).mockResolvedValue({ say: 'How did the week feel?', done: false })
  const ground = {
    id: 'g1', contextEnabled: true, brief: 'Twenty-five freezer sales this quarter.', briefIsTheLeadsOwnWords: true, participants: people,
    objectives: [{ id: 'o1', name: 'Sales', target: 25, visibility: 'ALL' }, { id: 'o2', name: 'Revenue', target: 2000000 }],
    contextItems: [
      { id: 'i1', kind: 'DEFINITION', text: 'Qualified: need, budget, decision maker, buying date.', status: 'CONFIRMED' },
      { id: 'i2', kind: 'DEFINITION', text: 'Quoted: a quote the customer received.', status: 'CONFIRMED' },
      { id: 'i3', kind: 'DEFINITION', text: 'Sold: paid or deposit.', status: 'CONFIRMED' },
      { id: 'i4', kind: 'OPEN_QUESTION', text: 'Does a price range count as a budget?', status: 'OPEN' },
    ],
    commitments: [], leadContextNotes: [],
  }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><ContextPage ground={ground as any} role="lead" viewerUserId="u-lead" /></QueryClientProvider>)
  // The documents list draws the name in <strong>; the lead's own folded card lists it again under "Your files" (2ce613cf3).
  await screen.findByText('Q3 price list.pdf', { selector: 'strong' })
  await new Promise((r) => setTimeout(r, 200))
  const labels = countedButtons()
  expect(labels.length, labels.join(' | ')).toBeLessThanOrEqual(14)
  for (const stillThere of ['Paste a plan instead', 'Close', 'Add a line', 'Something agreed on a call']) {
    expect(screen.getByRole('button', { name: stillThere }).classList.contains('gwui-plain-link'), stillThere).toBe(true)
  }
  for (const stillAButton of ['Upload a plan', 'Send', 'Delete']) {
    expect(screen.getAllByRole('button', { name: stillAButton })[0].classList.contains('gwui-plain-link'), stillAButton).toBe(false)
  }
})
