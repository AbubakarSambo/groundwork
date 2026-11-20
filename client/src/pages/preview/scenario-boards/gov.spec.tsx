import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GovBoard from './gov'

/**
 * The government programme's example board, read against gov.txt of the prototype (docs/prototype is not in git, so the
 * words are copied here as literals). It must show every section open, in order, with its tables as real tables.
 */
function draw() {
  return render(<MemoryRouter><GovBoard /></MemoryRouter>)
}

describe('the Extension Access Programme example board', () => {
  it('says every heading of the prototype, in its order', () => {
    const { container } = draw()
    const headings = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent)
    expect(headings).toEqual(['Extension Access Programme', 'What each level understood', 'The three counties', 'Where this is heading'])
    expect(screen.getByText('Where it stands')).toBeTruthy()
    expect(screen.getByText('The possible outcomes')).toBeTruthy()
    expect(screen.getAllByText('The signals behind them').length).toBeGreaterThan(0)
    expect(screen.getByText('What would settle it')).toBeTruthy()
    expect(screen.getByText('1 question for the ministry, from the counties')).toBeTruthy()
  })

  it('says the prototype sentences and numbers', () => {
    draw()
    for (const t of [
      'The ministry, three counties, their projects and extension officers. Weekly. Month 9 of 24.',
      'Counties are making more visits, but few new farmers are being reached. In Kiambu, the aim changed on the way down: from more farmers to more visits.',
      'The meaning changed here: from more farmers to more visits.',
      'Buy 20 motorbikes, so officers can make more visits.',
      'Visits are up 25%. New farmers reached are up only 8%.',
      'The motorbikes are still being bought. Procurement is 3 months late.',
      'The second payment from the county treasury has not been released.',
      'Officers hold advice days at markets, where farmers already are.',
      'Whether advice to unregistered farmers counts.',
      'Joseph, the programme lead, decides.',
      'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
    ]) expect(screen.getAllByText(t, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'See the questions' })).toBeTruthy()
  })

  it('draws its lists as real tables, with a caption and column headers, and folds nothing', () => {
    const { container } = draw()
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBe(3)
    const counties = screen.getByRole('table', { name: 'The three counties' })
    expect(within(counties).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['Kiambu', 'Nakuru', 'Machakos'])
    expect(within(counties).getAllByRole('columnheader').length).toBe(3)
    expect(within(counties).getByRole('cell', { name: 'New farmers up 21%.' })).toBeTruthy()
    expect(container.querySelectorAll('details, summary, [aria-expanded="false"]').length).toBe(0)
  })
})
