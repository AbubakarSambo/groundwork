import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { SWITCHBOARD_MATRIX, G2_SECTION_TO_BOARD_SECTION, G2_SECTION_NAMES } from './the-switchboard-g2-table'

/**
 * U.10 PICTURE-CHECK ROUND 6, ITEM J: FOR ALL 24 SITUATIONS, THE BOARD SHOWS EXACTLY THE
 * SWITCHBOARD'S SECTIONS, IN ITS ORDER - NO MORE, NO FEWER.
 *
 * G2 (docs/modules.md, transcribed as data in the-switchboard-g2-table.ts's `SWITCHBOARD_MATRIX`)
 * names 30 sections across 24 situations; only 7 of them have a served counterpart today
 * (`G2_SECTION_TO_BOARD_SECTION`): Targets, Starting agreement, Accounts side by side, Known and
 * unknown, Change since last, Blockers, Patterns - which map to the board's `objectives`,
 * `startingState`, `divergence`, `whatTheRoomIsAbout`, `quickRead`, `dependencies` and `patterns`.
 * THE OTHER NAMED SECTIONS: request 70 (1 October) gave 13 more of them a served field (Risks, Work
 * plan, Timeline, Person history, Blocker check, Evidence index, Busy or moving, Lead actions,
 * Obligations, Forecast, Who waited on whom, Contradictions, Questions for the lead - see
 * TheSwitchboardsSections.tsx), but `boardFor()` below carries no data for any of them, so they draw
 * nothing here regardless of what G2 names for a situation - this test's own scope stays the
 * original 7 (`TITLE_FOR_BOARD_SECTION`), which is also why `MAPPED_ORDER` is filtered down to only
 * the names that map to one of those 7, rather than every name `G2_SECTION_TO_BOARD_SECTION` now
 * resolves. Their own order-and-visibility coverage is in TheSwitchboardsSections.spec.tsx instead.
 *
 * G2's OWN TABLE ORDER IS FIXED, REGARDLESS OF SITUATION, WITH ONE EXCEPTION NOW (board review,
 * sales piece A, item 1): `patterns` ("What keeps coming up") moved to the front of the 7. The other
 * six - objectives, startingState, divergence, whatTheRoomIsAbout, quickRead, dependencies - keep
 * their own relative order among themselves (G2's table order is otherwise untouched), but now draw
 * inside the one shared "Everything else from this check-in" fold near the foot of the board, for
 * every situation - no prototype screen shows "Where people differ", "The quick read" and the rest
 * as its own heading, and CLAUDE.md protects patterns (and coaching, right after it) from ever being
 * folded, hidden or simplified away. `patterns` is drawn in the open, ahead of that fold, which is
 * why it is pinned first here instead of last. This is a page-wide template change, not a
 * per-situation special case: every situation's own data still renders, in the fold, in the same
 * order it always has - only `patterns` moved, for all 24 situations alike.
 */

vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-lead', firstName: 'Wairimu', role: 'MEMBER' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-lead', timelineDays: 90, cadence: 'WEEKLY' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

/** The Sec title BoardPage.tsx actually renders for each of the 7 mapped board sections this test covers. */
const TITLE_FOR_BOARD_SECTION: Record<string, string> = {
  objectives: 'What the team is aiming for',
  startingState: 'What was agreed at the start',
  divergence: 'Where people differ',
  whatTheRoomIsAbout: 'What people are after, and where',
  quickRead: 'The quick read',
  dependencies: 'Waiting on',
  patterns: 'What keeps coming up',
}

/** The 7 switchboard-mapped sections this test covers, in the fixed order BoardPage.tsx always
    renders them - restricted to names that resolve to one of the 7 above, so the 13 sections
    request 70 later mapped (which `boardFor()` below carries no data for) are out of this test's
    scope rather than producing stray `undefined` titles. */
const MAPPED_ORDER = G2_SECTION_NAMES.filter((n) => TITLE_FOR_BOARD_SECTION[G2_SECTION_TO_BOARD_SECTION[n] ?? ''] != null)

/** A served shape carrying real data for every one of the 7 mapped sections, whatever the scenario. */
function boardFor(scenario: string) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'Test check-in', scenario,
    coverageVariant: 'text', lastChangedAt: '2026-09-23T15:02:00.000Z',
    sections: ['objectives', 'startingState', 'divergence', 'whatTheRoomIsAbout', 'dependencies', 'patterns', 'quickRead'],
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [
      { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
      { id: 'p-a', name: 'Amani Wekesa', role: null, managingOnly: false, signedOffAt: null },
    ],
    objectives: [{
      id: 'o1', name: 'Sales', count: 6, prevCount: 0, target: 12, delta: 6, isNew: false, askedOf: null,
      suggestedCount: null, notSettled: null,
      journey: { direction: 'up' as const, start: 0, now: 6, target: 12, say: '', covered: 50 },
    }],
    startingState: 'Agreed to close 12 sales by the end of the quarter.',
    divergence: { items: [], agreements: [], centralQuestion: null, pointer: 'Nothing to compare yet.' },
    whatTheRoomIsAbout: {
      aims: [{ aim: 'Close more deals', held: ['Amani Wekesa'] }],
      places: [], things: [], readAtSession: 1,
    },
    dependencies: [{ id: 'd1', from: 'Amani Wekesa', what: 'a decision', on: 'Wairimu Kamau', status: 'BLOCKING' as const, then: null }],
    // The served shape (api/src/modules/patterns/who-reads-a-pattern.ts): no more `code`, `label`,
    // `text` or `periods` - see docs/answers-from-engine.md, "Patterns have a new shape".
    patterns: [{
      id: 'pat1', participantId: 'p-a', yours: false,
      heading: 'Something keeps happening.', whatHappened: null,
      howOften: 'This came up in 3 check-ins.', askThem: 'What is behind it?',
      theirWords: null, canAnswer: false, whoSeesIt: 'Amani Wekesa has not seen this yet, and has not answered yet.',
    }],
    quickRead: [{ label: 'Differences', value: 'None', sub: 'no disagreement', tone: 'good' }],
  }
}

