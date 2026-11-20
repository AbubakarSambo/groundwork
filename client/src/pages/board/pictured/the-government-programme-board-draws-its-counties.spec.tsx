import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TheCountiesSection, WhatEachLevelUnderstoodSection } from '../TheSwitchboardsSections'

/**
 * THE GOVERNMENT PROGRAMME'S COUNTIES AND WHAT EACH LEVEL UNDERSTOOD (gov.jpg), as the lead reads them. Open tables. A county's figures
 * are what people said about it, as said; one nobody has said reads "Not said yet", and a county with no figure at all is named in one
 * sentence under the table, so what has no data is listed and nothing is made up.
 */
const data = { heading: 'The three counties', state: 'filled' as const, counties: [
  { id: 'c1', name: 'Kiambu', said: null, saidBy: null, projects: ['Motorbikes'], says: 'The project on record for Kiambu is Motorbikes.' },
  { id: 'c2', name: 'Nakuru', said: null, saidBy: null, projects: [], says: 'Nakuru has no project on record yet.' },
  { id: 'c3', name: 'Machakos', said: null, saidBy: null, projects: [], says: 'Machakos has no project on record yet.' },
] }
const rows = [
  { id: 'c1', kind: 'county', name: 'Kiambu', fields: { Reached: 'new farmers up 8%', Activity: 'visits up 25%', 'In the way': 'procurement is 3 months late' } },
  { id: 'c2', kind: 'county', name: 'Nakuru', fields: {} },
  { id: 'c3', kind: 'county', name: 'Machakos', fields: { Reached: 'new farmers up 21%' } },
]

describe('the counties', () => {
  it('is one open table with a row for each county and its figures as said', () => {
    render(<TheCountiesSection data={data} rows={rows} />)
    expect(screen.getByRole('heading', { name: 'The three counties' })).toBeTruthy()
    const rs = within(screen.getByRole('table')).getAllByRole('row')
    expect(rs).toHaveLength(4)
    const kiambu = rs[1].textContent ?? ''
    for (const t of ['Kiambu', 'new farmers up 8%', 'visits up 25%', 'procurement is 3 months late', 'The project on record for Kiambu is Motorbikes.']) expect(kiambu).toContain(t)
  })
  it('says "Not said yet" for a figure nobody said, and names the county with none at all', () => {
    render(<TheCountiesSection data={data} rows={rows} />)
    const rs = within(screen.getByRole('table')).getAllByRole('row')
    expect(rs[3].textContent).toContain('new farmers up 21%')
    expect(rs[3].textContent).toContain('Not said yet')
    expect(screen.getByText('Nobody has said any figure for Nakuru yet.')).toBeTruthy()
  })
  it('says no figure for any county in one sentence naming them all, when the records hold none', () => {
    render(<TheCountiesSection data={data} rows={[]} />)
    expect(screen.getByText('Nobody has said any figure for Kiambu, Nakuru and Machakos yet.')).toBeTruthy()
  })
  it('says what it says when no county is on record', () => {
    render(<TheCountiesSection data={{ heading: 'The counties', state: 'none-yet', says: 'No county is on record yet.' }} />)
    expect(screen.getByText('No county is on record yet.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('what each level understood', () => {
  it('is one open table of who and what they said the aim means, with the note under it', () => {
    render(<WhatEachLevelUnderstoodSection data={{ heading: 'What each level understood', state: 'filled', note: 'Nobody’s level is on record, so each person’s words are in the order they joined.', levels: [
      { participantId: 'p1', who: 'You', said: ['30% more farmers get advice.', 'Reach registered farmers.'] },
      { participantId: 'p2', who: 'Wanjiru Kamau', said: ['30% more visits.'] },
    ] }} />)
    const rs = within(screen.getByRole('table')).getAllByRole('row')
    expect(rs).toHaveLength(3)
    expect(rs[1].textContent).toContain('You')
    expect(rs[1].textContent).toContain('30% more farmers get advice.')
    expect(rs[1].textContent).toContain('Reach registered farmers.')
    expect(screen.getByText('Nobody’s level is on record, so each person’s words are in the order they joined.')).toBeTruthy()
  })
})
