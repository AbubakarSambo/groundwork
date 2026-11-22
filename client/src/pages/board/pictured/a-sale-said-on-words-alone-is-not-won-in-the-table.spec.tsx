import { it, expect, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EveryDealDayByDay } from './ThePicturedSalesBoard'

/**
 * RELEASE TEST, 22 NOVEMBER 2026, BUG 18. With the design switch off, Wairimu's "Every deal, with its rep, its stage and what shows it"
 * read Quickmart Ruaka at "Won", "From memory": the stage Chidi said, though the server serves "Said to be won, not shown yet" for it.
 * The table reads the stage as the record holds it, the same as every other deal grid. Mama Njeri Duka, shown by her signed order,
 * stays at Won; Kilimani Fresh, spoken of, is at Contacted.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
const rows = [
  { id: 'q', kind: 'deal', name: 'quickmart ruaka', stage: 'Won', stageSays: 'Said to be won, not shown yet', group: 'said-won', owner: 'Chidi Okeke', mark: 'memory', lastSaidOn: '2026-11-22', contactHistory: [{ on: '2026-11-22', how: 'in their words' }] },
  { id: 'n', kind: 'deal', name: 'Mama Njeri Duka', stage: 'Won', group: 'won', owner: 'Amani Wekesa', mark: 'proven', lastSaidOn: '2026-11-22', contactHistory: [{ on: '2026-11-22', how: 'with proof' }] },
  { id: 'k', kind: 'deal', name: 'Kilimani Fresh', stage: 'Contacted', group: 'possible', owner: 'Amani Wekesa', mark: 'said', lastSaidOn: '2026-11-22', contactHistory: [{ on: '2026-11-22', how: 'in their words' }] },
]

it('Wairimu reads each deal at the stage the record holds', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>
    <EveryDealDayByDay b={{ participants: [], canEditFrame: false, releaseOneSalesBoard: false }} section={{ section: 'Deal grid', rows, groups: [] }} now={new Date('2026-11-22T12:00:00Z')} groundId="g1" />
  </MemoryRouter></QueryClientProvider>)
  const table = document.querySelector('table')!
  const stageOf = (name: string) => {
    const tr = [...table.querySelectorAll('tr')].find((r) => (r.textContent ?? '').includes(name))!
    return within(tr as HTMLElement).getAllByRole('cell').map((c) => c.textContent ?? '').join(' | ')
  }
  expect(stageOf('quickmart ruaka')).toContain('Said to be won, not shown yet')
  expect(stageOf('quickmart ruaka')).not.toMatch(/\|\s*Won\s*\|/)
  expect(stageOf('Mama Njeri Duka')).toContain('Won')
  expect(stageOf('Kilimani Fresh')).toContain('Contacted')
  expect(stageOf('Kilimani Fresh')).not.toContain('Not contacted yet')
})
