/**
 * THE SALES BOARD, PORTED FROM THE PROTOTYPE'S MARKUP, AS WAIRIMU READS IT (Hafsah, 21 November 2026).
 *
 * The board the local copy served Wairimu, who runs Sales team, Q4, that evening, saved as it came (three deals, five people, five
 * sessions with Chidi ahead of the rest). With the design switch on she reads the prototype's sales board (board-as-lead.txt), in its
 * order and words, filled from her record. With it off, none of it is drawn.
 *
 * It checks what she reads, as text: the six things the coordinator found on 21 November (the session count, two reports on one day,
 * who is counted, the work tag, the missing parts, the flat deal grid) and the prototype's own sentences.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from '../BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import board from '../__fixtures__/sales-team-q4-with-deals-as-wairimu.json'
import ground from '../__fixtures__/sales-team-q4-with-deals-ground-as-wairimu.json'

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
  who.me = { id: (ground as any).initiatorId, firstName: 'Wairimu', role: 'LEAD' }
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

/** The text of one section, from its heading to the next heading of the same level. */
function section(container: HTMLElement, heading: string): HTMLElement {
  const h = [...container.querySelectorAll('h2')].find((x) => x.textContent === heading)
  expect(h, `"${heading}" is a heading`).toBeTruthy()
  return h!.closest('section') as HTMLElement
}

describe('the sales board ported from the prototype, as Wairimu reads it', { timeout: 60000 }, () => {
  beforeEach(() => vi.clearAllMocks())

  it('with the switch off, none of the port is drawn', async () => {
    const { container } = renderIt(false)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    expect(container.querySelector('.gw-proto')).toBeNull()
  })

  it('with it on, she reads board-as-lead.txt\'s parts in its order, in its words', async () => {
    const { container } = renderIt(true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    expect(container.querySelector('.gw-proto [data-board]')).not.toBeNull()
    const text = container.textContent ?? ''
    /* The header: the prototype's word "Session", from the one clock. */
    expect(text).toContain('Every Friday. Session 2 of 12. Runs until 28 January.')
    expect(text).toContain('The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.')
    const order = ['Will we reach 40 new shops a week by 28 January 2027?', 'What needs you in this check-in', 'Every deal, day by day', 'The team today', 'Blockers',
      'What keeps coming up', 'Reported vs criteria met, stage by stage', 'Who checked in', 'Over time', 'Reports', 'Every session', 'Help nobody mentioned',
      'Waiting on other teams', 'Open issues', 'Where this is heading']
    for (let i = 1; i < order.length; i++) expect(at(text, order[i - 1]), `${order[i - 1]} before ${order[i]}`).toBeLessThan(at(text, order[i]))
    expect(container.querySelector('.askdock input[aria-label="Ask about this board"]')).not.toBeNull()
    expect(text).toContain('No chance-to-close percentages yet. They need a quarter of this team’s own results.')
    expect(text).toContain('These are about the work. Open anyone to see what they said and what the proof shows.')
  })

  it('the deals are grouped as the prototype groups them, each group with its reason', async () => {
    const { container } = renderIt(true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const deals = section(container, 'Every deal, day by day').textContent ?? ''
    expect(at(deals, 'Possible')).toBeLessThan(at(deals, 'quickmart'))
    expect(deals).toContain('Moving, but missing a criterion or recent contact')
    expect(at(deals, 'quickmart')).toBeLessThan(at(deals, 'Said to be won, not shown yet'))
    expect(at(deals, 'Said to be won, not shown yet')).toBeLessThan(at(deals, 'naivas'))
    expect(container.querySelectorAll('.dealrow')).toHaveLength(3)
    /* Thirty weekdays, one dot each, on every deal. */
    expect(container.querySelectorAll('.dealrow')[0].querySelectorAll(':scope > i')).toHaveLength(30)
  })

  it('the team and who checked in name the same people, the lead in neither, and each tag is about the work', async () => {
    const { container } = renderIt(true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const team = [...section(container, 'The team today').querySelectorAll('b.t-body')].map((x) => x.textContent)
    const checkedIn = [...section(container, 'Who checked in').querySelectorAll('.scroll-x span.t-small')].map((x) => x.textContent)
    expect(team.length).toBe(5)
    expect([...checkedIn].sort()).toEqual([...team].sort())
    expect(team).not.toContain('You')
    expect(team).not.toContain('Wairimu')
    expect(section(container, 'The team today').textContent).not.toMatch(/Last in \d/)
  })

  it('every report row counts the same people the team rows do, and two sessions on one day are told apart', async () => {
    const { container } = renderIt(true)
    await screen.findByText('The team today', undefined, { timeout: 30000 })
    const reports = section(container, 'Reports').textContent ?? ''
    for (const m of reports.matchAll(/(\d+) of (\d+) checked in\./g)) expect(Number(m[2])).toBe(5)
    expect(reports).toMatch(/session 4/)
    expect(reports).toMatch(/session 3/)
    expect(reports).toMatch(/All \d+ sessions/)
    expect(reports).not.toContain('check-ins')
  })
})
