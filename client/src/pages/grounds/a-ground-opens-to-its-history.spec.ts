import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A GROUND OPENS TO ITS OWN HISTORY. W8-57.
 *
 * Hafsah's model: a ground is a channel you come back to and keep adding to, and a
 * channel opens to what has been said with the place to type at the bottom.
 *
 * THIS FILE HAS BEEN REWRITTEN ONCE, AND THE REASON MATTERS. The first version
 * pinned the CARD scroll - past sessions as bordered boxes, oldest first, each
 * expanding to its conversation. That was the right behaviour in the wrong shape,
 * and Hafsah retired it: "we have now made the more obsolete which is fine." The
 * conversation itself is the history now.
 *
 * So the behaviour those tests protected did not disappear, it moved, and it is
 * covered where it now lives - `components/gw/GroundChat.spec.tsx` drives the real
 * component and asserts the order, the dividers, the summary and the composer. What
 * is left here is the thing only this page can answer: that the Check-in tab
 * renders the conversation and nothing else, and that the retired card view has not
 * crept back alongside it.
 */
const SRC = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')

describe('the Check-in tab', () => {
  it('renders the conversation', () => {
    expect(SRC).toContain('<GroundChat')
  })

  it('and renders it as the whole tab, not one panel of it', () => {
    // `{tab === 'checkin' && (` with no second condition. A `view === '...'` gate
    // here would mean the conversation is one of several things this tab can show,
    // which is the arrangement that was removed.
    expect(SRC).toMatch(/\{tab === 'checkin' && \(/)
    expect(SRC).not.toContain("tab === 'checkin' && view ===")
  })

  it('opening a session goes through the page, because it can cost money', () => {
    /**
     * `probeSession` POSTs `:id/open` and handles a 403 by offering the free
     * extension, the access code or a subscription. `ChatPage`'s own open handler
     * shows "Could not open session" and stops. So the composer must call back into
     * this page rather than navigate to /checkin/:id itself - otherwise retiring the
     * card view silently removed the paid path.
     */
    expect(SRC).toContain('onOpenSession={() => dueNow && probeSession.mutate(openCheckIn)}')
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
