import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'

vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))

/**
 * THE TICKETS FAMILY, THE TEAM TODAY, EACH AREA AND THE HEAT TABLE (support.jpg, ops.jpg, eng.jpg), as the lead reads them. A person's
 * own records are counted beside their line; an area card shows only the figures its records say; incidents are counted by site and
 * type only where some incident says both.
 */
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const common: any = { groundId: 'g', sessionRows: [], renderActions: () => null, overTime: null, recommendations: [], onAnswerRecommendation: () => undefined, recommendationBusy: false, onRecordTheDecision: () => undefined, navigate: () => undefined }
const today = new Date().toISOString().slice(0, 10)

const incidents = [
  { id: 'i1', kind: 'incident', name: 'Forklift 3 stopped', owner: 'Fatuma Said', ownerParticipantId: 'p1', mark: 'proven', lastSaidOn: today, fields: { Site: 'Mombasa', Type: 'Equipment', 'On time': '94.1%' } },
  { id: 'i2', kind: 'incident', name: 'Loading bay flooded', owner: 'Fatuma Said', ownerParticipantId: 'p1', mark: 'said', lastSaidOn: today, fields: { Site: 'Mombasa', Type: 'Equipment' } },
  { id: 'i3', kind: 'incident', name: 'Truck no-show', owner: 'Ochieng Ouma', ownerParticipantId: 'p2', mark: 'said', lastSaidOn: today, fields: { Site: 'Kisumu', Type: 'Transport' } },
  { id: 'i4', kind: 'incident', name: 'Old problem', owner: 'Ochieng Ouma', ownerParticipantId: 'p2', mark: 'said', lastSaidOn: '2020-01-01', fields: { Site: 'Kisumu', Type: 'Power' } },
]
const board = (rows: any[], kindOfWork = 'distribution operations', extra: any = {}) => ({
  kindOfWork, releaseFourTeams: true, headline: { question: 'q', answer: 'a' }, objectives: [],
  workRecords: [{ section: 'Deal grid', holds: 'incidents', state: 'filled', rows }],
  ...extra,
})

describe('each site is a card', () => {
  const byArea = { state: 'filled', heading: 'By site', areas: [
    { area: 'Mombasa', records: 2, says: 'Mombasa has 2 incidents on record.', recordIds: ['i1', 'i2'] },
    { area: 'Kisumu', records: 2, says: 'Kisumu has 2 incidents on record.', recordIds: ['i3', 'i4'] },
  ] }
  it('shows the count on record, each figure only as said, "Not said yet" otherwise, and the people in it', () => {
    wrap(<ThePicturedBoard {...common} order={['byTeam']} b={board(incidents, 'distribution operations', { byArea })} />)
    expect(screen.getByRole('heading', { name: 'By site' })).toBeTruthy()
    const mombasa = screen.getByRole('heading', { name: 'Mombasa' }).closest('.pb-card') as HTMLElement
    expect(mombasa.textContent).toContain('2incidents')
    expect(mombasa.textContent).toContain('94.1%')
    expect(mombasa.textContent).toContain('Downtime')
    expect(mombasa.textContent).toContain('Not said yet')
    expect(mombasa.textContent).toContain('Fatuma')
    const bar = within(mombasa).getByRole('img', { name: 'On time, 94.1 of 100, said and not shown by a document' })
    /* A figure somebody said is drawn as the ring of the stage bar (the track form's ring could not be seen in a table cell), so the ring is the bar's own width. */
    expect((bar.querySelector('.pb-out') as HTMLElement).style.width).toBe('94.1%')
    expect(bar.querySelector('.pb-in')).toBeNull()
    const kisumu = screen.getByRole('heading', { name: 'Kisumu' }).closest('.pb-card') as HTMLElement
    expect(kisumu.querySelector('[role=img]')).toBeNull()
    expect(kisumu.textContent).not.toContain('94.1%')
  })
})

describe('the heat table', () => {
  it('counts the incidents that say their site and type in the last eight weeks, and leaves an old one out', () => {
    const { container } = wrap(<ThePicturedBoard {...common} order={['themes']} b={board(incidents)} />)
    expect(screen.getByRole('heading', { name: 'Incidents by site and type, last 8 weeks' })).toBeTruthy()
    const cells = [...container.querySelectorAll('.pb-heat tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent))
    expect(cells).toEqual([['Mombasa', '2', '0'], ['Kisumu', '0', '1']])
  })
  it('is not drawn where no incident says both its site and its type', () => {
    const { container } = wrap(<ThePicturedBoard {...common} order={['themes']} b={board([{ id: 'x', kind: 'incident', name: 'A leak', mark: 'said', fields: { Site: 'Mombasa' } }])} />)
    expect(container.querySelector('.pb-heat')).toBeNull()
  })
})

describe('the team today', () => {
  const b = board(incidents, 'distribution operations', {
    eachPersonToday: [{ participantId: 'p1', who: 'Fatuma Said', line: 'Waiting on a supplier', checkedInToday: true }, { participantId: 'p3', who: 'Njeri Kamau', line: 'Started this week', checkedInToday: true }],
    eachPerson: [], checkInGrid: { sessions: [1, 2], rows: [{ participantId: 'p1', cells: { 1: 'done', 2: 'done' } }, { participantId: 'p3', cells: { 1: 'done', 2: 'done' } }] }, patterns: [],
  })
  it('counts each person\'s own incidents beside their line, with how many a document backs, and says when there are none', () => {
    wrap(<ThePicturedBoard {...common} order={['teamToday']} b={b} />)
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(screen.getByRole('columnheader', { name: 'Their incidents on record' })).toBeTruthy()
    expect(rows[1].textContent).toContain('2 incidents')
    const bar = within(rows[1]).getByRole('img', { name: 'Fatuma has 2 incidents, 1 shown by a document' })
    expect((bar.querySelector('.pb-bar-done') as HTMLElement).style.width).toBe('50%')
    expect(rows[2].textContent).toContain('None on record yet')
    expect(rows[1].querySelectorAll('.pb-sq').length).toBe(2)
  })
})
