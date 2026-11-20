import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TheCollectionsBoard } from './TheCollectionsBoard'
import { TheMatterBoard } from './TheMatterBoard'
import { WhereThisIsHeading } from './ThePicturedSalesBoard'
import SERVED from './__fixtures__/collections-served.json'
import MATTER from './__fixtures__/matter-served.json'

/**
 * THE MATTER AND COLLECTIONS BOARDS DRAW THEIR FIGURES (visuals pass, matter.jpg and loans.jpg). The bills' headline bar is filled for what
 * is paid with proof and ringed for what is paid on somebody's word; a signal's dot is filled only where the signal says a document
 * shows it, never because it comes first; and each line of a matter's week carries the mark for how it is known.
 */
const draw = (n: React.ReactNode) => render(<MemoryRouter>{n}</MemoryRouter>)

describe('the bills’ headline bar', () => {
  it('is filled for what is paid with proof and ringed for what is on somebody’s word', () => {
    const board = (SERVED as any).boards.wanjiru
    const { container } = draw(<TheCollectionsBoard board={board} />)
    const bar = container.querySelector('.pb-bar') as HTMLElement
    expect(bar.querySelector<HTMLElement>('.pb-bar-done')!.style.width).toBe(`${board.bar.proven}%`)
    expect(bar.querySelector<HTMLElement>('.pb-bar-said')!.style.width).toBe(`${board.bar.said}%`)
  })
})

describe('where this is heading, the signals', () => {
  const b = { whereThisIsHeading: { heading: 'Where this is heading', outcomes: [], outcomesSays: 'x', whatWouldSettleIt: [], whatWouldSettleItSays: 'y', whoDecides: 'You decide.', signals: [
    { says: 'The original contract has not arrived', from: 'Joy has asked the client twice' },
    { says: 'The limitation point is much stronger', from: 'From Leila’s research note', mark: 'proven' },
  ] } }
  it('fills a dot only for the signal a document shows, not for the first one', () => {
    const { container } = draw(<WhereThisIsHeading b={b} onRecordTheDecision={() => undefined} />)
    const rows = [...container.querySelectorAll('.pb-signal')]
    expect(rows[0].querySelector('.pb-dot-proof')).toBeNull()
    expect(rows[1].querySelector('.pb-dot-proof')).not.toBeNull()
  })
})

describe('what changed this week on a matter', () => {
  it('has a mark on every line and a key that says what each means', () => {
    const { container } = draw(<TheMatterBoard board={(MATTER as any).matter.wanjiru} />)
    expect(container.querySelectorAll('.gwui-mk').length).toBeGreaterThanOrEqual((MATTER as any).matter.wanjiru.changed.rows.length)
    expect(screen.getByRole('list', { name: 'How each line is known' })).toBeTruthy()
  })
})
