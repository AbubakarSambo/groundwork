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
 * The other 23 named sections (Work plan, Deal grid, Forecast, ...) have no served data at all
 * (request 70, docs/requests-to-engine.md) and the board correctly draws nothing for them - this
 * test only checks the 7 that exist.
 *
 * G2's OWN TABLE ORDER IS FIXED, REGARDLESS OF SITUATION. `G2_SECTION_NAMES` lists all 30 in one
 * order; a situation only ever narrows WHICH of them it names (on, optional, or not named at all -
 * off on purpose is the same as "not named" for this test, since neither draws), never reorders
 * them. Restricted to the 7 mapped sections, that fixed order is always: objectives, startingState,
 * divergence, whatTheRoomIsAbout, quickRead, dependencies, patterns - the same order BoardPage.tsx
 * renders them in, unconditionally, gating each one on `switchboardAllows` rather than computing an
 * order per render. This test renders the real page for each of the 24 situations, with a served
 * shape carrying data for every one of the 7 sections, and checks that only the sections this
 * situation names (on or optional) actually appear, in that fixed order, and every other one of the
 * 7 is absent.
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

/** The 7 switchboard-mapped sections, in the fixed order BoardPage.tsx always renders them. */
const MAPPED_ORDER = G2_SECTION_NAMES.filter((n) => G2_SECTION_TO_BOARD_SECTION[n] != null)

/** The Sec title BoardPage.tsx actually renders for each of the 7 mapped board sections. */
const TITLE_FOR_BOARD_SECTION: Record<string, string> = {
  objectives: 'What we are aiming for',
  startingState: 'What was agreed at the start',
  divergence: 'Where people differ',
  whatTheRoomIsAbout: 'What people are after, and where',
  quickRead: 'The quick read',
  dependencies: 'Waiting on',
  patterns: 'What keeps coming up',
}

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

function renderBoardFor(scenario: string) {
  ;(boardApi.get as any).mockResolvedValue(boardFor(scenario))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the switchboard decides the board, for all 24 situations', () => {
  it('covers every situation the switchboard names, so this cannot silently shrink', () => {
    expect(SWITCHBOARD_MATRIX.length).toBe(24)
  })

  for (const row of SWITCHBOARD_MATRIX) {
    it(`${row.situation} (${row.scenario}): shows exactly the switchboard's sections, in order`, async () => {
      const named = new Set([...row.sectionsOn, ...row.optional])
      const expectedG2Names = MAPPED_ORDER.filter((n) => named.has(n) && !row.offOnPurpose.includes(n))
      const expectedTitles = expectedG2Names.map((n) => TITLE_FOR_BOARD_SECTION[G2_SECTION_TO_BOARD_SECTION[n]!])

      renderBoardFor(row.scenario)
      await screen.findByText('Test check-in')

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
