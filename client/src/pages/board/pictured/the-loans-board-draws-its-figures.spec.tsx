import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EveryTraderAndWhatShowsIt } from './TheLoansBoard'
import { WhereTheCohortStandsSection } from '../TheSwitchboardsSections'

/**
 * THE LOANS BOARD DRAWS ITS FIGURES (visuals pass, loans.jpg). Each group's count is a chip in the colour of what it says (repaying green,
 * behind or stopped amber, not heard from red, nobody in it plain); each trader has one dot at the start of their business, filled only
 * where a document backs the line, and no dot is drawn beside a figure the trader said.
 */
describe('where the cohort stands', () => {
  const data: any = { heading: 'Where the cohort stands', says: '40 people are in this cohort.', groups: [
    { group: 'repaying', title: 'Repaying', count: 24, says: 'The loan records show 24 loans being repaid.', who: null },
    { group: 'behind', title: 'Behind on repayment', count: 9, says: 'The loan records show 9 loans behind on repayment.', who: null },
    { group: 'blocked', title: 'Stopped by something', count: 0, says: 'Nobody says something is in their way.', who: null },
    { group: 'not heard from', title: 'Not heard from', count: 3, says: '3 people have not checked in yet.', who: null },
  ] }
  it('colours each count by what the group says', () => {
    const { container } = render(<MemoryRouter><WhereTheCohortStandsSection data={data} /></MemoryRouter>)
    const chips = [...container.querySelectorAll('.pb-card-top .tag')].map((t) => t.className)
    expect(chips).toHaveLength(4)
    expect(chips[0]).toContain('rec')
    expect(chips[1]).toContain('att')
    expect(chips[2]).toContain('plain')
    expect(chips[3]).toContain('con')
  })
})

describe('every trader', () => {
  const section = { rows: [
    { id: 'a', kind: 'loan', name: 'Freezer', owner: 'Achieng Otieno', ownerParticipantId: 'p1', mark: 'proven', fields: { Business: 'Trading', Sales: 'KES 38,000', Repayment: 'On time' } },
    { id: 'b', kind: 'loan', name: 'Freezer', owner: 'Grace Wambui', ownerParticipantId: 'p2', mark: 'said', fields: { Business: 'Idle 9 days', Sales: 'KES 6,000' } },
  ] }
  it('has one dot at the start of the business, filled only where a document backs the line, and none beside the figures', () => {
    render(<MemoryRouter><EveryTraderAndWhatShowsIt section={section} groundId="g" me={null} /></MemoryRouter>)
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    const [first, second] = [rows[1], rows[2]]
    expect(first.querySelectorAll('.gwui-table-dot')).toHaveLength(1)
    expect(first.querySelectorAll('.gwui-table-dot-on')).toHaveLength(1)
    expect(within(first).getAllByRole('cell')[0].querySelector('.gwui-table-dot')).not.toBeNull()
    expect(second.querySelectorAll('.gwui-table-dot')).toHaveLength(1)
    expect(second.querySelectorAll('.gwui-table-dot-on')).toHaveLength(0)
    /* No repayment was said for Grace, so none is drawn and none is made up. */
    expect(second.textContent).toContain('Not said yet')
  })
})
