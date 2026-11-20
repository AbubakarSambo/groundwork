import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Table } from './Table'
import { theShapeOfTheRecords } from '@/pages/board/pictured/the-shape-of-a-list'

/**
 * A LONG TABLE SAYS ITS SHAPE BEFORE IT SHOWS ITS ROWS, AND A ROW SAYS ITS GAPS ONCE (board assessment, 15 November).
 * Two hundred rows ran to 127,000 pixels at phone width, and every missing figure was a label and "Not said yet" of its own.
 * What a person reads here is the sentence about the whole list, the sentence about the cut, the button, and the gap line.
 */
const columns = [
  { key: 'name', header: 'Trader', rowHeader: true },
  { key: 'sales', header: 'Sales' },
  { key: 'next', header: 'Next' },
]
/* One row has a figure in each column: a column nobody has filled in is not drawn at all (15 November 2026), so the gaps below are the other rows'. */
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Trader ${i}`, sales: i === 0 ? '40,000' : 'Not said yet', next: i === 0 ? 'Visit' : 'Not said yet' }))

/** The cut is for a phone only (Hafsah, 15 November): a desktop table of two hundred rows is drawn whole. */
const onAScreenThatIs = (phone: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: phone && q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia
}
const original = window.matchMedia

describe('a long table', () => {
  afterEach(() => { window.matchMedia = original })

  it('on a desktop screen draws every row, with no cut', () => {
    onAScreenThatIs(false)
    render(<Table caption="Each loan" what="loans" columns={columns} rows={rows(200)} summary="never shown on a desktop" />)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(200)
    expect(screen.queryByText(/first 10/)).toBeNull()
    expect(screen.queryByText('never shown on a desktop')).toBeNull()
  })

  it('on a phone draws the first rows, says how many there are and how many are not drawn, and shows the rest on one press', () => {
    onAScreenThatIs(true)
    render(<Table caption="Each loan" phone="stack" what="loans" columns={columns} rows={rows(200)} summary={theShapeOfTheRecords(rows(200).map((_r, i) => ({ mark: i % 4 === 0 ? 'proven' : 'said', stage: 'late' })), 'loans')} />)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(10)
    expect(screen.getByText('There are 200 loans on record. 50 have a document behind it. The most common stage is 200 at late.')).toBeTruthy()
    expect(screen.getByText('The first 10 of 200 loans are shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show the other 190' }))
    expect(document.querySelectorAll('tbody tr')).toHaveLength(200)
    expect(screen.queryByText('The first 10 of 200 loans are shown.')).toBeNull()
  })

  it('draws a short table whole, with no sentence about a cut', () => {
    render(<Table caption="Each loan" columns={columns} rows={rows(12)} summary="never shown for a short list" />)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(12)
    expect(screen.queryByText(/first 10/)).toBeNull()
    expect(screen.queryByText('never shown for a short list')).toBeNull()
  })

  it('says once, in a full sentence, which figures a stacked row is missing, and keeps a single gap in its own cell', () => {
    render(<Table caption="Each loan" phone="stack" columns={columns} rows={[{ name: 'Wanjiku', sales: 'Not said yet', next: 'Not said yet' }, { name: 'Amina', sales: '40,000', next: 'Not said yet' }, { name: 'Brian', sales: '12,000', next: 'Visit' }]} />)
    expect(screen.getByText('Not said yet for sales and next.')).toBeTruthy()
    expect(screen.queryAllByText(/^Not said yet for /)).toHaveLength(1)
  })
})
