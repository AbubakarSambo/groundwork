import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './support'

/**
 * The support desk example board, read against support.txt of the prototype (docs/prototype is not in git, so the words are copied here as
 * literals). Every section is open, in the prototype's order, and its lists of records are real tables.
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}

describe('The support desk example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual(["Support desk", "What needs you in this check-in", "Every ticket, and what shows it", "The team today", "Volume from the helpdesk, causes from the check-ins", "By queue", "Who checked in", "Blockers", "What keeps coming up", "Over time", "Reports", "The other boards you’re in", "Where this is heading"])
    expect(screen.getByText('Where each target stands')).toBeTruthy()
    expect(screen.getByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText('The possible outcomes')).toBeTruthy()
    expect(screen.getAllByText('The signals behind them').length).toBeGreaterThan(0)
    expect(screen.getByText('What would settle it')).toBeTruthy()
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of ["Resolve customer issues within a day, without reopening them?", "412 tickets this week. 91% were solved within a day", "The numbers come from the helpdesk, so they are proven. The open questions are why 7 tickets were passed to engineering and 17 were opened again.", "Check-ins covered 38 exceptions; the other 374 tickets needed no one's account.", "4.1% of ≤ 3%", "5 tickets are older than 48 hours", "Billing bug after a plan change (agent said, matched to engineering ticket)", "Tickets opened again: down from 6% to 3%", "Counts are proven by the helpdesk. Causes are the agents' accounts until engineering or the customer confirms them.", "Most reopens trace to the billing bug.", "Escalate to the engineering lead with the 9 tickets. Then: 9 tickets close and 2 escalations drop", "Closed before the customer confirmed the fix.", "Support lead decides."]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    for (const b of ["Record the decision", "Not right? Tell the check-in"]) expect(screen.getAllByRole('button', { name: b }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(5)
  })

  it('draws its record list as a real table, and folds nothing', () => {
    const { container } = draw()
    const table = screen.getByRole('table', { name: 'Every ticket, and what shows it' })
    expect(within(table).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(["#4812, Double charge after a plan change", "#4790, Password reset loop", "#4801, API timeout for one client", "#4833, Import failed", "#4776, Refund not received", "#4840, Webhook not firing"].map((n) => expect.stringContaining(n)))
    expect(within(table).getAllByRole('columnheader').length).toBe(5)
    expect(within(table).getAllByRole('cell', { name: 'Engineering to reproduce' }).length).toBe(1)
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('names the tab row as the live product does, with no Context tab', () => {
    draw()
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
  })
})
