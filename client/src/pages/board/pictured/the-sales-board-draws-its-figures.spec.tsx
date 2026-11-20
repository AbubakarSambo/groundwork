import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'
import { EveryDealDayByDay, isoDay } from './ThePicturedSalesBoard'

vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))

/**
 * THE SALES BOARD DRAWS ITS FIGURES (visuals pass, salesorg.jpg): the headline is a bar, filled for what the deals on record show with a
 * document and ringed for the rest of the count, which the key line says; a bar is never drawn for a count the record does not hold; and
 * each deal has its last six weeks as one dot a week.
 */
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
const board = (o: any) => ({ kindOfWork: 'sales org', headline: { question: 'Close 100 sales?', answer: '87 of the 100 sales are done.' }, objectives: [o], ...{} })
const common: any = { groundId: 'g', sessionRows: [], renderActions: () => null, overTime: null, recommendations: [], onAnswerRecommendation: () => undefined, recommendationBusy: false, onRecordTheDecision: () => undefined, navigate: () => undefined }

describe('the headline bar', () => {
  it('is filled for what a document shows and ringed for the rest, and says so in a line', () => {
    wrap(<ThePicturedBoard {...common} order={['headlineTargets']} b={board({ id: 'o', name: 'The team is aiming for 100 sales.', count: 87, target: 100, stands: { word: 'Close' }, fromTheDeals: { counts: 'sales', sold: 87, proven: 71 } })} />)
    const bar = screen.getByRole('img', { name: '87 of 100, 71 shown by a document.' })
    expect((bar.querySelector('.pb-bar-done') as HTMLElement).style.width).toBe('71%')
    expect((bar.querySelector('.pb-bar-said') as HTMLElement).style.width).toBe('16%')
    expect(screen.getByText('Ringed is someone’s word. Filled is shown by a document.')).toBeTruthy()
  })
  it('draws no bar where no count is on record', () => {
    wrap(<ThePicturedBoard {...common} order={['headlineTargets']} b={board({ id: 'o', name: 'The team is aiming for 100 sales.', count: null, target: 100 })} />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('a deal’s last six weeks', () => {
  it('is one dot a week: filled where proof showed contact, ringed where it was said, faint where nothing is on record', () => {
    const day = (n: number) => isoDay(new Date(Date.now() - n * 86400000))
    const rows = [{ id: 'a', kind: 'deal', name: 'Gikomba Cold Store', owner: 'Akinyi', mark: 'proven', stage: 'Quoted', contactHistory: [{ on: day(1), how: 'with proof, a photo' }, { on: day(36), how: 'said' }] }]
    const { container } = wrap(<EveryDealDayByDay b={{ participants: [], canEditFrame: false }} section={{ section: 'Deal grid', rows, groups: [], lost: [] }} now={new Date()} groundId="g" />)
    expect(screen.getByRole('columnheader', { name: 'Last six weeks' })).toBeTruthy()
    const strip = container.querySelector('.pb-weeks') as HTMLElement
    expect(strip.querySelectorAll('.pb-dot')).toHaveLength(6)
    expect(strip.querySelectorAll('.pb-dot-proof')).toHaveLength(1)
    expect(strip.getAttribute('aria-label')).toContain('contact with proof')
  })
})
