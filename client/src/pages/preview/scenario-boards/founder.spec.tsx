import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './founder'

/**
 * The founder’s own check-in example board, read against founder.txt of the prototype (docs/prototype is not in git, so the words are copied here as
 * literals). Every section is open, in the prototype's order, and its lists of records are real tables.
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}

describe('The founder’s own check-in example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual(["Founder’s own check-in", "What needs you in this check-in", "Every item, and what shows it", "Said vs happened, week by week", "Blockers", "What keeps coming up", "Over time", "Reports", "The other boards you’re in", "Where this is heading"])
    expect(screen.getByText('Where each target stands')).toBeTruthy()
    expect(screen.getByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText('The possible outcomes')).toBeTruthy()
    expect(screen.getAllByText('The signals behind them').length).toBeGreaterThan(0)
    expect(screen.getByText('What would settle it')).toBeTruthy()
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of ["Raise a seed round and reach KES 10 million contracted revenue by December?", "KES 4.2 million is signed. 5.8 million more is needed by December", "KES 2.1 million is in deals with a signed letter of intent. The rest depends on your own view of the deals.", "Sales not yet closed: KES 18 million, by his own estimate.", "KES 4.2 million of KES 10 million", "11 months of ≥ 9 months", "Monday calls with outside people keep moving to the next week", "4 of the 5 trial customers chose to pay every month. Decide whether that becomes the normal choice.", "Investor C: waiting on updated financials", "Held: 4 of 5", "Not yet: 0 co-sold deals", "Said, done, carried, dropped per week. Done needs proof where it exists.", "Nothing yet.", "External commitments parked with no date.", "Deals counted without a letter of intent.", "You decide."]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    for (const b of ["Record the decision", "Not right? Tell the check-in"]) expect(screen.getAllByRole('button', { name: b }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(5)
  })

  it('draws its record list as a real table, and folds nothing', () => {
    const { container } = draw()
    const table = screen.getByRole('table', { name: 'Every item, and what shows it' })
    expect(within(table).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(["Send the data room to 3 investors", "Call the distributor about pilot terms", "Hire a sales lead, not two reps", "Assumption: SMEs prefer monthly billing", "Board update"].map((n) => expect.stringContaining(n)))
    expect(within(table).getAllByRole('columnheader').length).toBe(5)
    expect(within(table).getAllByRole('cell', { name: 'Put a date on it, or drop it' }).length).toBe(1)
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('names the tab row as the live product does, with no Context tab', () => {
    draw()
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
  })
})
