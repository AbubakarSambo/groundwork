import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Board from './loans'

/**
 * The asset loans example board, read against loans.txt of the prototype (docs/prototype is not in git, so the words are copied here as literals).
 * Every section open, in order, its lists as real tables, and the tab row says "References and resources", not "Context".
 */
function draw() {
  return render(<MemoryRouter><Board /></MemoryRouter>)
}
function noFolds(c: HTMLElement) { expect(c.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0) }
function says(list: string[]) { for (const t of list) expect(screen.getAllByText(t, { exact: false }).length, t).toBeGreaterThan(0) }

describe('the Asset loans, cohort 3 example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    expect([...container.querySelectorAll('h1, h2')].map((h) => h.textContent)).toEqual([
      'Asset loans, cohort 3', 'What needs you', 'Where the cohort stands', 'Every trader, and what shows it',
      'One person, a place, or the model?', 'Support given, and whether it helped', 'Where this is heading',
    ])
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.queryByText('Context')).toBeNull()
    noFolds(container)
  })
  it('says the prototype sentences and numbers', () => {
    draw()
    says([
      '40 traders, freezer loans. Weekly, on WhatsApp. Week 14 of 26.',
      'Is the cohort repaying, and why not where it isn’t?',
      '71% of what’s due is repaid, on proof from the repayment system. 9 traders are behind but still trading.',
      'Repayments from the repayment system; trading from photos and M-Pesa till totals traders chose to share.',
      '3 traders not heard from in 3 weeks', 'Field visits before anything else.',
      'Move 11 repayment dates after market day', 'Decide for the whole cohort, or trader by trader.',
      'Solar backup for Kisumu', '6 traders; the partner has offered units.',
      'Repaying on time; business operating on proof.', 'Selling, but the repayment date falls before market day.',
      'Power cuts in Kisumu market; freezers idle.', 'No check-in and no repayment for 3 weeks.',
      'Filled is proven; ringed is their word', '5 of 40 shown. Support given to each trader is on their page.',
      'Patterns named after three check-ins in a row', 'Repayment falls before market day',
      '11 traders say it, for 4 weeks in a row. The repayment system shows they pay two days late, then in full.',
      '6 traders, for 4 weeks in a row. Their freezers stand idle during cuts.',
      '3 traders with the 600L unit sell under half of it.',
      'Check how the same role is going: a lending cohort',
      'Only after field visits confirm they’ve stopped trading.', 'Repayment timing and freezer size.',
      'Late payers pay in full, two days late', 'From the repayment system', 'From 6 traders, 4 weeks', 'No check-ins, no repayments',
      'Field visits to the three silent traders, and a two-week trial of Monday repayment dates.',
      'The credit committee decides.', 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ])
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Your check-in' })).toBeTruthy()
  })
  it('draws the traders and the support as real tables, every row on the page', () => {
    draw()
    const traders = screen.getByRole('table', { name: 'Every trader, and what shows it' })
    expect(within(traders).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Trader', 'Business', 'Sales, 4 weeks', 'Repayment', 'What’s in the way, in their words', 'Next'])
    expect(within(traders).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Achieng OtienoKibuye, Kisumu', 'Musa AbdiEastleigh', 'Grace WambuiKibuye, Kisumu', 'Peter KipropGikomba', 'Halima NoorMombasa'])
    for (const c of ['KES 38,000', 'KES 52,000', 'KES 6,000', 'KES 41,000', '2 weeks behind', '3 weeks behind', 'Idle 9 days', 'Not heard', 'Power cuts: three this month', 'Move her date to Monday', 'Field visit this week', 'Solar backup, from the partner'])
      expect(within(traders).getAllByText(c).length, c).toBeGreaterThan(0)
    const support = screen.getByRole('table', { name: 'Support given, and whether it helped' })
    expect(within(support).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Bookkeeping training, week 4', 'Repayment reminders on WhatsApp', 'One-to-one visit'])
    expect(within(support).getByRole('cell', { name: 'Those who attended are 2 weeks less behind on average' })).toBeTruthy()
    expect(within(support).getByRole('cell', { name: '5 of 7 caught up within 3 weeks' })).toBeTruthy()
    expect(screen.getAllByText('The model').length).toBe(2)
    expect(screen.getByText('A place')).toBeTruthy()
  })
})
