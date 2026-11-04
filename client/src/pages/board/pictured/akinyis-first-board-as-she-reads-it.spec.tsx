import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedSalesBoard } from './ThePicturedSalesBoard'
import { ThePicturedBoard } from './ThePicturedBoard'
import './pictured-board.css'

vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({})) } }))
vi.mock('@/lib/the-direct-morning', () => ({ useTheDirectMorning: () => true }))

/**
 * AKINYI'S FIRST BOARD, ITS FIRST SCREEN, AS SHE READS IT (the approved journey, stage 10; F5 part 3). The board opens on the target's
 * question and its answer, then what needs her, then where people differ ("Each account, side by side") and what nobody knows yet,
 * the same two sections every situation's board draws (TheSituationsSections). Before any of the rest, and before what the target
 * assumes, which is her own setup words. The board below is what the server serves her, cut to what these sections read.
 */
const B = {
  releaseOneSalesBoard: true, kindOfWork: 'sales team', scenario: 'PULSE_CHECK', canEditFrame: true, myParticipantId: 'p-akinyi',
  headline: { question: 'Will we reach 25 sales by 31 December?', answer: 'Not known yet. Nobody has given the quarter’s number. Jane and John named 3 deals today; they are on the board below.', bars: [] },
  objectives: [{ id: 'o1', name: '25 sales by 31 December', target: 25, count: 0, assumes: ['Every rep closes two a month.'] }],
  participants: [
    { id: 'p-akinyi', name: 'Akinyi Otieno', managingOnly: true },
    { id: 'p-jane', name: 'Jane Wanjiku' }, { id: 'p-john', name: 'John Kamau' },
    { id: 'p-peter', name: 'Peter Mbugua' }, { id: 'p-mary', name: 'Mary Mwangi' },
  ],
  checkInGrid: { sessions: [1], rows: [
    { participantId: 'p-jane', cells: { 1: 'done' } }, { participantId: 'p-john', cells: { 1: 'done' } },
    { participantId: 'p-peter', cells: {} }, { participantId: 'p-mary', cells: {} },
  ] },
  whoOwnsWhat: [
    { participantId: 'p-jane', name: 'Jane Wanjiku', items: [{ type: 'INTENT', text: 'Jane Wanjiku said, "Westgate is waiting on a quote."' }, { type: 'WORRY', text: 'Jane Wanjiku said, "Westgate wants the quote by Friday."' }] },
    { participantId: 'p-john', name: 'John Kamau', items: [{ type: 'INTENT', text: 'John Kamau said, "The Westgate quote went last week."' }] },
  ],
  leadActions: [], decisions: [], workRecords: [],
}
const text = (node: React.ReactNode) => {
  const { container } = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
  return (container.textContent ?? '').replace(/\s+/g, ' ')
}
const props = { groundId: 'g-deals', sessionRows: [], renderActions: () => null, overTime: null, recommendations: [], onAnswerRecommendation: () => undefined, recommendationBusy: false, onRecordTheDecision: () => undefined, navigate: () => undefined }

describe('Akinyi’s first board, the first screen', () => {
  for (const [name, node] of [
    ['the sales board', <ThePicturedSalesBoard key="s" b={B} {...props as any} />],
    ['a situation’s sales board', <ThePicturedBoard key="p" b={B} order={['headline', 'needsYou', 'accounts', 'knownBelievedUnknown', 'closing', 'teamToday']} {...props as any} />],
  ] as const) {
    it(`opens on the target, then where people differ, then what nobody knows yet (${name})`, () => {
      const t = text(node)
      const at = (s: string) => { const i = t.indexOf(s); expect(i, s).toBeGreaterThanOrEqual(0); return i }
      const q = at('Will we reach 25 sales by 31 December?')
      const a = at('Not known yet. Nobody has given the quarter’s number. Jane and John named 3 deals today; they are on the board below.')
      const differ = at('Each account, side by side')
      at('“Westgate is waiting on a quote.”')
      at('“The Westgate quote went last week.”')
      const unknown = at('What’s known, believed and unknown')
      at('Westgate wants the quote by Friday. (Jane said it)')
      expect(q < a && a < differ && differ < unknown).toBe(true)
      /* Her own setup words are not on the first screen ahead of these. */
      const assumes = t.indexOf('Every rep closes two a month.')
      if (assumes >= 0) expect(assumes).toBeGreaterThan(unknown)
    })
  }
})