const DRAWN_AS_PICTURED = new Set(['CRISIS_ALIGNMENT', 'PIP'])
function renderBoardFor(scenario: string) {
  ;(boardApi.get as any).mockResolvedValue(boardFor(scenario))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[DRAWN_AS_PICTURED.has(scenario) ? '/grounds/g1/board?whole=1' : '/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the switchboard decides the board, for all 24 situations', () => {
  it('covers every situation the switchboard names, so this cannot silently shrink', () => {
    expect(SWITCHBOARD_MATRIX.length).toBe(24)
  })

  /*
   * SCREEN MATCH, 16 OCTOBER: A SITUATION WHOSE BOARD IS NOW DRAWN AS PICTURED IS CHECKED BY ITS OWN SPEC, not by
   * these seven older section titles. "Work through a big decision" (CRISIS_ALIGNMENT) is supplier-board.jpg's
   * decision board: the decision, each account side by side, what is known, believed and unknown (see
   * a-decision-board-as-the-lead-reads-it.spec.tsx). "Help someone get back on track" (PIP) is danielpip-board.jpg's:
   * Groundwork's suggestion, the person's case, every session (a-performance-plan-board-as-each-reader-reads-it.spec.tsx).
   * Nothing is lost: these two are still checked here, every section in order, on "See every other part of this
   * board" (?whole=1), the whole board as it was.
   */
  for (const row of SWITCHBOARD_MATRIX) {
    it(`${row.situation} (${row.scenario}): shows exactly the switchboard's sections, in order`, async () => {
      const named = new Set([...row.sectionsOn, ...row.optional])
      const inG2Order = MAPPED_ORDER.filter((n) => named.has(n) && !row.offOnPurpose.includes(n))
      // "Patterns" moves to the front of whichever of the 7 this situation shows - see the file
      // comment above. The rest keep G2's own order among themselves.
      const expectedG2Names = inG2Order.includes('Patterns')
        ? ['Patterns', ...inG2Order.filter((n) => n !== 'Patterns')]
        : inG2Order
      const expectedTitles = expectedG2Names.map((n) => TITLE_FOR_BOARD_SECTION[G2_SECTION_TO_BOARD_SECTION[n]!])

      renderBoardFor(row.scenario)
      await screen.findByRole('heading', { name: 'Test check-in' })

      // Every section this situation names appears, and none of the other mapped 7 do.
      for (const title of Object.values(TITLE_FOR_BOARD_SECTION)) {
        const found = screen.queryAllByText(title)
        if (expectedTitles.includes(title)) expect(found.length, `expected "${title}" to appear for ${row.situation}`).toBeGreaterThan(0)
        else expect(found.length, `expected "${title}" NOT to appear for ${row.situation}`).toBe(0)
      }

      // And in G2's own fixed order - not sections.on before sections.optional.
      const headings = screen.getAllByRole('heading', { level: 2 })
        .map((el) => el.textContent)
        .filter((t): t is string => !!t && Object.values(TITLE_FOR_BOARD_SECTION).includes(t))
      expect(headings).toEqual(expectedTitles)

      cleanup()
    })
  }
})

/**
 * U.10 PICTURE-CHECK ROUND 6, ITEM J: DOES THE REPORT ALSO VARY BY SITUATION?
 *
 * docs/modules.md is explicit: "The switchboard is part of B5, the board." (G2's own "What it is"
 * paragraph.) The report is built from one universal shape instead
 * (api/src/modules/reports/what-the-template-says.ts, `THE_TEMPLATE`): the finding first and
 * alone, four states in a row, numbered blocks that hide only when they have nothing to show
 * ("numberedByWhatIsDrawn", not by situation), the long material folded, never a verdict. Nothing
 * in that file, or in the client components that draw a report (SoloReportBody.tsx,
 * TheSessionsReport.tsx, TheReportYouSawAtTheEnd.tsx), reads `scenario` at all - block presence is
 * decided purely by whether the server sent data for it, the same "no heading without content"
 * rule the board itself follows, never by which of the 24 situations this is.
 *
 * SO: the report is not switched by situation today, and G2 does not say it should be - the
 * switchboard is named, defined and scoped to the board alone. This is asserted at the source
 * (rather than only stated in this comment) so it cannot go stale without a test noticing: if
 * either file starts reading `scenario`, that is exactly the moment somebody has begun switching
 * the report by situation, and this test should be revisited rather than left green by accident.
 */
describe('the report is not switched by situation (G2 is board-only)', () => {
  it('G2 itself says so: "The switchboard is part of B5, the board."', () => {
    const modules = readFileSync(join(__dirname, '..', '..', '..', '..', 'docs', 'modules.md'), 'utf8')
    const g2 = modules.slice(modules.indexOf('### G2.'), modules.indexOf('### G3.') > -1 ? modules.indexOf('### G3.') : undefined)
    expect(g2).toContain('The switchboard is part of B5, the board.')
  })

  it('the report template has no per-situation branch', () => {
    const template = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'reports', 'what-the-template-says.ts'),
      'utf8',
    )
    expect(template).not.toMatch(/\bscenario\b/)
  })
})
