import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SalesorgBoard from './salesorg'

/**
 * The Sales org, Q3 example board, read against salesorg.txt of the prototype (docs/prototype is not in git, so the words are
 * copied here as literals). Every section open, in order, its lists as real tables.
 */
function draw() {
  return render(<MemoryRouter><SalesorgBoard /></MemoryRouter>)
}

describe('the Sales org, Q3 example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual([
      'Sales org, Q3',
      '87 of the 100 sales are done. 13 more are needed by 30 September',
      'What needs you in this check-in',
      'Every sale, and what shows it',
      'The team today',
      'Reported vs criteria met, across 4 teams',
      'By team',
      'Who checked in',
      'Blockers',
      'What keeps coming up',
      'Over time',
      'Reports',
      'The other boards you’re in',
      'Where this is heading',
    ])
    for (const t of ['Where each target stands', 'The possible outcomes', 'The signals behind them', 'What would settle it', 'About each person’s work', 'How what people say can run ahead of what happened']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0)
    }
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of [
      '20 reps in 4 teams. Daily check-ins. A head of sales and 4 team leads.',
      'Close 100 sales worth KES 8 million in Q3?',
      'Only 11 sales meet every rule and have a buying date before 30 September.',
      'Reported qualified: 299, criteria met: 165.',
      'KES 7.0 million of KES 8 million',
      '299 of 320',
      'Each of them missed 3 or more days in each of the last 2 weeks. Ask their team leads to talk with them.',
      'This comes from the rules for each sales stage.',
      'They are Kamau, Juma and Nekesa.',
      'for 2 weeks in a row.',
      'Ringed is someone’s word; filled is proven. Select one for its detail',
      'KES 180,000',
      'Outlined: what people reported. Filled: what meets the criteria.',
      'Dashed: reported. Solid: criteria met (for Won, proven by payment).',
      'Sorted by team. A gap is a missed session.',
      'Each person sees what’s about them, and can answer it in their own words.',
      'Set goals and keep the team on track',
      'Head of sales decides.',
      'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('Not settled')).toBeTruthy()
    expect(screen.getAllByText('Close').length).toBe(4)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(8)
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
  })

  it('draws every list of data as a real table, and folds nothing', () => {
    const { container } = draw()
    const proof = screen.getByRole('table', { name: 'Every sale, and what shows it' })
    expect(within(proof).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Deal', 'Rep', 'Stage now', 'What shows it', 'Next'])
    expect(within(proof).getAllByRole('rowheader').length).toBe(7)
    expect(within(proof).getByRole('cell', { name: 'Hold 30 Sep as the date' })).toBeTruthy()
    expect(within(proof).getByRole('cell', { name: 'Rep said, all four' })).toBeTruthy()
    const team = screen.getByRole('table', { name: 'The team today' })
    const names = within(team).getAllByRole('rowheader').map((c) => c.textContent)
    expect(names.length).toBe(20)
    expect(names.slice(0, 7)).toEqual(['Kamau', 'Omondi', 'Juma', 'Otieno', 'Baraka', 'Nekesa', 'Wafula'])
    expect(names[19]).toBe('Adhiambo')
    expect(within(team).getAllByRole('cell', { name: 'On pace' }).length).toBe(13)
    expect(within(team).getByRole('cell', { name: 'Stops before the date' })).toBeTruthy()
    expect(within(team).getByRole('cell', { name: 'Customers called “interested”, with no need or budget given, for 2 weeks in a row' })).toBeTruthy()
    expect(within(team).getAllByText('6 of 5 sales').length).toBe(3)
    expect(within(screen.getByRole('table', { name: 'Who checked in' })).getAllByRole('rowheader').length).toBe(20)
    expect(screen.getByRole('table', { name: 'Reports' })).toBeTruthy()
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('says the stages, the teams and the blockers', () => {
    draw()
    for (const t of ['1,480 said, 1,310 met', '760 met', '590 said, 350 met', '299 said, 165 met', '260 said, 140 met', '87 said, 71 met',
      'Westlands', 'Industrial Area', 'Mombasa', 'Kisumu', '21/25', '22/25', '20/25', '19/25', 'Otieno: behind the pace', 'Omondi: nothing checkable', 'Nekesa: stops before the date', 'Wanjiru, Otieno, Achieng, Kamau, Njeri',
      'Stock of 600L freezers', 'Price objections', 'Stopping rule for old leads', '9 times, 14 Sep to 23 Sep', '11 deals across 3 teams', 'Unverified: few give a competitor or figure', 'Decide by 20 Sep (missed)', 'Reps move time to new leads',
      'Every session', 'Sales team, Q3', 'Today’s report ready', 'Waiting on Omar', 'Activity for outcome', 'Visits reported without names.', 'On course', 'Reach it with a change', 'Change the target']) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Context')).toBeNull()
  })
})
