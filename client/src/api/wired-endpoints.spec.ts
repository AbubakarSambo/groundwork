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

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const GROUNDS_API = read('api/grounds.ts')
const CONVERSATION_API = read('api/conversation.ts')
const FEEDBACK_API = read('api/feedback.ts')
const PROMPTS_API = read('api/prompts.ts')
/*
 * MOVED FROM THE DEAD REPORT BODY (1 October 2026). `REPORT_PAGE` used to read `ReportPage.tsx`'s
 * `ReportBody`, which nothing has mounted since the Report tab became a list of sessions - see the
 * comment at the top of `ReportPage.tsx` for where each capability went. The download now lives on
 * `SESSION_REPORT_PAGE` and "did this feel fair" on `OUTCOME_FEEDBACK`.
 */
const SESSION_REPORT_PAGE = read('pages/report/SessionReportPage.tsx')
const OUTCOME_FEEDBACK = read('components/gw/OutcomeFeedback.tsx')
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
    //
    // WALKTHROUGH PASS 2, ITEM 1: NOT FOR SOMEBODY WITH NO SEAT. Their invitation has never gone
    // out, so there is no link yet to copy - `!p.awaitingSeat` was added alongside `!p.userId`.
    expect(ADMIN_PAGE).toMatch(/isInitiator && !p\.userId && !p\.awaitingSeat && \(/)
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
    expect(SESSION_REPORT_PAGE).toMatch(/conversationApi\.download/)
    /*
     * WORDING UPDATED (group 3's review, request batch A, fault 6): "portable and permanent" is
     * work jargon. The page now says the same thing plainly - "This record is yours. You can keep
     * your own copy, and it will always be here for you."
     */
    expect(SESSION_REPORT_PAGE).toMatch(/This record is yours\. You can keep your own copy/)
  })

  it('offers it only for sessions that finished', () => {
    // There is nothing settled to take away from a session still in progress.
    expect(SESSION_REPORT_PAGE).toMatch(/data\?\.finishedAt && \(/)
  })
})

describe("the caller's own check-in status", () => {
  it('is called, and cannot raise a toast on the normal 403', () => {
    // A check-in you can see but are not a party to answers 403 here. That is a
    // state, not an error.
    expect(GROUNDS_API).toContain('/my-checkin-status')
    expect(GROUNDS_API).toMatch(/skipForbiddenToast: true/)
  })

  /*
   * "IS WHAT SUPPLIES THE CHECK-IN IDS THE DOWNLOAD NEEDS" RETIRED, NOT TRANSLATED.
   *
   * `ReportBody` downloaded from a list of ALL of a party's completed sessions, fetched by
   * `getMyCheckinStatus` because the ground-level report carries no check-in ids. The download now
   * lives on `SessionReportPage.tsx`, which already IS one specific session - its `checkInId` comes
   * straight off the route, so there is no roster to look up and this endpoint has no remaining
   * reason to supply it here. The endpoint itself is not orphaned: `ChatPage.tsx`, `TheDonePage.tsx`
   * and `YourNextCheckIn.tsx` all still call it, which is a different capability (your current
   * check-in state) that this file does not track.
   */
})

describe('did this feel fair - the only outcome signal there is', () => {
  it('both verbs are called', () => {
    expect(FEEDBACK_API).toMatch(/outcomeFeedbackApi/)
    expect(FEEDBACK_API).toMatch(/mine:/)
    expect(FEEDBACK_API).toMatch(/submit:/)
    expect(FEEDBACK_API).toContain('/outcome-feedback`')
  })

  it('is asked only once the check-in has closed', () => {
    // Asking mid-ground asks someone to rate a conversation they are still in,
    // and implies the process has ended when it has not.
    expect(BOARD_PAGE).toMatch(/groundEnded && \(/)
    expect(BOARD_PAGE).toMatch(/<OutcomeFeedback groundId=\{id!\} \/>/)
  })

  it('makes "no" exactly as easy to press as "yes"', () => {
    // THE LOAD-BEARING ONE. If the negative answer is ever made the effortful
    // one - hidden behind a link, an extra step, a required explanation - this
    // collects flattery, and the number stops meaning anything. Both are plain
    // buttons calling the same mutation with a different boolean.
    expect(OUTCOME_FEEDBACK).toMatch(/onClick=\{\(\) => submit\.mutate\(true\)\}/)
    expect(OUTCOME_FEEDBACK).toMatch(/onClick=\{\(\) => submit\.mutate\(false\)\}/)
    expect(OUTCOME_FEEDBACK).toMatch(/It did not/)
    // And the note must not be required to say no.
    expect(OUTCOME_FEEDBACK).toMatch(/placeholder="Anything you want to add \(optional\)"/)
  })

  it('tells the person their answer is not shown to the other parties', () => {
    expect(OUTCOME_FEEDBACK).toMatch(/not shown to the other parties/)
  })
})

describe('what was agreed at the start', () => {
  it('the board renders the section it has always listed', () => {
    /**
     * The condition moved into `shown` (W-UX-7: a zone must not render a heading over nothing), so
     * this asserts the section is still WIRED rather than pinning the shape of the expression that
     * wires it. `shown.startingState` is defined as
     * `has('startingState') && allowed('startingState') && !!b.startingState` - U.10 re-review item
     * A added `allowed('startingState') &&`, the switchboard's own per-situation gate on top of the
     * server's per-family `has()` (see what-the-switchboard-allows.ts); this test's own regex is
     * updated to match rather than pinned to the pre-switchboard shape.
     */
    expect(BOARD_PAGE).toMatch(/startingState: has\('startingState'\) && allowed\('startingState'\) && !!b\.startingState/)
    expect(BOARD_PAGE).toMatch(/shown\.startingState && b\.startingState/)
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
