import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EveryTicketAndWhatShowsIt, EachAreaOfTheWork, shareOf } from './TheTicketsBoard'
import { WomenAndDropOff } from './TheProgrammeBoard'

/**
 * THE TRADER TRAINING PROGRAMME'S FIGURES (programme.jpg), as the lead reads them. A row for every group with its size, county and what
 * the officer said about women and who came, each as said and ringed, never filled unless a document backs the line; "Not said yet"
 * where nobody has said it; women's share by county as bars of the groups' own figures; and by-county cards with only the figures said.
 */
const rows = [
  { id: 'g1', kind: 'group', name: 'Kondele women traders', stage: 'Check-in 2', owner: 'Achieng Odera', ownerParticipantId: 'p1', mark: 'proven', saidBy: 'Achieng Odera',
    fields: { County: 'Kisumu', 'Group size': '42', Women: '26 of 42 (62%)', Attended: '38 of 42 at check-in 2', 'Why missed': 'market day moved', 'Next step': 'Hold check-in 3 off market day' } },
  { id: 'g2', kind: 'group', name: 'Gikomba traders', stage: 'Enrolled', owner: 'Juma Hassan', ownerParticipantId: 'p2', mark: 'said', saidBy: 'Juma Hassan', fields: { County: 'Nairobi', 'Group size': '80' } },
  { id: 'g3', kind: 'group', name: 'Kibera youth vendors', stage: 'Check-in 1', owner: 'Kevin Otieno', ownerParticipantId: 'p3', mark: 'said', saidBy: 'Kevin Otieno', fields: { County: 'Nairobi', Women: '49%' } },
]
const section = { section: 'Deal grid', stages: ['Enrolled', 'Check-in 1', 'Check-in 2', 'Completed'], rows }
const board = {
  kindOfWork: 'trader training programme',
  workRecords: [section],
  byArea: { state: 'filled', heading: 'By county', areas: [
    { area: 'Kisumu', records: 1, says: 'Kisumu has 1 group on record.', recordIds: ['g1'] },
    { area: 'Nairobi', records: 2, says: 'Nairobi has 2 groups on record.', recordIds: ['g2', 'g3'] },
  ] },
  reportedAgainstCriteria: { state: 'not-known', why: 'Nothing on record says what a group must show at each stage.', stages: [
    { stage: 'Enrolled', reported: 1, withProof: 0, says: '1 group was reported at Enrolled, and none has a document behind it.' },
    { stage: 'Check-in 2', reported: 1, withProof: 1, says: '1 group was reported at Check-in 2, and it has a document behind it.' },
  ] },
}
const wrap = (ui: any) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('reading a figure the way it was said', () => {
  it('takes "26 of 42" and a percent, and nothing else', () => {
    expect(shareOf('26 of 42 (62%)')).toEqual({ n: 26, of: 42 })
    expect(shareOf('38 of 42 at check-in 2')).toEqual({ n: 38, of: 42 })
    expect(shareOf('2,310 of 6,240')).toEqual({ n: 2310, of: 6240 })
    expect(shareOf('49%')).toEqual({ n: 49, of: 100 })
    expect(shareOf('about half')).toBeNull()
    expect(shareOf('50 of 40')).toBeNull()
  })
})

describe('every group, and what shows it', () => {
  it('has a row for each group with its size beside its name, its county under the officer, and women and who came as said', () => {
    wrap(<EveryTicketAndWhatShowsIt section={section} kindOfWork="trader training programme" groundId="g-1" me={null} />)
    expect(screen.getByRole('heading', { name: 'Every trader, and what shows it' })).toBeTruthy()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    const first = within(table).getAllByRole('row')[1].textContent ?? ''
    for (const t of ['Kondele women traders (42)', 'Achieng', 'Kisumu', 'Check-in 2', '26 of 42 (62%)', '38 of 42 at check-in 2', 'market day moved', 'Hold check-in 3 off market day', 'A document backs it']) expect(first).toContain(t)
  })
  it('says "Not said yet" for a figure nobody said, and draws no bar for it', () => {
    wrap(<EveryTicketAndWhatShowsIt section={section} kindOfWork="trader training programme" groundId="g-1" me={null} />)
    const gikomba = within(screen.getByRole('table')).getAllByRole('row')[2]
    expect(gikomba.textContent).toContain('Gikomba traders (80)')
    expect(gikomba.textContent).toContain('Not said yet')
    expect(within(gikomba).queryByRole('img', { name: /Women/ })).toBeNull()
  })
  it('draws women as a ringed bar of the group, never filled by a word', () => {
    wrap(<EveryTicketAndWhatShowsIt section={section} kindOfWork="trader training programme" groundId="g-1" me={null} />)
    const bar = screen.getByRole('img', { name: 'Women, 26 of 42, said and not shown by a document' })
    expect(bar.querySelector('.pb-in')).toBeNull()
    expect((bar.querySelector('.pb-out') as HTMLElement).style.width).toMatch(/^61\.9/)
  })
})

describe('women’s share by county, and drop-off by session', () => {
  it('draws each group’s women under its county, and says what is not said', () => {
    wrap(<WomenAndDropOff b={board} />)
    expect(screen.getByRole('heading', { name: 'Women’s share by county, and drop-off by check-in' })).toBeTruthy()
    expect(screen.getByText('Kisumu')).toBeTruthy()
    expect(screen.getByText('Nairobi')).toBeTruthy()
    expect(screen.getByText('26 of 42')).toBeTruthy()
    expect(screen.getByText('49%')).toBeTruthy()
    /* Gikomba's women were not said, so it has no bar and is not named among them. */
    expect(screen.queryByText('Gikomba traders')).toBeNull()
    /* Kondele is backed by a document, so its bar is filled; Kibera's is somebody's word, so it is only ringed. */
    expect(screen.getByRole('img', { name: /Kondele women traders, women 26 of 42, shown by a document/ }).querySelector('.pb-in')).toBeTruthy()
    expect(screen.getByRole('img', { name: /Kibera youth vendors, women 49 of 100, said and not shown/ }).querySelector('.pb-in')).toBeNull()
  })
  it('says "Not said yet" where no group has a figure for women, and still draws the stages', () => {
    const none = { ...board, workRecords: [{ ...section, rows: [rows[1]] }] }
    wrap(<WomenAndDropOff b={none} />)
    expect(screen.getByText('Not said yet')).toBeTruthy()
    expect(screen.getByText('Enrolled')).toBeTruthy()
  })
})

describe('by county', () => {
  it('has a card for each county with its groups counted and only the figures said, each as said', () => {
    wrap(<EachAreaOfTheWork b={board} />)
    expect(screen.getByRole('heading', { name: 'By county' })).toBeTruthy()
    const kisumu = screen.getByText('Kisumu').closest('.pb-card') as HTMLElement
    expect(kisumu.textContent).toContain('1group')
    expect(kisumu.textContent).toContain('26 of 42 (62%)')
    expect(kisumu.textContent).toContain('Not said yet')
    const nairobi = screen.getByText('Nairobi').closest('.pb-card') as HTMLElement
    expect(nairobi.textContent).toContain('2groups')
    expect(nairobi.textContent).toContain('49%')
  })
})
