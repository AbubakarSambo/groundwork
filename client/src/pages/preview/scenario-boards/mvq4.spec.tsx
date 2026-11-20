import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './mvq4'

/**
 * The MarketView Q4 example board, read against mvq4.txt of the prototype (docs/prototype is not in git, so the words are copied here as literals).
 * Every section open, in order, its lists as real tables, and the tab row says "References and resources", not "Context".
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}
function noFolds(c: HTMLElement) { expect(c.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0) }
function says(list: string[]) { for (const t of list) expect(screen.getAllByText(t, { exact: false }).length, t).toBeGreaterThan(0) }

describe('the MarketView, Q4 example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    expect([...container.querySelectorAll('h1, h2')].map((h) => h.textContent)).toEqual(['MarketView, Q4', 'What needs you', 'What the systems show', 'Where this is heading'])
    expect(screen.getAllByText('Where what people said and the systems differ').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
    noFolds(container)
  })
  it('says the prototype sentences and numbers', () => {
    draw()
    says([
      'Sales and product. Daily, weekdays. Numbers from MarketView and Paystack.',
      'Will MarketView reach 40 paying subscribers and 200 weekly users this quarter?',
      'Not quite yet. 31 of 40 paid on Paystack; 162 of 200 weekly users.',
      'One sale named but not paid', 'Sahel Agro, due Friday. Asked in the check-in.',
      '9 subscriptions to go in 5 weeks', 'At this quarter’s pace, 36 is likely.', '2 renewals not paid', 'Both due this week.',
      'Updated this morning', 'Set goals and keep the team on track',
      'On course', 'Reach it with a change', 'Change the target',
      '31 of 40 paid, on Paystack', '9 to go in 5 weeks', 'Weekly users 162, up from 148', 'Sahel Agro, due Friday',
      'Whether Sahel Agro and the two renewals pay this week.', 'The head of sales decides.', 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ])
    expect(screen.getByText('Asked in check-in')).toBeTruthy()
    expect(screen.getByText('Matches')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
  })
  it('draws what the systems show as a real table with its column names', () => {
    draw()
    const t = screen.getByRole('table', { name: 'What the systems show' })
    expect(within(t).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Target', 'Goal', 'Now', 'Source', 'Against goal'])
    expect(within(t).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Paid subscriptions', 'Weekly active users', 'Reports downloaded', 'Renewals'])
    for (const c of ['40 this quarter', '418 this week', 'all 9 due', '162 of 200', 'Up 12%', '7 of 9']) expect(within(t).getByRole('cell', { name: c })).toBeTruthy()
    const d = screen.getByRole('table', { name: 'Where what people said and the systems differ' })
    expect(within(d).getByText('Sales said:')).toBeTruthy()
    expect(within(d).getByText('weekly users went up from 148 to 162', { exact: false })).toBeTruthy()
  })
})
