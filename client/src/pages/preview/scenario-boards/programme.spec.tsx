import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProgrammeBoard from './programme'

/**
 * The Trader training programme's example board, read against programme.txt of the prototype (docs/prototype is not in git, so the
 * words are copied here as literals). Every section open, in order, its lists as real tables.
 */
function draw() {
  return render(<MemoryRouter><ProgrammeBoard /></MemoryRouter>)
}

describe('the Trader training programme example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual([
      'Trader training programme',
      '6,240 traders reached. 3,760 more are needed in 5 months',
      'What needs you in this check-in',
      'Every trader, and what shows it',
      'The team today',
      "Women's share by county, and drop-off by session",
      'By county',
      'Who checked in',
      'Blockers',
      'What keeps coming up',
      'Over time',
      'Reports',
      'The other boards you’re in',
      'Where this is heading',
    ])
    for (const t of ['Where each target stands', 'The possible outcomes', 'The signals behind them', 'What would settle it', 'About each person’s work', 'How what people say can run ahead of what happened', 'Drop-off by session', 'Women’s share by county; target 60%']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0)
    }
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of [
      '6 field officers in 3 counties. WhatsApp check-ins after each session.',
      'Train 10,000 market traders in financial skills, at least 60% of them women?',
      'Groups that have a training date will reach 2,100 more. The other 1,660 have no date yet.',
      'Women are 54% of those reached, against 60%.',
      'KES 11.2 million of ≤ KES 20 million',
      'KES 1,795 of ≤ KES 2,000',
      "Kevin's coaching is working (from 41% to 52%), but Nairobi is still below target.",
      'This comes from the targets.',
      'This comes from a blocker that keeps coming back.',
      'From the credible path',
      'Ringed is someone’s word; filled is proven. Select one for its detail',
      'Something here wrong? Anyone can correct what’s about their own work in their check-in; the change and the original both show here.',
      'Shares come from registration lists; attendance from sheet photos.',
      'Below the mix target; improving.',
      'Each person sees what’s about them, and can answer it in their own words.',
      'Check how the same role is going',
      'Programme lead decides.',
      'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Behind').length).toBe(2)
    expect(screen.getByText('Below')).toBeTruthy()
    expect(screen.getAllByText('Within').length).toBe(2)
    expect(screen.getAllByRole('button', { name: 'Open' }).length).toBe(8)
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not right? Tell the check-in' })).toBeTruthy()
  })

  it('draws every list of data as a real table, and folds nothing', () => {
    const { container } = draw()
    const proof = screen.getByRole('table', { name: 'Every trader, and what shows it' })
    expect(within(proof).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Group', 'Officer', 'Stage now', 'What shows it', 'Next'])
    expect(within(proof).getAllByRole('rowheader').length).toBe(6)
    expect(within(proof).getByRole('cell', { name: 'Hold session 3 off market day' })).toBeTruthy()
    expect(within(proof).getByRole('cell', { name: 'Attendance photos ×3' })).toBeTruthy()
    const team = screen.getByRole('table', { name: 'The team today' })
    expect(within(team).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Juma', 'Kevin', 'Achieng', 'Beatrice', 'Mwanaisha', 'Lydia'])
    expect(within(team).getByRole('cell', { name: '0 of 4 sessions with a photo' })).toBeTruthy()
    expect(within(team).getByRole('cell', { name: 'Nothing checkable' })).toBeTruthy()
    expect(within(team).getByRole('cell', { name: 'Groups under 60% women, for 3 weeks in a row' })).toBeTruthy()
    expect(within(team).getAllByRole('img').length).toBe(6)
    const checked = screen.getByRole('table', { name: 'Who checked in' })
    expect(within(checked).getAllByRole('rowheader').length).toBe(6)
    expect(screen.getByRole('table', { name: 'Reports' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'About each person’s work' })).toBeTruthy()
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })

  it('says each blocker with its history, and the other boards', () => {
    draw()
    for (const t of ['Kondele venue', 'Printed workbooks', 'Transport allowance for officers', 'Waiting on:', 'Raised:', 'Affects:', 'Promised:', 'What the proof shows:', 'Would clear it:',
      'Confirm by 15 Sep (missed)', 'No written confirmation', '3 times, 1 Sep to 23 Sep', 'Kondele session 3; 42 traders', 'Use the digital version on WhatsApp for now.', 'Rural Kilifi groups can be booked',
      'Every session', 'Sales team, Q3', 'Today’s report ready', 'Decide how it ends', 'Waiting on Omar', 'Both accounts in', 'Just started', 'Support named people', 'Change the programme', 'Act on one person',
      '49% of 2,310', '58% of 2,180', '61% of 1,750', 'Session 3, completed', '4,430', 'Mwanaisha, Lydia']) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Context')).toBeNull()
  })
})
