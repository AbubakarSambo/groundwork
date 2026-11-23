/**
 * SALES TEAM, Q4, AS HAFSAH READ IT (21 November 2026): "the sales board is more focused on showing the check-in status than
 * anything useful". The two boards here are the ones the live copy served that afternoon, to Wairimu (who runs it) and Grace (an
 * admin who reads it), saved as they came (__fixtures__/sales-team-q4-as-*.json).
 *
 * With the design pass off, nothing moves. With it on, the board leads with the work, as the prototype's board does
 * (B5-the-board/board-as-lead.txt), and the check-in status sits together where the prototype keeps it: how far the check-in has
 * got, then "Who checked in", "Over time" and "Reports". Each person's record follows the work instead of coming before it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import asWairimu from './__fixtures__/sales-team-q4-as-wairimu.json'
import asGrace from './__fixtures__/sales-team-q4-as-grace.json'
import asWairimuWithItsKind from './__fixtures__/sales-team-q4-as-wairimu-with-its-kind.json'
import groundAsWairimu from './__fixtures__/sales-team-q4-ground-as-wairimu.json'
import groundAsGrace from './__fixtures__/sales-team-q4-ground-as-grace.json'
import groundWithItsKind from './__fixtures__/sales-team-q4-ground-as-wairimu-with-its-kind.json'
import { groundsApi } from '@/api/grounds'

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

const GLANCE = '2 of the 12 check-ins are done.'

function renderAs(reader: 'wairimu' | 'grace' | 'wairimu-sales', designPass: boolean) {
  localStorage.clear()
  if (designPass) localStorage.setItem('gw-design-pass', 'on')
  /* The ground and the board each reader was served; the lead is whoever the ground names as running it. */
  const ground: any = reader === 'wairimu' ? groundAsWairimu : reader === 'grace' ? groundAsGrace : groundWithItsKind
  who.me = reader !== 'grace' ? { id: ground.initiatorId, firstName: 'Wairimu', role: 'LEAD' } : { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
  ;(groundsApi.get as any).mockResolvedValue(ground)
  ;(boardApi.get as any).mockResolvedValue(reader === 'wairimu' ? asWairimu : reader === 'grace' ? asGrace : asWairimuWithItsKind)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/f114832a/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Where a sentence first appears in what the reader reads, so two can be put in order. */
const at = (text: string, words: string) => {
  const i = text.indexOf(words)
  expect(i, `"${words}" is on the board`).toBeGreaterThanOrEqual(0)
  return i
}

describe('Sales team, Q4, as each reader reads it', { timeout: 60000 }, () => {
  beforeEach(() => vi.clearAllMocks())

  it('with the design pass off, Wairimu reads it exactly as before: the check-in status first', async () => {
    const { container } = renderAs('wairimu', false)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(at(text, 'Your team, person by person')).toBeLessThan(at(text, 'The team today'))
    expect(at(text, GLANCE)).toBeLessThan(at(text, 'The team today'))
  })

  it('with it on, Wairimu reads the work first, and the check-in status together, above "Who checked in"', async () => {
    const { container } = renderAs('wairimu', true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(at(text, 'What to settle together')).toBeLessThan(at(text, 'What the team is aiming for'))
    expect(at(text, 'What the team is aiming for')).toBeLessThan(at(text, 'What needs you in this check-in'))
    expect(at(text, 'What needs you in this check-in')).toBeLessThan(at(text, 'The team today'))
    expect(at(text, 'The team today')).toBeLessThan(at(text, 'Blockers'))
    expect(text.split('What the team is aiming for').length - 1).toBe(1)
    expect(at(text, 'Blockers')).toBeLessThan(at(text, GLANCE))
    /* Each person's record, Praise and Start a plan are on their own page with the switch on (TheirPartOfYourTeam). */
    expect(text).not.toContain('Your team, person by person')
    expect(at(text, GLANCE)).toBeLessThan(at(text, 'Who checked in'))
    expect(at(text, 'Who checked in')).toBeLessThan(at(text, 'Reports'))
    expect(at(text, 'Reports')).toBeLessThan(at(text, 'Where this is heading'))
    expect(text.split(GLANCE).length - 1).toBe(1)
  })

  it('with it on, Grace reads the team before the status, and "Not shared yet." once on each report, the note saying who shares it', async () => {
    const { container } = renderAs('grace', true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(at(text, 'The team today')).toBeLessThan(at(text, GLANCE))
    expect(at(text, GLANCE)).toBeLessThan(at(text, 'Who checked in'))
    expect(text).toContain('Each check-in has a team report, once Wairimu shares it.')
    expect(text).not.toContain('Not shared yet. Wairimu shares it.')
    expect(screen.getAllByText('Not shared yet.').length).toBeGreaterThan(0)
    expect(text).not.toContain('Your team, person by person')
  })

  it('with it off, Grace still reads who shares each report on its row', async () => {
    const { container } = renderAs('grace', false)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    expect(container.textContent).toContain('Not shared yet. Wairimu shares it.')
  })
  /* The same check-in with its kind of work stored as "sales team" (the copy made on 21 November): the sales board, as pictured. */
  it('the sales board, switch off: "Where this is heading" before "Reports", as before', async () => {
    const { container } = renderAs('wairimu-sales', false)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(at(text, 'Where this is heading')).toBeLessThan(at(text, 'Reports'))
    expect(at(text, 'The team today')).toBeLessThan(at(text, 'Your team, person by person'))
  })

  it('the sales board, switch on: board-as-lead.txt\'s order, and what it has no place for after "Where this is heading"', async () => {
    const { container } = renderAs('wairimu-sales', true)
    await screen.findByRole('heading', { name: 'The team today' }, { timeout: 30000 })
    const text = container.textContent ?? ''
    expect(at(text, 'What needs you in this check-in')).toBeLessThan(at(text, 'The team today'))
    expect(at(text, 'The team today')).toBeLessThan(at(text, 'Who checked in'))
    expect(at(text, 'Who checked in')).toBeLessThan(at(text, 'Reports'))
    /* The board ported from the prototype (prototype/TheSalesBoardAsPictured.tsx) draws "Open issues" only with an issue in it, as the
       prototype does; this check-in has none, so it reads Reports, then Where this is heading. */
    expect(at(text, 'Reports')).toBeLessThan(at(text, 'Where this is heading'))
    /* Changed 23 November (journey 3): "What keeps coming up" with nothing in it is not drawn (rule 10), and the note that explains
       The team today is gone, as on every board since 15 November (rule 6). */
    expect(text).not.toContain('Nothing has come up in three check-ins in a row yet.')
    expect(text).not.toContain('These are about the work. Open anyone to see what they said and what the proof shows.')
    expect(text).not.toContain('Your team, person by person')
  })
});
