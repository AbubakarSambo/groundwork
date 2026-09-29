import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A GROUND OPENS TO ITS OWN HISTORY. W8-57.
 *
 * Hafsah's model: a check-in is a channel you come back to and keep adding to, and a
 * channel opens to what has been said with the place to type at the bottom.
 *
 * THIS FILE HAS BEEN REWRITTEN TWICE, AND EACH REASON MATTERS.
 *
 * The first version pinned the CARD scroll - past sessions as bordered boxes, oldest first, each
 * expanding to its conversation. That was the right behaviour in the wrong shape, and Hafsah
 * retired it: "we have now made the more obsolete which is fine." The conversation itself became
 * the history, inline on this tab, via `GroundChat`.
 *
 * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB IS THE FOCUSED CONVERSATION, NOT A READING OF THE
 * HISTORY. `GroundChat`'s three jobs (the live conversation, the session history, "who is in
 * this") are untangled: the history moved to My work (`MyCheckInSessions.tsx`), the roster to
 * People and setup (`WhoIsInThis.tsx`), and what is left on THIS tab is only the hand-off to the
 * focused conversation at `/checkin/:id` - through the same paywall-aware `probeSession` as
 * always, now fired by opening the tab rather than by a button inside a history view.
 */
const SRC = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the Check-in tab', () => {
  it('no longer renders GroundChat - that reading experience moved to My work and People and setup', () => {
    expect(SRC).not.toContain('<GroundChat')
  })

  it('and renders as the whole tab, not one panel of it', () => {
    // `{tab === 'checkin' && (` with no second condition. A `view === '...'` gate
    // here would mean the conversation is one of several things this tab can show,
    // which is the arrangement that was removed.
    expect(SRC).toMatch(/\{tab === 'checkin' && \(/)
    expect(SRC).not.toContain("tab === 'checkin' && view ===")
  })

  it('opening a session goes through the paywall-aware probe, because it can cost money', () => {
    /**
     * The probe POSTs `:id/open` and handles a 403 by offering the free extension, the access
     * code or a subscription. `ChatPage`'s own open handler shows "Could not open session" and
     * stops. So opening the tab must call back into the shared opening hook rather than navigate
     * to /checkin/:id directly - otherwise the paid path is silently bypassed.
     *
     * REVIEW ROUND 3, ITEM 2: `probeSession.mutate(` RENAMED `openSession(` (now `useOpenSession`,
     * shared with GroundAdminPage.tsx so the lead's own Check-in tab can open a session the same
     * way, without a trip through this page).
     */
    expect(SRC).toMatch(/if \(tab !== 'checkin'\) return/)
    expect(SRC).toContain('openSession(myOpenForAutoOpen')
  })
})

describe('the retired card view', () => {
  it('is gone, and so is the switch that used to reveal it', () => {
    expect(SRC).not.toContain("view === 'more'")
    expect(SRC).not.toContain('useViewStore')
  })

  it('and its components are not left behind unused', () => {
    // PastSession, SessionConversation and SoloArtifactBlock existed only to render
    // the cards. Dead components in a 900-line page are how the next person
    // concludes there are two ways to do this.
    for (const gone of ['function PastSession', 'function SessionConversation', 'function SoloArtifactBlock']) {
      expect(SRC, `${gone} should have gone with the card view`).not.toContain(gone)
    }
  })
})
