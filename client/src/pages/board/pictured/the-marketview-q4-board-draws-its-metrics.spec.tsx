import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TheMetricsTable, theMetricRows } from './TheMetricsBoard'

/**
 * MARKETVIEW, Q4: WHAT THE SYSTEMS SHOW (mvq4.jpg), as the lead reads it. A row for each metric: what a system sent is filled, what a
 * person said is ringed, a goal is only one a person stated, and a figure nobody said reads "Not said yet". Nothing is invented: no
 * number is worked out, and no goal is read out of a system's sentence.
 */
const numbers = [
  { key: 'paid_subscriptions', label: 'Paid subscriptions', source: 'Paystack', value: 31, unit: 'subscriptions', measuredAt: '2026-10-04', says: 'Paystack shows 31 ...' },
  { key: 'weekly_active_users', label: 'Weekly active users', source: 'MarketView', value: 162, unit: 'users', measuredAt: '2026-10-04', says: '...' },
  { key: 'weekly_active_users', label: 'Weekly active users', source: 'MarketView', value: 148, unit: 'users', measuredAt: '2026-09-27', says: '...' },
  { key: 'reports_downloaded', label: 'Reports downloaded', source: 'MarketView', value: 418, unit: 'downloads', measuredAt: '2026-10-04', says: '...' },
]
const people = [
  { id: 'm1', kind: 'metric', name: 'Paid subscriptions', saidBy: 'Otieno Mwangi', fields: { Said: '33', Goal: '40 this quarter' } },
  { id: 'm2', kind: 'metric', name: 'Renewals', saidBy: 'Otieno Mwangi', fields: { Said: '7 of 9', Source: 'Paystack' } },
  { id: 'm3', kind: 'metric', name: 'Trial sign-ups', saidBy: 'Achieng Odera', fields: { Goal: 'KES 2 million' } },
]
const data: any = { heading: 'What the systems show', state: 'filled', numbers, whatANumberIsNot: ['These came from your own systems and nobody here has checked them.'] }
const rowOf = (name: string) => within(screen.getByRole('table')).getAllByRole('row').find((r) => (r.textContent ?? '').includes(name))!

describe('one row for each metric', () => {
  it('joins a person\'s metric to the system\'s only where both are named in the same words', () => {
    const rows = theMetricRows(numbers, people)
    expect(rows.map((r) => r.name)).toEqual(['Paid subscriptions', 'Weekly active users', 'Reports downloaded', 'Renewals', 'Trial sign-ups'])
  })
  it('draws the system\'s figure with where it comes from, the person\'s figure beside it, and the stated goal', () => {
    render(<TheMetricsTable data={data} rows={people} />)
    const paid = rowOf('Paid subscriptions')
    for (const t of ['40 this quarter', '31 subscriptions', 'Otieno said 33', 'From Paystack, as of 4 October', '31 of 40']) expect(paid.textContent).toContain(t)
    expect(within(paid).getByRole('img', { name: 'Paid subscriptions, 31 of 40, shown by Paystack' })).toBeTruthy()
  })
  it('says "Not said yet" for a goal nobody stated and draws no bar for it', () => {
    render(<TheMetricsTable data={data} rows={people} />)
    const reports = rowOf('Reports downloaded')
    expect(reports.textContent).toContain('418 downloads')
    expect(reports.textContent).toContain('Not said yet')
    expect(within(reports).queryByRole('img')).toBeNull()
  })
  it('shows a repeated key once, as its latest figure, with the change from the earlier one', () => {
    render(<TheMetricsTable data={data} rows={people} />)
    const weekly = within(screen.getByRole('table')).getAllByRole('row').filter((r) => (r.textContent ?? '').includes('Weekly active users'))
    expect(weekly).toHaveLength(1)
    expect(weekly[0].textContent).toContain('162 users')
    expect(weekly[0].textContent).toContain('Up from 148')
  })
  it('draws a figure only somebody said as a ringed bar, labelled as said and not shown by a system, from "7 of 9"', () => {
    render(<TheMetricsTable data={data} rows={people} />)
    const renewals = rowOf('Renewals')
    expect(renewals.textContent).toContain('Said by Otieno, from Paystack')
    expect(renewals.textContent).toContain('7 of 9')
    expect(within(renewals).getByRole('img', { name: 'Renewals, 7 of 9, said and not shown by a system' })).toBeTruthy()
  })
  it('never draws a bar for a goal given in money words, and says so with "Not said yet" for the figure', () => {
    render(<TheMetricsTable data={data} rows={people} />)
    const trials = rowOf('Trial sign-ups')
    expect(trials.textContent).toContain('KES 2 million')
    expect(trials.textContent).toContain('Not said yet')
    expect(within(trials).queryByRole('img')).toBeNull()
  })
  it('says plainly under the table that the numbers were not sent, when only people said the figures', () => {
    render(<TheMetricsTable data={{ heading: 'What the systems show', state: 'not-known', why: 'No numbers from another system are attached to this check-in yet.' } as any} rows={people} />)
    expect(screen.getByText('No numbers from another system are attached to this check-in yet.')).toBeTruthy()
    expect(within(rowOf('Renewals')).queryByText(/From Paystack, as of/)).toBeNull()
  })
  it('keeps the old sentence when nobody sent a number and nobody stated a metric', () => {
    render(<TheMetricsTable data={{ heading: 'What the systems show', state: 'not-known', why: 'No numbers from another system are attached to this check-in yet.' } as any} rows={[]} />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('No numbers from another system are attached to this check-in yet.')).toBeTruthy()
  })
})

describe('when the newest number was sent (mvq4.jpg, "Updated this morning")', () => {
  const now = new Date('2026-11-05T09:00:00Z')
  it('says today, yesterday, or the day, from the newest number and never a guess', async () => {
    const { whenTheNumbersWereUpdated } = await import('./TheMetricsBoard')
    expect(whenTheNumbersWereUpdated([{ measuredAt: '2026-11-04' }, { measuredAt: '2026-11-05' }], now)).toBe('Updated today.')
    expect(whenTheNumbersWereUpdated([{ measuredAt: '2026-11-04' }], now)).toBe('Updated yesterday.')
    expect(whenTheNumbersWereUpdated([{ measuredAt: '2026-10-01' }], now)).toBe('Last updated on 1 October.')
    expect(whenTheNumbersWereUpdated([], now)).toBeNull()
  })
})
