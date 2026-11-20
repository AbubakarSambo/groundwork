import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './eng'

/**
 * The engineering release example board, read against eng.txt of the prototype (docs/prototype is not in git, so the words are copied here as
 * literals). Every section is open, in the prototype's order, and its lists of records are real tables.
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}

describe('The engineering release example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual(["Engineering release", "What needs you in this check-in", "Every task, and what shows it", "The team today", "Reported vs evidence, stage by stage", "By area of work", "Who checked in", "Blockers", "What keeps coming up", "Over time", "Reports", "The other boards you’re in", "Where this is heading"])
    expect(screen.getByText('Where each target stands')).toBeTruthy()
    expect(screen.getByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText('The possible outcomes')).toBeTruthy()
    expect(screen.getAllByText('The signals behind them').length).toBeGreaterThan(0)
    expect(screen.getByText('What would settle it')).toBeTruthy()
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of ["Deliver the major release by 30 September?", "People say 96 of the 100 tasks are done. 4 tasks that the release needs are still left", "None of the tasks has been released yet. 3 of the 4 tasks left are waiting for other people.", "Reported: 96% of tasks done, 94% of features tested.", "86% of 90%", "78% of 95%", "Two things the team waits for have nobody responsible for them", "It was promised for 15 September. 2 of Samuel’s tasks are waiting for it.", "He says “worked on it”, but gives no error, code link or what he tried.", "18 said, 7 met", "96 tasks are reported complete with no stage evidence. The solid bars fill once check-ins link the pull request, test run and deploy.", "4 times, 8 Sep to 23 Sep", "Would clear it:", "Release scope if dependencies slip", "Problems reported late, for 2 weeks in a row", "Work called finished with no deploy or usage evidence.", "Named owners, with dates, for the API format and the data structure by Friday.", "The engineering lead decides.", "Groundwork lays out the outcomes and the proof. It doesn’t choose."]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    for (const b of ["Record the decision", "Not right? Tell the check-in"]) expect(screen.getAllByRole('button', { name: b }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(5)
  })

  it('draws its record list as a real table, and folds nothing', () => {
    const { container } = draw()
    const table = screen.getByRole('table', { name: 'Every task, and what shows it' })
    expect(within(table).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(["Payment integration", "Login fix", "Dashboard filter", "Customer API", "API migration", "Reporting system", "Permissions"].map((n) => expect.stringContaining(n)))
    expect(within(table).getAllByRole('columnheader').length).toBe(5)
    expect(within(table).getAllByRole('cell', { name: 'Link the merged change' }).length).toBe(1)
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('names the tab row as the live product does, with no Context tab', () => {
    draw()
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
  })
})
