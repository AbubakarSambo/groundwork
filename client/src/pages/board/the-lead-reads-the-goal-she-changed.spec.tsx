/**
 * BUG N1 (Drop Access, final run of 22 November 2026). Wairimu changed the team's goal in Ask to a waitlist of shops, because the freezers
 * are out of stock. Amani's board said the new goal and when and why it changed. Wairimu's own board, with the design switch on and off,
 * said none of it: the top of her sales board was the deal pipeline and an empty bar. She now reads the goal, what stops the work and the
 * change, from what the engine serves her (objective `changed` and glance.inTheWay.stopped), each sentence once.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { HeadlineAndGap } from './pictured/ThePicturedSalesBoard'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import asWairimuWithItsKind from './__fixtures__/sales-team-q4-as-wairimu-with-its-kind.json'
import groundWithItsKind from './__fixtures__/sales-team-q4-ground-as-wairimu-with-its-kind.json'

const who = vi.hoisted(() => ({ me: { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' } as { id: string; firstName: string; role: string } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: who.me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const GOAL = 'Each person builds a waitlist of 15 shops by 31 December'
/* As the engine serves it to whoever runs the check-in (theChangeAsASentence with what it was). */
const CHANGED = 'On 22 November the goal changed, because the freezers we sell are out of stock until January. Before that, the goal was the team’s “Freezers sold by the team this quarter”.'
const theGoal = { id: 'o-team', name: GOAL, target: 15, count: 0, prevCount: 0, ownerParticipantId: null, changed: CHANGED, saidBy: [] }
const withTheChange = (b: any) => ({
  ...b,
  headline: null,
  objectives: [theGoal],
  howItIsGoing: { ...b.howItIsGoing, glance: { ...b.howItIsGoing.glance, inTheWay: { ...b.howItIsGoing.glance.inTheWay, stopped: CHANGED } } },
})

describe('Wairimu reads the goal she changed at the top of her own board', { timeout: 60000 }, () => {
  beforeEach(() => vi.clearAllMocks())

  it('with the design switch on: the goal, then when and why it changed, once', async () => {
    localStorage.clear()
    localStorage.setItem('gw-design-pass', 'on')
    who.me = { id: (groundWithItsKind as any).initiatorId, firstName: 'Wairimu', role: 'LEAD' }
    ;(groundsApi.get as any).mockResolvedValue(groundWithItsKind)
    ;(boardApi.get as any).mockResolvedValue(withTheChange(asWairimuWithItsKind))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/f114832a/board']}>
          <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText(`${GOAL}.`, undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(text).toContain(`What the team is aiming for${GOAL}.${CHANGED}`)
    expect(text.split(CHANGED).length - 1).toBe(1)
  })

  it('with the design switch off: the same goal and the same sentence, above the bar and the deals', () => {
    const b = withTheChange(asWairimuWithItsKind)
    const deals = { section: 'Deal grid', rows: [{ id: 'd1', kind: 'deal', name: 'Kilimani Fresh', group: 'possible', owner: 'Amani' }] }
    const { container } = render(<MemoryRouter><HeadlineAndGap b={b} deals={deals} groups={{ possible: deals.rows }} /></MemoryRouter>)
    const text = container.textContent ?? ''
    expect(text).toContain(`What the team is aiming for${GOAL}.${CHANGED}`)
    expect(text.indexOf(CHANGED)).toBeLessThan(text.indexOf('likely'))
    expect(text.split(CHANGED).length - 1).toBe(1)
  })

  /* Changed 22 November evening (R-6): a goal with a change of its own says that change, and only that; the glance's stop is said here only
     for a goal with no change of its own. Before, both were drawn, and the same change read twice whenever the glance's copy had lost its
     quotation marks at the read. */
  it('a stock-out on another goal is said where this goal has no change, and a headline question already says the goal, so its name is not said twice', () => {
    const stopped = 'On 21 November the goal changed, because the depot is closed.'
    const b = { ...withTheChange(asWairimuWithItsKind), headline: { question: 'Will each person build a waitlist of 15 shops by 31 December?', answer: null } }
    b.objectives = [{ ...theGoal, changed: null }]
    b.howItIsGoing.glance.inTheWay.stopped = stopped
    const { container } = render(<MemoryRouter><HeadlineAndGap b={b} deals={null} groups={{}} /></MemoryRouter>)
    const text = container.textContent ?? ''
    expect(text).toContain(stopped)
    expect(text).not.toContain('What the team is aiming for')
  })

  /* RE-TEST, 22 NOVEMBER EVENING (R-6): the engine serves the change on the goal with its quotation marks, and the glance's copy without
     them (the read strips marks it cannot find in the record). Wairimu read the sentence twice. */
  it('the change is said once when the glance holds the same change without its quotation marks', () => {
    const b = withTheChange(asWairimuWithItsKind)
    b.howItIsGoing.glance.inTheWay.stopped = CHANGED.replace(/[“”]/g, '')
    const { container } = render(<MemoryRouter><HeadlineAndGap b={b} deals={null} groups={{}} /></MemoryRouter>)
    const text = container.textContent ?? ''
    expect(text).toContain(`What the team is aiming for${GOAL}.${CHANGED}`)
    expect(text.split('the goal changed').length - 1).toBe(1)
  })
})
