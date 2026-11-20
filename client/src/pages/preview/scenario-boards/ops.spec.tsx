import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './ops'

/**
 * The distribution operations example board, read against ops.txt of the prototype (docs/prototype is not in git, so the words are copied here as
 * literals). Every section is open, in the prototype's order, and its lists of records are real tables.
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}

describe('The distribution operations example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual(["Distribution operations", "What needs you in this check-in", "Every % on time, and what shows it", "The team today", "Incidents by site and type, last 8 weeks", "By site", "Who checked in", "Blockers", "What keeps coming up", "Over time", "Reports", "Asked of Operations by other teams", "The other boards you’re in", "Where this is heading"])
    expect(screen.getByText('Where each target stands')).toBeTruthy()
    expect(screen.getByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText('The possible outcomes')).toBeTruthy()
    expect(screen.getAllByText('The signals behind them').length).toBeGreaterThan(0)
    expect(screen.getByText('What would settle it')).toBeTruthy()
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of ["Dispatch on time, every day, safely?", "95.8% of orders left on time this month. The target is 98%", "3 of this month’s 4 big problems had a cause we have seen before. Fixing the forklift in Mombasa would close most of the gap on its own.", "Downtime 9.5h against a 6h limit.", "4 of ≤ 3 a month", "Nairobi’s generator test is 2 months late", "Impact", "2.5h down; 14 orders late", "Darker cells repeat. A cell of 3 or more points to the site itself.", "94.1%", "Forklift 3 drives most of it.", "12 Sep, then 19 Sep (both missed)", "Buy from the second supplier if no date by Friday. Then: Forklift 3 fixed; most of Mombasa's downtime recovered", "Late dispatch on Mondays, for 3 weeks in a row", "Fixed for today, with nothing stopping the repeat.", "Sales: stock for Green Mart’s January order", "Asked by Wairimu, 16 Sept. The Mombasa depot’s count is due Friday.", "Operations lead decides."]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    for (const b of ["Record the decision", "Open in Sales", "Not right? Tell the check-in"]) expect(screen.getAllByRole('button', { name: b }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(5)
  })

  it('draws its record list as a real table, and folds nothing', () => {
    const { container } = draw()
    const table = screen.getByRole('table', { name: 'Every % on time, and what shows it' })
    expect(within(table).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(["Forklift 3 stopped: hydraulic leak", "Truck no-show on Monday", "Power outage; generator failed to start", "Mis-picked orders", "Loading bay flooded"].map((n) => expect.stringContaining(n)))
    expect(within(table).getAllByRole('columnheader').length).toBe(5)
    expect(within(table).getAllByRole('cell', { name: 'Add drain clearing to the plan' }).length).toBe(1)
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('names the tab row as the live product does, with no Context tab', () => {
    draw()
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
  })
})
