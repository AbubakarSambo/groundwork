import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'
import { SaidVersusDone, TheFoundersFigures, theWeekOf } from './TheFounderBoard'

/**
 * THE FOUNDER'S OWN BOARD (founder.jpg), as the founder reads it: what was said and what became of it, week by week, counted from the
 * commitments on record; and the money, runway and weekly figures said on the work plan, as said. Nothing is invented: a week appears
 * only if something was promised in it, a figure nobody said reads "Not said yet", and a bar is filled only for what a document shows.
 */
const c = (id: string, name: string, on: string, status: string, settledBy: string | null = null) => ({
  id, kind: 'commitment', name, lastSaidOn: on, fields: { Status: status }, settledBy, mark: 'said', owner: 'You',
})
const rows = [
  c('a', 'send the data room', '2026-09-08', 'Done', 'PROVEN'),
  c('b', 'call the distributor', '2026-09-09', 'Open'),
  c('c', 'hire the engineer', '2026-09-10', 'Dropped'),
  c('d', 'update the financials', '2026-09-11', 'Done', 'SAID'),
  c('e', 'book the investor call', '2026-09-16', 'Not done'),
  { id: 'f', kind: 'decision', name: 'Whether to raise a seed round', stage: 'Open', fields: { Money: 'KES 10 million', Runway: '11 months' } },
  { id: 'g', kind: 'commitment', name: 'write to investors', lastSaidOn: '2026-09-16', fields: { Status: 'Open', 'Each week': '3 emails' }, mark: 'said' },
]
const b = { kindOfWork: "founder's own check-in", workRecords: [{ section: 'Work plan', rows }] }
const wrap = (ui: any) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('counting weeks', () => {
  it('numbers the week of the year and names its Monday', () => {
    expect(theWeekOf('2026-09-08')).toEqual({ monday: '2026-09-07', number: 37 })
    expect(theWeekOf('2026-09-13')).toEqual({ monday: '2026-09-07', number: 37 })
    expect(theWeekOf('2026-09-14')).toEqual({ monday: '2026-09-14', number: 38 })
  })
})

describe('said vs happened, week by week', () => {
  it('has a row for each week something was said, named by its number and the day it starts', () => {
    wrap(<SaidVersusDone b={b} />)
    expect(screen.getByRole('heading', { name: 'Said vs happened, week by week' })).toBeTruthy()
    const r = within(screen.getByRole('table')).getAllByRole('row')
    expect(r).toHaveLength(3)
    expect(r[1].textContent).toContain('Week 37')
    expect(r[1].textContent).toContain('from 7 September')
    expect(r[2].textContent).toContain('Week 38')
  })
  it('counts said, done, carried and dropped from each commitment status: week 37 is 4, 2, 1 and 1; week 38 is 2, 0, 2 and 0', () => {
    wrap(<SaidVersusDone b={b} />)
    const r = within(screen.getByRole('table')).getAllByRole('row')
    const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((x) => (x.textContent ?? '').trim())
    const [, said1, done1, carried1, dropped1] = [''].concat(cells(r[1]))
    expect([said1, carried1, dropped1]).toEqual(['4', '1', '1'])
    expect(done1.startsWith('2')).toBe(true)
    const [, said2, done2, carried2, dropped2] = [''].concat(cells(r[2]))
    expect([said2, carried2, dropped2]).toEqual(['2', '2', '0'])
    expect(done2.startsWith('0')).toBe(true)
  })
  it('draws done as a bar of what was said, ringed for a word and filled only for a document', () => {
    wrap(<SaidVersusDone b={b} />)
    expect(screen.getByRole('img', { name: 'Done, 2 of 4 said, 1 shown by a document' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Done, 0 of 2 said, 0 shown by a document' })).toBeTruthy()
  })
  it('draws nothing where no commitment is on record', () => {
    const { container } = wrap(<SaidVersusDone b={{ workRecords: [{ section: 'Work plan', rows: [rows[5]] }] }} />)
    expect(container.textContent).toBe('')
  })
})

describe('money, runway and weekly figures, as said', () => {
  it('lists each item with a figure said, each as said, and Not said yet for the rest', () => {
    wrap(<TheFoundersFigures b={b} />)
    const r = within(screen.getByRole('table')).getAllByRole('row')
    expect(r).toHaveLength(3)
    expect(r[1].textContent).toContain('Whether to raise a seed round')
    expect(r[1].textContent).toContain('KES 10 million')
    expect(r[1].textContent).toContain('11 months')
    expect(r[1].textContent).toContain('Not said yet')
    expect(r[2].textContent).toContain('3 emails')
  })
  it('draws nothing when nobody said a figure', () => {
    const { container } = wrap(<TheFoundersFigures b={{ workRecords: [{ section: 'Work plan', rows: [rows[0]] }] }} />)
    expect(container.textContent).toBe('')
  })
})

describe('where each target stands, for a founder', () => {
  const objectives = [
    { id: 'o1', name: 'Contracted revenue', count: 4.2, target: 10, unit: 'KES million', stands: { word: 'Behind' } },
    { id: 'o2', name: 'Runway', count: 11, target: 9, unit: 'months', stands: null },
    { id: 'o3', name: 'Investor meetings', count: null, target: 10, unit: null, stands: null },
  ]
  const draw = (kindOfWork: string) => render(
    <QueryClientProvider client={new QueryClient()}><MemoryRouter>
      <ThePicturedBoard order={['headlineTargets']} b={{ kindOfWork, objectives, headline: null, workRecords: [] } as any} groundId="g-1" sessionRows={[]} renderActions={() => null} overTime={null}
        recommendations={[]} onAnswerRecommendation={() => undefined} recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
    </MemoryRouter></QueryClientProvider>,
  )
  it('draws each count that has a target as one ringed bar, and none for a count nobody said', () => {
    draw("founder's own check-in")
    expect(screen.getByRole('img', { name: 'Contracted revenue, 4.2 of 10, said and not shown by a document' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Runway, 11 of 9, said and not shown by a document' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Investor meetings/ })).toBeNull()
    expect(screen.getByText('Behind')).toBeTruthy()
  })
  it('says no word the record does not give: no "Above floor" for the runway', () => {
    draw("founder's own check-in")
    expect(screen.queryByText('Above floor')).toBeNull()
  })
  it('leaves every other kind of board as it was, with no bar beside a target', () => {
    draw('support desk')
    expect(screen.queryByRole('img', { name: /said and not shown by a document/ })).toBeNull()
  })
})
