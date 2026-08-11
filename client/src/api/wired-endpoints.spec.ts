import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE ENDPOINTS THAT EXISTED AND WERE NEVER CALLED.
 *
 * An audit of 158 routes and 518 payload fields found a set of features that
 * were fully built on the server and reachable by nothing: the invite link a
 * lead needed when someone said "I never got the email", the download behind
 * "this record is yours, it is portable and permanent", the fairness question
 * that is the only signal telling anyone whether the product works, and a board
 * section that had been in the DELIVERY family's list since the board was built
 * with no data behind it.
 *
 * None of that was broken code. It was finished work nobody could reach, which
 * is a harder failure to notice than a bug: everything passes, and the value
 * simply never arrives.
 *
 * These tests assert the connection exists. They are deliberately about the
 * WIRING rather than the rendering - a UI detail will change, and a test that
 * breaks on styling gets deleted, taking the real assertion with it. What must
 * not silently revert is that something calls each of these.
 */

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

const GROUNDS_API = read('api/grounds.ts')
const CONVERSATION_API = read('api/conversation.ts')
const FEEDBACK_API = read('api/feedback.ts')
const PROMPTS_API = read('api/prompts.ts')
const REPORT_PAGE = read('pages/report/ReportPage.tsx')
const ADMIN_PAGE = read('pages/grounds/GroundAdminPage.tsx')
const BOARD_PAGE = read('pages/board/BoardPage.tsx')
const DASHBOARD = read('pages/admin/AdminDashboardPage.tsx')

describe('the invite link a lead can actually get to', () => {
  it('the endpoint is called', () => {
    expect(GROUNDS_API).toContain('/participants/${participantId}/invite-url')
    expect(GROUNDS_API).toMatch(/getParticipantInviteUrl/)
  })

  it('a surface calls it', () => {
    expect(ADMIN_PAGE).toMatch(/getParticipantInviteUrl/)
    expect(ADMIN_PAGE).toMatch(/Copy invite link/)
  })

  it('is offered for anyone who has not joined, not only bounced invites', () => {
    // "Delivered" only means a mail server accepted it. Gating recovery on a
    // bounce leaves the commonest case - it arrived and they lost it - with no
    // way out.
    expect(ADMIN_PAGE).toMatch(/isInitiator && !p\.userId && \(/)
  })
})

describe('the record the report page promises is portable', () => {
  it('there is a download that sends the auth header', () => {
    // The route returns a file, not JSON, so it cannot go through apiClient -
    // and it still needs the bearer token.
    expect(CONVERSATION_API).toMatch(/download:/)
    expect(CONVERSATION_API).toContain('/download`')
    expect(CONVERSATION_API).toMatch(/Authorization: token \? `Bearer \$\{token\}` : ''/)
  })

  it('releases the blob url rather than holding it for the life of the page', () => {
    expect(CONVERSATION_API).toMatch(/URL\.revokeObjectURL\(url\)/)
  })

  it('the page that makes the promise offers it', () => {
    expect(REPORT_PAGE).toMatch(/conversationApi\.download/)
    expect(REPORT_PAGE).toMatch(/portable and permanent/)
  })

  it('offers it only for sessions that finished', () => {
    // There is nothing settled to take away from a session still in progress.
    expect(REPORT_PAGE).toMatch(/\.filter\(c => c\.completedAt\)/)
  })
})

describe("the caller's own check-in status", () => {
  it('is called, and cannot raise a toast on the normal 403', () => {
    // A ground you can see but are not a party to answers 403 here. That is a
    // state, not an error.
    expect(GROUNDS_API).toContain('/my-checkin-status')
    expect(GROUNDS_API).toMatch(/skipForbiddenToast: true/)
  })

  it('is what supplies the check-in ids the download needs', () => {
    // The shared report does not carry them and should not: this is the only
    // route that hands a person their own ids, resolved from their own user id.
    expect(REPORT_PAGE).toMatch(/getMyCheckinStatus/)
    expect(REPORT_PAGE).toMatch(/myStatus\?\.checkIns/)
  })
})

describe('did this feel fair - the only outcome signal there is', () => {
  it('both verbs are called', () => {
    expect(FEEDBACK_API).toMatch(/outcomeFeedbackApi/)
    expect(FEEDBACK_API).toMatch(/mine:/)
    expect(FEEDBACK_API).toMatch(/submit:/)
    expect(FEEDBACK_API).toContain('/outcome-feedback`')
  })

  it('is asked only once the ground has closed', () => {
    // Asking mid-ground asks someone to rate a conversation they are still in,
    // and implies the process has ended when it has not.
    expect(REPORT_PAGE).toMatch(/if \(!closed\) return null/)
    expect(REPORT_PAGE).toMatch(/status === 'RESOLVED' \|\| \(ground as any\)\.status === 'CLOSED'/)
  })

  it('makes "no" exactly as easy to press as "yes"', () => {
    // THE LOAD-BEARING ONE. If the negative answer is ever made the effortful
    // one - hidden behind a link, an extra step, a required explanation - this
    // collects flattery, and the number stops meaning anything. Both are plain
    // buttons calling the same mutation with a different boolean.
    expect(REPORT_PAGE).toMatch(/onClick=\{\(\) => submit\.mutate\(true\)\}/)
    expect(REPORT_PAGE).toMatch(/onClick=\{\(\) => submit\.mutate\(false\)\}/)
    expect(REPORT_PAGE).toMatch(/It did not/)
    // And the note must not be required to say no.
    expect(REPORT_PAGE).toMatch(/placeholder="Anything you want to add \(optional\)"/)
  })

  it('tells the person their answer is not shown to the other parties', () => {
    expect(REPORT_PAGE).toMatch(/not shown to the other parties/)
  })
})

describe('what was agreed at the start', () => {
  it('the board renders the section it has always listed', () => {
    expect(BOARD_PAGE).toMatch(/has\('startingState'\) && b\.startingState/)
    expect(BOARD_PAGE).toMatch(/What was agreed at the start/)
  })
})

describe('detection accuracy stays internal', () => {
  it('is read on the platform dashboard', () => {
    expect(PROMPTS_API).toMatch(/patternAccuracyApi/)
    expect(PROMPTS_API).toContain("'/patterns/accuracy'")
    expect(DASHBOARD).toMatch(/DetectionAccuracySection/)
  })

  it('sits behind the platform-admin gate that page already enforces', () => {
    // The summary aggregates detections across EVERY org. It is internal
    // engineering data and must never reach a customer surface.
    expect(DASHBOARD).toMatch(/if \(!user\?\.isPlatformAdmin\)/)
    expect(DASHBOARD).toMatch(/Platform admin access required/)
  })

  it('does not present an unrated code as a bad one', () => {
    expect(DASHBOARD).toMatch(/Not rated yet/)
  })
})
