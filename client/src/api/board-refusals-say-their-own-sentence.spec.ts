import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-005: a suite board refused to a member also fired the check-in-access toast ("That one is not
 * yours to open. If you think it should be, whoever runs this check-in can let you in."), on top of
 * the board's own "Only an admin or a lead can open this board." That sentence is written for being
 * refused a check-in, not a suite board, and made no sense next to the board's own refusal.
 *
 * Every suite board page (LeaveBoardPage, TimeSheetsPage, ReviewsBoardPage, SpendingPage,
 * OnboardingBoardPage, CustomersPage, TodosPage) already renders its own "Only an admin or a lead
 * can open this board." sentence on a 403, so the global toast must be skipped on each board's read.
 */
const src = readFileSync(join(__dirname, 'suites.ts'), 'utf8')

describe('a suite board refusal shows only the board’s own sentence', () => {
  for (const path of [
    "'/suites/onboard/board'",
    "'/suites/leave/board'",
    "'/suites/time/board'",
    "'/suites/reviews/board'",
    "'/suites/spend/board'",
    "'/suites/customers/board'",
    "'/suites/equipment/board'",
    "'/suites/todos/board'",
  ]) {
    it(`${path} skips the check-in-access toast`, () => {
      const line = src.split('\n').find(l => l.includes(`apiClient.get(${path}`)) ?? ''
      expect(line).toContain('skipForbiddenToast: true')
    })
  }
})

/**
 * B-023: Peter, refused a colleague's review ("You cannot open this review."), also read the
 * check-in-access toast on top of it, the same class of defect as B-005 one level down - a single
 * review, not a board.
 */
describe('a single review’s own refusal shows only its own sentence', () => {
  it('GET /suites/reviews/:id skips the check-in-access toast', () => {
    const line = src.split('\n').find(l => l.includes("apiClient.get(`/suites/reviews/${id}`")) ?? ''
    expect(line).toContain('skipForbiddenToast: true')
  })
})

/**
 * B-110 (GW-PRI-04): the board itself - `GET /grounds/:id/board` - had only `skipNotFoundToast`,
 * not `skipForbiddenToast`. BoardPage.tsx already renders the prototype's GroundGone screen for
 * both a 404 and a 403 (the same words, on purpose: a stranger holding a stale link must not be
 * able to tell "never existed" from "exists, not yours" apart). Without this flag, the client's
 * own axios layer raised a second, different message on top of it for a 403 only - "That one is
 * not yours to open... whoever runs this check-in can let you in" - undoing the unification by a
 * different door. Found by forcing a 403 on the board in a real browser (docs/bug-log-screens.md).
 */
describe('the check-in board’s own refusal shows only GroundGone, not the check-in-access toast', () => {
  it('GET /grounds/:id/board skips the check-in-access toast', () => {
    const boardSrc = readFileSync(join(__dirname, 'board.ts'), 'utf8')
    const at = boardSrc.indexOf('`/grounds/${groundId}/board`')
    const nextCloseParen = boardSrc.indexOf('.then((r) => r.data)', at)
    const callSite = boardSrc.slice(at, nextCloseParen)
    expect(callSite).toContain('skipForbiddenToast: true')
  })
})
