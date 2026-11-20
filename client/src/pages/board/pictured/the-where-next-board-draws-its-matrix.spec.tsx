import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { WhereNextRanked } from './TheWhereNextBoard'

/**
 * WHERE NEXT, RANKED, AS THE LEAD READS IT (mvnext.jpg). One open table: a row for each theme, in the order of how many different people
 * named it, with how many of those who answered, and, where the lead has said who each person is, the same count for each group. Only
 * counts that exist are drawn: a group where nobody answered reads "Not said yet", and a priority with no theme said is under "Not said
 * yet".
 */
const cell = (p: string) => ({ [p]: 'done' })
const base = {
  checkInGrid: { rows: [
    { participantId: 'p1', name: 'Ngozi Eze', cells: cell('s1') }, { participantId: 'p2', name: 'Bala Musa', cells: cell('s1') },
    { participantId: 'p3', name: 'Ade Bello', cells: cell('s1') }, { participantId: 'p4', name: 'Chika Obi', cells: {} },
  ] },
  workRecords: [{ section: 'Themes', rows: [
    { id: 'a', kind: 'priority', name: 'Daily maize prices in Kano', owner: 'Ngozi Eze', ownerParticipantId: 'p1', fields: { Theme: 'Markets' } },
    { id: 'b', kind: 'priority', name: 'Kano first', owner: 'Bala Musa', ownerParticipantId: 'p2', fields: { Theme: 'markets' } },
    { id: 'c', kind: 'priority', name: 'Monthly averages back to 2022', owner: 'Ade Bello', ownerParticipantId: 'p3', fields: { Theme: 'Data' } },
    { id: 'd', kind: 'priority', name: 'A pilot in Kaduna', owner: 'Ade Bello', ownerParticipantId: 'p3', fields: {} },
  ] }],
}
const grouped = { ...base, byWhoTheyAre: { state: 'filled', groups: [
  { group: 'Agroprocessors', count: 2, answered: 2, says: '', participantIds: ['p1', 'p2'] },
  { group: 'Researchers', count: 1, answered: 1, says: '', participantIds: ['p3'] },
  { group: 'Distributors', count: 1, answered: 0, says: '', participantIds: ['p4'] },
] } }
const rowsOf = () => within(screen.getByRole('table')).getAllByRole('row')

describe('where next, ranked', () => {
  it('has a row for each theme, the most named first, with how many of those who answered named it', () => {
    render(<WhereNextRanked b={base} />)
    expect(screen.getByRole('heading', { name: 'Where next, ranked' })).toBeTruthy()
    const rs = rowsOf()
    expect(rs).toHaveLength(4)
    expect(rs[1].textContent).toContain('Markets')
    expect(rs[1].textContent).toContain('2 of 3')
    expect(rs[1].textContent).toContain('Daily maize prices in Kano; Kano first')
    expect(rs[2].textContent).toContain('Data')
    expect(rs[2].textContent).toContain('1 of 3')
    expect(screen.getByRole('columnheader', { name: 'Named by, of 3 who answered' })).toBeTruthy()
  })
  it('puts a priority with no theme said under "Not said yet", and draws each count as a ringed bar, never filled', () => {
    const { container } = render(<WhereNextRanked b={base} />)
    expect(rowsOf()[3].textContent).toContain('Not said yet')
    expect(rowsOf()[3].textContent).toContain('A pilot in Kaduna')
    expect(container.querySelectorAll('.pb-out').length).toBe(3)
    expect(container.querySelector('.pb-in')).toBeNull()
  })
  it('gives a count for each group where the lead has said who each person is, and "Not said yet" for a group where nobody answered', () => {
    render(<WhereNextRanked b={grouped} />)
    expect(screen.getByRole('columnheader', { name: 'Agroprocessors' })).toBeTruthy()
    const markets = rowsOf()[1].textContent ?? ''
    expect(markets).toContain('2 of 2')
    expect(markets).toContain('0 of 1')
    expect(markets).toContain('Not said yet')
    expect(rowsOf()[2].textContent).toContain('1 of 1')
  })
  it('draws no group columns where the groups are not known', () => {
    render(<WhereNextRanked b={{ ...base, byWhoTheyAre: { state: 'not-known', why: 'Nobody’s group is on record.' } }} />)
    expect(screen.queryByRole('columnheader', { name: 'Agroprocessors' })).toBeNull()
    expect(within(screen.getByRole('table')).getAllByRole('columnheader')).toHaveLength(3)
  })
})
