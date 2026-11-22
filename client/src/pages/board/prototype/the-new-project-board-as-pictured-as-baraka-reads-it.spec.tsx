/**
 * A NEW PROJECT, PORTED FROM THE PROTOTYPE'S MARKUP, AS BARAKA (WHO RUNS IT) READS IT (Hafsah, 21 November 2026). The board the local
 * copy served Baraka for "The new stock system, four depots", saved as it came after its kind of work was read again (distribution
 * operations, so its records are incidents). With the design switch on he reads the prototype's new-project board
 * (engineering-release-as-lead.html) in its order and words; with it off, none of it is drawn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from '../BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import board from '../__fixtures__/the-new-stock-system-as-baraka.json'
import ground from '../__fixtures__/the-new-stock-system-ground-as-baraka.json'

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

describe('a new project ported from the prototype, as Baraka reads it', { timeout: 60000 }, () => {
  beforeEach(() => vi.clearAllMocks())

  it('with the switch off, none of the port is drawn', async () => {
    const { container } = renderIt(false)
    await screen.findAllByText(/stock system/, undefined, { timeout: 30000 })
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  it('with it on, he reads the prototype\'s parts in its order and words, with this check-in\'s own records', async () => {
    const { container } = renderIt(true)
    await screen.findByText('Where each target stands', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    const order = ['Where each target stands', 'What needs you in this check-in', 'Every incident, and what shows it', 'The team today', 'Who checked in',
      'Blockers', 'What keeps coming up', 'Reports', 'Every session', 'Where this is heading']
    for (let i = 1; i < order.length; i++) expect(at(text, order[i - 1]), `${order[i - 1]} before ${order[i]}`).toBeLessThan(at(text, order[i]))
    expect(text).toContain('No target is set yet.')
    expect(text).toContain('The one thing slowing me down')
    expect(text).not.toContain('Baraka has')
    /* The word "ground" is never on screen: the targets prompt says "this check-in" (release test, 21 November 2026, bug 41). */
    expect(text).not.toMatch(/\bground\b/i)
    expect(container.querySelector('.askdock input[aria-label="Ask about this board"]')).not.toBeNull()
  })

  /* Bug 42 (release test, 21 November 2026): "14 Nov, session 4: 2 of 3 checked in" against "4 of 5" on the check-ins page. The rows
     counted for themselves; they read the count the server serves for each session now, as the check-ins page does. */
  it('each report row reads the served count for its session, and "All N sessions" is the header\'s own session', async () => {
    const { container } = renderIt(true)
    await screen.findByText('Reports', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    const served = (n: number) => (board as any).theCount.bySession[String(n)]
    for (const n of [3, 4]) expect(text).toContain(`${served(n).answered.length} of ${served(n).onTheCheckIn.length} checked in.`)
    expect(text).toContain(`All ${(board as any).theCount.session} sessions`)
    expect(text).toContain(`Session ${(board as any).theCount.session} of 12.`)
  })
})
