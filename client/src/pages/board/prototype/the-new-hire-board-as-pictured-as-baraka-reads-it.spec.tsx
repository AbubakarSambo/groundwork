/**
 * A NEW HIRE'S FIRST NINETY DAYS, PORTED FROM THE PROTOTYPE'S MARKUP, AS BARAKA (WHO RUNS IT) READS IT (Hafsah, 21 November 2026).
 * The board the local copy served Baraka for "Imani Hassan, first ninety days", saved as it came. With the design switch on he reads
 * the prototype's new-hire board (kwame-first-90-days-as-lead.html) in its order and words; with it off, none of it is drawn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from '../BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import board from '../__fixtures__/imani-first-ninety-days-as-baraka.json'
import ground from '../__fixtures__/imani-first-ninety-days-ground-as-baraka.json'

const who = vi.hoisted(() => ({ me: { id: '', firstName: 'Wairimu', role: 'LEAD' } as { id: string; firstName: string; role: string } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: who.me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn().mockResolvedValue({ waitingOnOtherTeams: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

function renderIt(designPass: boolean) {
  localStorage.clear()
  if (designPass) localStorage.setItem('gw-design-pass', 'on')
  who.me = { id: (ground as any).initiatorId, firstName: 'Baraka', role: 'LEAD' }
  ;(groundsApi.get as any).mockResolvedValue(ground)
  ;(boardApi.get as any).mockResolvedValue(board)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/grounds/${(board as any).groundId}/board`]}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const at = (text: string, words: string) => {
  const i = text.indexOf(words)
  expect(i, `"${words}" is on the board`).toBeGreaterThanOrEqual(0)
  return i
}

describe('a new hire\'s first ninety days ported from the prototype, as Baraka reads it', { timeout: 60000 }, () => {
  beforeEach(() => vi.clearAllMocks())

  it('with the switch off, none of the port is drawn', async () => {
    const { container } = renderIt(false)
    await screen.findAllByText(/Imani/, undefined, { timeout: 30000 })
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  it('with it on, he reads the prototype\'s parts in its order and words, filled from the record', async () => {
    const { container } = renderIt(true)
    await screen.findByText('What was agreed at the start', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    /* Changed 24 November 2026: the line is the board frame's, as on every board since journey 3: the lead is "you", and "Check-in", not "Session". */
    expect(text).toContain('Imani Hassan and you. Every other Friday. Check-in 2 of 6. Runs until 21 January.')
    const order = ['What was agreed at the start', 'Change since last check-in', 'The 90 days, in three steps', 'After 30 days: is Imani Hassan settled in?',
      'Imani’s history', 'Where you both see it differently', 'Every session', 'Where this is heading', 'Keep on', 'Extend settling-in', 'Change the role', 'Part ways']
    for (let i = 1; i < order.length; i++) expect(at(text, order[i - 1]), `${order[i - 1]} before ${order[i]}`).toBeLessThan(at(text, order[i]))
    expect(text).toContain('Nothing was agreed at the start yet.')
    expect(text).toContain('You and Imani have not seen anything differently yet.')
    /* Changed 24 November 2026: the board is rebuilt on the design system inside the board's frame, so its one Ask is the header's
       (rule 8), not a second Ask bar at the foot. */
    expect(container.querySelector('.askdock')).toBeNull()
    expect(screen.getAllByRole('button', { name: /Ask/ }).length).toBeGreaterThan(0)
  })
})
