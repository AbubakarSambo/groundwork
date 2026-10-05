import { toast } from 'sonner'
import { mayRenameACheckIn } from '@/lib/who-may-rename-a-check-in'
import { MARKETING_URL } from '@/lib/marketing'
import { railAttention, railRank, stillInRail, openRound } from '@/lib/rail-attention'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { justTheQuestion } from '@/pages/invite/the-link-opens-on-the-question'
import { groundsApi } from '@/api/grounds'
import { todayApi } from '@/api/today'
import { useEntryStore } from '@/stores/entry'
import { useFeedbackStore } from '@/stores/feedback'
import { useHelpStore } from '@/stores/help'
import { useAskStore } from '@/stores/ask'
import { useIsAPhone } from '@/lib/a-phone-is-not-a-narrow-desktop'
import { AskGroundwork } from './AskGroundwork'
import { hasEnded } from '@/lib/a-ground-that-has-ended'
import { Button } from './kit'
import { sidebarWasFolded, rememberSidebarFolded } from './where-the-sidebar-was-left'
import { pinnedFor, togglePin } from './pinned-check-ins'
import { whatTheRowSays } from './what-a-sidebar-row-says'
import { OrganisationChoices } from './OrganisationChoices'
import { initialsOf, roleWord } from './your-organisations'
import { JumpTo } from './JumpTo'
import { whatYouCanJumpTo } from './what-you-can-jump-to'
import { whatTellsItApart } from '@/lib/tell-apart-the-same-name'
import { useJumpStore } from '@/stores/jump'
import { feedbackApi } from '@/api/feedback'
import type { Ground } from '@/types'
import {
  asStyle, keepItOnScreen, rememberIt, theyMeantToMoveIt, whereItLands, whereTheyLeftIt,
  type Resting, type Where,
} from './a-button-that-gets-out-of-the-way'

import { navItemsFor } from './nav-items'
export { navItemsFor } from './nav-items'


/**
 * The organisation's own pages, as opposed to the grounds inside it.
 *
 * /boards is deliberately NOT one. It sits beside People in the rail, but it is a view of the WORK
 * - every check-in's shared picture - not a setting of the organisation. Listing it here would put
 * the company's name as a heading over a lead's two items, one of which is their own settings.
 */
/** Pages that sit under one door in the sidebar, so the door stays lit on them (U.18). */
const ALSO_UNDER: Record<string, string[]> = { '/settings/connections': ['/settings/whatsapp', '/settings/tools'] }
function under(to: string): boolean {
  return (ALSO_UNDER[to] ?? []).some(p => window.location.pathname.startsWith(p))
}

export const ORG_ROUTES = ['/org/members', '/settings/connections', '/settings/whatsapp', '/settings/tools', '/billing', '/settings']

type FbTab = 'reaction' | 'build' | 'wrong'

const REACTION_OPTIONS = ['This clicked', 'I could see myself using this', 'Interesting but I am not sure', 'Not for me']
const BUILD_OPTIONS    = ['Reminder / email nudge', 'Mobile app', 'Slack integration', 'Better reports', 'More templates', 'Team analytics']

function FeedbackWidget() {
  const location = useLocation()
  const isChatPage = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/checkin/') || location.pathname === '/start'
  /**
   * HIDDEN ON "MORE" - that page has "Send feedback" in its own list, and on a phone the floating
   * button sat over the ticked organisation row there - AND ON THE CONVERSATION.
   *
   * REVIEW ROUND 3, ITEM 7: at 375px the trigger (`gw-fb-trigger-chat-mobile-safe`, `bottom:
   * 148px`) sat on the composer - measured then at 691-752 with the trigger at 704-736, on top of
   * Send. That offset assumed the app's own bottom bar (60px) sat below the composer; the
   * conversation no longer shows that bar at all (see AppSidebar's `onConversationPage`), so
   * fixing the number would only be right until the next thing above it changed again. Hidden
   * here instead - a floating trigger is not worth reserving room for on the one screen that is
   * entirely its own composer and nothing else. The panel still opens from "Send feedback" on
   * More, same as it does for every other page this hides it on.
   */
  /*
   * ITEM 4: THE FLOATING BUTTON SAT OVER THE ASK PANEL'S OWN SEND BUTTON. The panel is a fixed
   * drawer along the whole right edge (`.gw-ask-drawer`, AppShell's own render below), 400px wide;
   * this button's own default rest position - bottom:20, right:20 - sits inside that same 400px
   * strip, on top of whatever the drawer draws there. Measured at 1440px wide: a click meant for
   * Send landed on Feedback instead. Hidden outright while the panel is open, the same way it is
   * already hidden on /more and on the check-in's own conversation - a floating trigger is not
   * worth defending a moving 400px-wide target for.
   */
  const askOpen = useAskStore((s) => s.open)
  const hideTrigger = location.pathname === '/more' || location.pathname.startsWith('/checkin/') || askOpen
  const open = useFeedbackStore(s => s.open)
  const showPanel = useFeedbackStore(s => s.show)
  const hidePanel = useFeedbackStore(s => s.hide)
  const [tab, setTab] = useState<FbTab>('reaction')
  const [reaction, setReaction] = useState('')
  const [buildPick, setBuildPick] = useState('')
  const [buildDetail, setBuildDetail] = useState('')
  const [wrongText, setWrongText] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [sent, setSent] = useState(false)

  /*
   * WHERE THE FEEDBACK BUTTON SITS IS THE READER'S CALL, NOT OURS.
   *
   * It has been moved three times to stop it covering something, and each move covered something
   * else, because a fixed corner is a bet that no screen will ever need that corner. The arithmetic
   * - which corner a drop belongs to, and how a position taken on a wide monitor survives a phone -
   * lives in ./a-button-that-gets-out-of-the-way so it can be tested without a browser.
   */
  const [resting, setResting] = useState<Resting | null>(null)
  const [dragging, setDragging] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const justDragged = useRef(false)
  const moved = resting !== null

  const view = () => ({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const stored = localStorage.getItem('gw-feedback-button-position')
    /* Nothing stored means nobody has moved it, and the defaults above - with their mobile-safe
       classes - stay in charge. Only a deliberate move takes this over. */
    if (stored) setResting(whereTheyLeftIt(view()))
    const onResize = () => setResting(r => (r ? keepItOnScreen(r, view()) : r))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function takeHold(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const from: Where = { x: e.clientX, y: e.clientY }
    const box = triggerRef.current?.getBoundingClientRect()
    /* Grab offset, so the button does not jump its own width the moment it starts moving. */
    const grab = { x: from.x - (box?.left ?? from.x), y: from.y - (box?.top ?? from.y) }
    const size = Math.max(box?.width ?? 44, box?.height ?? 44)
    let became = false

    const move = (m: PointerEvent) => {
      const at: Where = { x: m.clientX, y: m.clientY }
      if (!became && !theyMeantToMoveIt(from, at)) return
      if (!became) { became = true; setDragging(true) }
      setResting(whereItLands({ x: at.x - grab.x, y: at.y - grab.y }, view(), size))
    }
    const drop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', drop)
      if (!became) return
      justDragged.current = true
      setDragging(false)
      setResting(r => { if (r) rememberIt(r); return r })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', drop)
  }

  /* A button you can only move with a mouse is a button somebody cannot move. Arrow keys shift it
     while it has focus; Enter and Space still open feedback, because they are not handled here. */
  function nudgeIt(e: React.KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? 40 : 10
    const by: Record<string, [number, number]> = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    }
    const shift = by[e.key]
    if (!shift) return
    e.preventDefault()
    const box = triggerRef.current?.getBoundingClientRect()
    if (!box) return
    const size = Math.max(box.width, box.height)
    const next = whereItLands({ x: box.left + shift[0], y: box.top + shift[1] }, view(), size)
    setResting(next)
    rememberIt(next)
  }

  function valid() {
    if (tab === 'reaction') return !!reaction
    if (tab === 'build')    return !!buildPick
    if (tab === 'wrong')    return wrongText.trim().length > 4
    return false
  }

  /**
   * WHY THE SEND BUTTON IS GREY. W-UX-7.
   *
   * Three different conditions, one per tab, and none of them said so - the button just sat at 38%
   * opacity. The "something went wrong" tab was the worst of them: it wants five characters and a
   * person who typed "bug" was refused in silence, on the form whose whole purpose is telling us
   * when something is wrong.
   *
   * Empty is not "invalid", it is "not started", so nothing is said until they have begun.
   */
  function whyNotValid(): string | null {
    if (valid()) return null
    if (tab === 'reaction') return 'Pick one to send.'
    if (tab === 'build')    return 'Pick what you need built.'
    if (tab === 'wrong')    return wrongText.trim().length === 0 ? null : 'A few more words, so we can find it.'
    return null
  }

  async function submit() {
    /**
     * THE SHAPE THE SERVER ACTUALLY ACCEPTS. W-UX-C.
     *
     * This used to send `tab: 'build'`, no `pill` at all, and the chosen option under `buildPick` -
     * against a DTO that requires `tab` from a fixed set, requires `pill`, and has no idea what
     * `buildPick` is. So every submission was rejected with a 400 and the table has never held a
     * single row. Not one of the widget's option strings appeared in the server's list either: two
     * vocabularies for one field, with no overlap.
     *
     * `pill` is WHAT THEY PICKED and `text` is WHAT THEY WROTE, which is what the DTO has always
     * meant. The contact address goes into `text` rather than being dropped, because somebody who
     * leaves one is asking to be replied to.
     */
    const pill =
      tab === 'reaction' ? reaction
      : tab === 'build'  ? buildPick
      : 'Something went wrong'
    const written = tab === 'build' ? buildDetail : tab === 'wrong' ? wrongText : ''
    const text = [written.trim(), contactEmail.trim() ? `Contact: ${contactEmail.trim()}` : '']
      .filter(Boolean).join('\n\n')
    const payload = {
      tab: tab === 'build' ? 'build_request' : tab === 'wrong' ? 'something_went_wrong' : 'reaction',
      pill,
      text: text || undefined,
    }
    /**
     * "SWALLOW - BEST EFFORT" IS HOW THIS HID FOR MONTHS.
     *
     * FeedbackModule was never registered in the API, so every post here 404'd, and
     * this catch turned each one into a cheerful "thanks, that is on its way". Every
     * piece of feedback anybody ever sent from inside the product went nowhere and
     * nobody saw an error - found this morning by a rule about unwired modules, not
     * by anybody noticing.
     *
     * The endpoint exists now. The swallow does not, because a person who took the
     * trouble to write something is entitled to know it did not arrive - and because
     * the next time this breaks, somebody should find out from a user rather than
     * from a static analysis rule.
     */
    try {
      /**
       * Through `feedbackApi`, not a raw `apiClient.post`. W-UX-C.
       *
       * `feedbackApi.submit` posts to this exact route and was never called - so the one module that
       * describes the shape of a submission was bypassed by the only thing that creates one, and the
       * `list`/`updateStatus` beside it were orphaned in the same stroke. That is how every piece of
       * feedback anybody sent came to be written and never read.
       */
      await feedbackApi.submit(payload)
    } catch {
      toast.error('That did not send. Your note is still here - try again, or email us if it keeps failing.')
      return
    }
    setSent(true)
    setTimeout(() => { hidePanel(); setSent(false); setReaction(''); setBuildPick(''); setBuildDetail(''); setWrongText(''); setContactEmail('') }, 1800)
  }

  const tabLabel = { reaction: 'Reaction', build: 'Build request', wrong: 'Something went wrong' }

  return (
    <>
      {/* Trigger button */}
      {!hideTrigger && (
        <button
          ref={triggerRef}
          onPointerDown={takeHold}
          onKeyDown={nudgeIt}
          title="Drag me anywhere"
          aria-label="Feedback. Drag to move, or use the arrow keys while focused."
          onClick={() => {
            /* A drag ends with a click event the browser fires anyway. Opening feedback every time
               somebody repositions the button is the bug that makes a draggable button unusable. */
            if (justDragged.current) { justDragged.current = false; return }
            open ? hidePanel() : showPanel()
          }}
          // On mobile, the bottom nav bar is a fixed 60px strip - without the extra
          // offset this button's inline `bottom: 20` sits inside that strip and
          // overlaps the nav labels. Scoped to non-chat pages only, since chat
          // pages position this button from `top`, not `bottom`.
          /* A chat page positions this from the top, which is the header's own row — at 375px it
             covered a control there. `gw-fb-trigger-chat-mobile-safe` moves it below the header on
             a narrow screen; the desktop position is unchanged. */
          /*
           * THE MOBILE-SAFE CLASSES SET `bottom` WITH `!important`, WHICH BEATS AN INLINE STYLE.
           *
           * So once somebody has put this button somewhere, the class has to go - otherwise the
           * drag appears to work, the button snaps back on the next render, and it looks broken.
           * Our defaults still get the classes, because those are the positions the classes exist
           * to correct.
           */
          className={
            moved
              ? 'gw-feedback-btn'
              : isChatPage
                ? 'gw-feedback-btn gw-fb-trigger-chat-mobile-safe'
                : 'gw-feedback-btn gw-fb-trigger-mobile-safe'
          }
          style={{
            position: 'fixed',
            ...(moved ? asStyle(resting) : isChatPage ? { top: 12, right: 16 } : { bottom: 20, right: 20 }),
            zIndex: 100,
            touchAction: 'none',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1C3.686 1 1 3.462 1 6.5c0 1.41.56 2.694 1.48 3.662L1.5 13l2.98-1.334A6.2 6.2 0 0 0 7 12c3.314 0 6-2.462 6-5.5S10.314 1 7 1Z" stroke="white" strokeWidth="1.3" fill="none"/>
          </svg>
          Feedback
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) hidePanel() }}
          /*
            IN THE MIDDLE OF THE SCREEN, WHICH IS WHERE IT WAS SUPPOSED TO BE.

            `alignItems: 'flex-end'` with a top-only radius is a phone bottom sheet, and it was
            being drawn that way on every screen - so on a laptop the feedback form arrived as a
            card wedged against the bottom edge, half a screen away from the button that opened it
            and from anything the person was reacting to. Reported twice.

            Centred, with a radius on all four corners and a margin so it never touches the edge. A
            bottom sheet is still the right shape on a phone, where reach matters and there is no
            middle to speak of, so the narrow-screen rule below puts it back.
          */
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          className="gw-fb-overlay"
        >
          <div className="gw-fb-panel" style={{ background: 'white', borderRadius: 12, padding: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 18px 48px rgba(10,22,40,.28)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gw-border)', marginBottom: 16 }}>
              {(['reaction', 'build', 'wrong'] as FbTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                    borderBottom: tab === t ? '2px solid var(--gw-navy)' : '2px solid transparent',
                    fontSize: 11, fontWeight: 600,
                    color: tab === t ? 'var(--gw-text)' : 'rgba(0,0,0,.38)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.3,
                  }}
                >
                  {tabLabel[t]}
                </button>
              ))}
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gw-green-t)', fontWeight: 600, fontSize: 14 }}>
                Thanks - noted ✓
              </div>
            ) : (
              <>
                {tab === 'reaction' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {REACTION_OPTIONS.map(o => (
                        <button
                          key={o}
                          onClick={() => setReaction(o)}
                          style={{
                            padding: '6px 11px', borderRadius: 20, fontSize: 12,
                            border: '1px solid rgba(0,0,0,.14)', background: reaction === o ? 'var(--gw-navy)' : 'none',
                            color: reaction === o ? 'white' : 'rgba(0,0,0,.55)',
                            cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3,
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    <input type="email" placeholder="Email (optional - if you want a reply)" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                {tab === 'build' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {BUILD_OPTIONS.map(o => (
                        <button
                          key={o}
                          onClick={() => setBuildPick(o)}
                          style={{
                            padding: '6px 11px', borderRadius: 20, fontSize: 12,
                            border: '1px solid rgba(0,0,0,.14)', background: buildPick === o ? 'var(--gw-navy)' : 'none',
                            color: buildPick === o ? 'white' : 'rgba(0,0,0,.55)',
                            cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3,
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    <textarea placeholder="Any detail on what you need" value={buildDetail} onChange={e => setBuildDetail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                {tab === 'wrong' && (
                  <>
                    <textarea placeholder="Tell us what happened" value={wrongText} onChange={e => setWrongText(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 100, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                    <input type="email" placeholder="Email (optional - if you want a reply)" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => hidePanel()}
                    style={{ padding: '11px 16px', background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  {whyNotValid() && (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', width: '100%', marginBottom: 6 }}>{whyNotValid()}</div>
                  )}
                  <button onClick={submit} disabled={!valid()}
                    style={{ flex: 1, padding: 11, background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: valid() ? 1 : 0.38 }}>
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * A BADGE ONLY EARNS ITS ROW IF IT CHANGES WHETHER YOU CLICK.
 *
 * The rule above says a ground that is not ACTIVE says so. In practice almost nothing IS
 * ACTIVE while work is happening: a ground sits in AWAITING_PARTIES from its first invite
 * until the last person finishes a round, which is its entire working life. Across a
 * ten-ground org every single row wore "Awaiting parties", including rows where all three
 * parties had already checked in. The one glanceable status was a constant, and a constant
 * carries no information - it just made every ground look like it was stuck.
 *
 * So the badge is now reserved for states that genuinely change the decision: this ground is
 * paused, closed, resolved, stalled, or waiting on somebody to accept before anything can
 * start at all. The ordinary in-progress states stay silent, because "people are checking in"
 * is what a ground on this list is normally doing - and the attention markers beside the name
 * already say the part that is actually yours.
 */
const SILENT_STATUSES = ['ACTIVE', 'AWAITING_PARTIES', 'OPEN']

/**
 * The check-in's own state, in the rail's small badge, and only when it changes whether you click.
 * "Report ready" is good news; paused or waiting for someone to accept needs a look; anything else
 * (closed, resolved, stalled) is said plainly with no colour of judgement on it.
 */
function GroundStatusBadge({ status }: { status: string }) {
  if (SILENT_STATUSES.includes(status)) return null
  const isReady = status === 'REPORT_READY'
  /** Amber for "somebody has to act before this can move", plain for a finished record. */
  const isWaiting = status === 'AWAITING_APPROVAL' || status === 'PAUSED'
  const tone = isReady ? 'proven' : isWaiting ? 'attention' : 'plain'
  /*
   * "STALLED" READ AS THE DATABASE'S WORD FOR IT, NOT THE PROTOTYPE'S (join-outoftime.txt: "Out of
   * time"). It is what happens when a check-in's time runs out, not a judgement on the people in
   * it, and the raw enum, titlecased, said neither - `a-ground-that-has-ended.ts`'s own `howItEnded`
   * already gives this badge's words everywhere else a check-in says how it ended; this is the one
   * place that still built its own label from the enum instead of asking it.
   */
  const label = isReady ? 'Report ready' : status === 'STALLED' ? 'Out of time' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  return <span className={`gw-rail-bdg gw-rail-bdg-${tone}`}>{label}</span>
}

/** A small menu that closes on Escape or a click anywhere outside it. */
function useClosesOnItsOwn(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, close])
  return ref
}

/**
 * THE SIDEBAR, AS THE DESIGN SYSTEM DRAWS IT (A1, layout-computer).
 *
 * Light, on the page's own paper, top to bottom:
 *
 *   the Groundwork mark, and the button that folds the sidebar away
 *   the organisation card: its initials, its name and what you are in it. It opens the
 *     organisation menu, where you switch organisation
 *   "Start a check-in", only for people who may start one
 *   "Check-ins", each with its dot and badge, the ones that need you first, and the closed ones
 *     folded under "Closed (n)"
 *   the pages across check-ins (Boards, for whoever oversees more than one)
 *   the organisation's own pages under its name, for an admin only
 *   you, with "Settings, help, sign out", which opens your own menu
 *
 * WHERE THE OLD RAIL'S DOORS WENT, so nothing anybody could reach before is lost:
 *   All check-ins         the "Check-ins" heading is the link to the whole list
 *   Boards                the pages part, for the same people as before
 *   People, Connect, Billing   the admin part, as the design system names them: People,
 *                         Connections, Plan and billing
 *   Settings              "Your settings", in your own menu
 *   Platform ops          your own menu, for Groundwork staff only
 *
 * The dots and badges come from `railAttention`, which reads only this reader's own check-ins and
 * whether each round is complete. Nothing on a row is about how a person is doing.
 */
export function AppSidebar() {
  /* Folded or open, remembered on this device between visits. See `where-the-sidebar-was-left`. */
  const [collapsed, setCollapsed] = useState(sidebarWasFolded)

  useEffect(() => {
    document.documentElement.style.setProperty('--gw-sidebar-w', collapsed ? '64px' : '256px')
    rememberSidebarFolded(collapsed)
  }, [collapsed])

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const showHelp = useHelpStore(s => s.show)
  const showFeedback = useFeedbackStore(s => s.show)
  const askOpen = useAskStore(s => s.open)
  const toggleAsk = useAskStore(s => s.toggle)

  const [orgOpen, setOrgOpen] = useState(false)
  const [meOpen, setMeOpen] = useState(false)
  const [closedOpen, setClosedOpen] = useState(false)
  /**
   * REVIEW ROUND 3, ITEM 7: NO APP BOTTOM BAR ON THE CONVERSATION, AT 375 WIDE.
   * The prototype's own rule (`body.focus .tabbar{display:none}`, app.css): the check-in's own
   * card is the whole screen once you are inside it, and the app's bottom bar (Today, Check-ins,
   * Start, Chat, More) sat under the composer, on top of it, and behind it - a second navigation
   * fighting the one thing on screen that already has its own way out (Pause). `/checkin/:id` is
   * the one route this whole shell renders as a focused conversation.
   */
  const onConversationPage = /^\/checkin\//.test(useLocation().pathname)
  /* The check-ins this person pinned to the top, in the order they pinned them. See pinned-check-ins. */
  const [pinState, setPinState] = useState(() => ({ of: user?.id, ids: pinnedFor(user?.id) }))
  /* Read again when a different person signs in on this browser, never someone else's. */
  const pins = pinState.of === user?.id ? pinState.ids : pinnedFor(user?.id)
  const flipPin = (groundId: string) => setPinState({ of: user?.id, ids: togglePin(user?.id, groundId, pins) })
  const orgRef = useClosesOnItsOwn(orgOpen, () => setOrgOpen(false))
  const meRef = useClosesOnItsOwn(meOpen, () => setMeOpen(false))

  const { data: grounds = [], isSuccess: listLoaded, isError: listFailed } = useQuery<Ground[]>({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    staleTime: 30_000,
    enabled: isAuthenticated,
  })

  /* Today's count beside "Today": the same read as the page, so the two cannot disagree. */
  const { data: today } = useQuery({ queryKey: ['today'], queryFn: todayApi.get, staleTime: 30_000, enabled: isAuthenticated, retry: false })
  const todayCount = today?.count ?? 0

  const location = useLocation()
  /*
   * GROUP 3 REVIEW, BATCH B: unreachable again, deliberately this time. `AppShell`'s own
   * `showSidebar` no longer mounts this component at all for a signed-out reader on /start
   * (start.jpg draws no rail there), so this branch below never runs while signed out. Left in
   * place, not deleted: `isEntryPage` still matches a signed-out `/start` by its own definition,
   * and deleting the branch would be a second, separate change to make in the same file as the
   * one this review actually asked for (AppShell's `showSidebar`).
   */
  const isEntryPage = !isAuthenticated && location.pathname === '/start'
  const { groundName, setGroundName } = useEntryStore()
  const [renamingEntry, setRenamingEntry] = useState(false)
  const [entryRenameVal, setEntryRenameVal] = useState('')
  const entryRenameRef = useRef<HTMLInputElement>(null)

  const fullName = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email ?? ''
  const initials = user ? (((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')) || user.email?.[0] || 'U').toUpperCase() : 'U'
  /*
   * NEVER A NAME THAT ISN'T THE ORGANISATION'S OWN (U.8 review, Hafsah's instruction of 27
   * September). "Your organisation" read as if it were the name, on a placeholder profile a join
   * link can leave standing (see JoinConfirmPage.tsx).
   * `organizationName` is sent by every real profile read (theUserShape), so its absence means the
   * real one has not arrived yet, never that there is none - and showing nothing is honest where
   * showing a made-up name is not. `roleWord` reads the same signal: the placeholder's role is
   * indistinguishable from a genuine MEMBER, but the organisation's name always arrives with it.
   */
  const orgName = user?.organizationName ?? ''

  function startRename(g: Ground) {
    setRenamingId(g.id)
    setRenameValue(g.label)
    setTimeout(() => renameRef.current?.select(), 50)
  }

  async function commitRename(id: string) {
    const val = renameValue.trim()
    setRenamingId(null)
    if (!val) return
    try {
      await groundsApi.update(id, { label: val }, { quiet: true })
      qc.invalidateQueries({ queryKey: ['grounds'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'The name did not change. Nothing else was altered - try again.')
    }
  }

  /* The rename pencil appears only for whoever the server lets rename: the lead, or an admin. Anybody
     else offers something that will be refused. The rule is shared with the server's, in
     `who-may-rename-a-check-in`, so the two cannot drift apart again. */
  const mayRename = (g: Ground) => mayRenameACheckIn(g, user)

  const needsYou = grounds
    .map((g: any) => ({ g, attention: railAttention(g as any, user?.id) }))
    .filter(({ attention }) => attention.kind === 'overdue' || attention.kind === 'yours')
    .sort((a, b) => railRank(a.attention) - railRank(b.attention))
    .slice(0, 8)

  /* A closed check-in stays in the rail for about three months, folded away under "Closed (n)" so the
     ones that are still running are the list. */
  const isClosed = (g: any) => hasEnded(g.status) || !!g.closedAt || !!g.resolvedAt
  const inRail = grounds.filter(g => stillInRail(g as any))
  const running = inRail
    .filter(g => !isClosed(g))
    .slice()
    .sort((a, b) => railRank(railAttention(a as any, user?.id)) - railRank(railAttention(b as any, user?.id)))
  const closed = inRail.filter(g => isClosed(g))
  /* Pinned ones sit above the rest under "Pinned", newest pin first; the rest keep their order. A closed
     check-in is not offered a pin: it lives under "Closed". */
  const pinned = pins.map(id => running.find(g => g.id === id)).filter((g): g is Ground => !!g)
  const unpinned = running.filter(g => !pins.includes(g.id))

  /* ONE GATE. Every door below comes out of `navItemsFor`, and is only sorted into its part here. */
  const items = navItemsFor(user)
  const pages = items.filter(i => !(i as any).adminOnly && !(i as any).platformAdminOnly && i.to !== '/grounds' && i.to !== '/settings')
  const adminItems = items.filter(i => (i as any).adminOnly)
  const staffItems = items.filter(i => (i as any).platformAdminOnly)
  /* "Jump to" offers only what this reader already sees: these check-ins and these doors. */
  const jumpItems = whatYouCanJumpTo(grounds as any, user?.id, items)
  const openJump = useJumpStore(s => s.show)

  const sidebarWidth = collapsed ? 64 : 256

  function rowFor(g: Ground) {
    const attention = railAttention(g as any, user?.id)
    /* Walkthrough pass 2, item 1: more than one check-in on this rail can share a label ("Help a
       new hire get started, from 27 September" listed three times), with nothing to tell a reader
       which row is which. When that happens, the one thing the list already carries for each one -
       when it started - is said after the name; a label that is already unique is left alone. */
    const apart = whatTellsItApart(inRail, g)
    const nameRead = apart ? `${g.label}, ${apart}` : g.label
    const planned = plannedSessionsFor(g.timelineDays, (g as any).cadence, (g as any).maxSessions ?? (g as any).totalSessions)
    const mine = attention.kind === 'yours' || attention.kind === 'overdue'
    /* The room the row's buttons need when they show over its right, and whether the row must keep it
       (a badge is wider than the buttons and hides while they show, so a row with one already has it). */
    const actsWidth = 32 * ((isClosed(g) ? 0 : 1) + (mayRename(g) ? 1 : 0))
    const hasBadge = mine || !SILENT_STATUSES.includes(g.status)
    const keepsRoom = actsWidth > 0 && !hasBadge
    const dot = attention.kind === 'overdue' ? 'late' : attention.kind === 'yours' ? 'turn' : 'quiet'
    const why = attention.kind === 'overdue'
      ? `Session ${attention.sessionNumber} is ${attention.daysLate} days past its date`
      : attention.kind === 'yours'
        ? `Session ${attention.sessionNumber} is ready for you`
        : null
    /* The whole row in sentences, for the pointer and for a screen reader. See what-a-sidebar-row-says. */
    const says = whatTheRowSays({
      label: nameRead,
      attention,
      round: openRound((g as any).checkIns),
      planned,
      roundsDone: (g as any).roundsDone,
      alignment: (g as any).alignment,
      closed: isClosed(g),
    })
    return (
      <li key={g.id}>
        {renamingId === g.id ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={() => commitRename(g.id)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(g.id); if (e.key === 'Escape') setRenamingId(null) }}
            aria-label={`New name for ${g.label}`}
            className="gw-rl-rename-input"
          />
        ) : (
          <div className="gw-rail-row">
            <NavLink
              to={`/grounds/${g.id}`}
              className={({ isActive }) => `gw-ci-row${isActive ? ' on' : ''}${isClosed(g) ? ' closed' : ''}${keepsRoom ? ' keeps-room' : ''}`}
              style={keepsRoom ? { ['--gw-acts-w' as string]: `${actsWidth}px` } : undefined}
              title={says}
              aria-label={says}
            >
              <span className={`gw-ci-dot gw-ci-dot-${dot}`} aria-hidden />
              <span className="gw-ci-nm">{nameRead}</span>
              {mine && <span className={`gw-rail-bdg gw-rail-bdg-${attention.kind === 'overdue' ? 'late' : 'turn'}`} title={why ?? undefined}>Your turn</span>}
              {/* One badge a row: your turn comes first, and the check-in's own state only otherwise. */}
              {!SILENT_STATUSES.includes(g.status) && !mine && <GroundStatusBadge status={g.status} />}
            </NavLink>
            {/* The row's two buttons take no width until the row is pointed at or focused, so the name
                keeps its room and breaks only between words. On a touch screen they sit in the row. */}
            {(!isClosed(g) || mayRename(g)) && <span className="gw-row-acts">
            {!isClosed(g) && <button
              type="button"
              className={`gw-pin${pins.includes(g.id) ? ' on' : ''}`}
              onClick={e => { e.preventDefault(); e.stopPropagation(); flipPin(g.id) }}
              aria-pressed={pins.includes(g.id)}
              aria-label={pins.includes(g.id) ? `Unpin ${g.label}` : `Pin ${g.label} to the top`}
              title={pins.includes(g.id) ? 'Unpin it' : 'Pin it to the top'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <path d="M6 1.5h4l-.6 4.2 2.6 2.3v1.5H4V8l2.6-2.3L6 1.5zM8 9.5v5" fill={pins.includes(g.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </button>}
            {mayRename(g) && <button
              type="button"
              className="gw-rename"
              onClick={e => { e.preventDefault(); e.stopPropagation(); startRename(g) }}
              title={`Rename ${g.label}`}
              aria-label={`Rename ${g.label}`}
            >✎</button>}
            </span>}
          </div>
        )}
      </li>
    )
  }

  return (
    <>
      <aside
        className="gw-sidebar-desktop gw-rl"
        aria-label="Groundwork"
        style={{
          position: 'fixed', top: 0, left: 0, width: sidebarWidth, height: '100vh',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          transition: 'width .2s ease', overflow: 'hidden',
        }}
      >
        {/* The mark, which always goes back to the marketing site, and the fold button. */}
        <div className={`gw-rl-top${collapsed ? ' folded' : ''}`}>
          {!collapsed ? (
            <a href={MARKETING_URL} className="gw-rl-brand">
              <GroundworkBars />
              <span>Groundwork</span>
            </a>
          ) : (
            <a href={MARKETING_URL} className="gw-rl-brand" title="Groundwork" aria-label="Groundwork">
              <GroundworkBars />
            </a>
          )}
          {/* Ask Groundwork (D1): the speech bubble beside the mark opens the panel beside the page. */}
          {isAuthenticated && (
            <button
              type="button"
              className="gw-rl-ic gw-ask-open"
              onClick={toggleAsk}
              title="Ask Groundwork"
              aria-label="Ask Groundwork"
              aria-expanded={askOpen}
              style={collapsed ? undefined : { marginLeft: 'auto' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M10 3.2c-3.9 0-7 2.6-7 5.9 0 1.7.8 3.2 2.2 4.3L4.6 16.8l3.6-1.9c.6.1 1.2.2 1.8.2 3.9 0 7-2.6 7-5.9S13.9 3.2 10 3.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            className="gw-tap44"
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Open the sidebar' : 'Fold the sidebar away'}
            aria-label={collapsed ? 'Open the sidebar' : 'Fold the sidebar away'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* The organisation card, and the organisation menu it opens. */}
        {isAuthenticated && (
          <div ref={orgRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              className="gw-rl-org"
              onClick={() => { setOrgOpen(v => !v); setMeOpen(false) }}
              aria-haspopup="true"
              aria-expanded={orgOpen}
              title={orgName}
            >
              <span className="gw-rl-sq" aria-hidden>{initialsOf(orgName)}</span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b className="gw-rl-org-name">{orgName}</b>
                    {orgName && <span className="gw-rl-org-role">{roleWord(user?.role)}</span>}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ flex: 'none', color: 'var(--gw-sub)' }}>
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
              {collapsed && orgName && <span className="gw-sr-only">{orgName}, {roleWord(user?.role)}</span>}
            </button>
            {orgOpen && (
              <div className="gw-rl-menu gw-rl-menu-org" style={{ left: collapsed ? 70 : 10 }}>
                <div className="gw-rl-menu-h">Organisations</div>
                <OrganisationChoices />
              </div>
            )}
          </div>
        )}

        {/* Start a check-in. Offered only to somebody the server will let start one. */}
        <div className="gw-rl-start">
          {/* `!== false`, not `=== true`: an older session that does not carry the answer still sees it. */}
          {user?.mayOpenCheckIns !== false && <Button wide onClick={() => navigate('/start?new=1')} aria-label={collapsed ? 'Start a check-in' : undefined}>
            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            {!collapsed && <span>Start a check-in</span>}
          </Button>}
        </div>

        {/* "Jump to…  Ctrl K": find a check-in, a person or a page. */}
        {isAuthenticated && (
          <button type="button" className="gw-rl-jump" onClick={openJump} aria-label={collapsed ? 'Jump to' : undefined} title={collapsed ? 'Jump to' : undefined} aria-keyshortcuts="Control+K Meta+K">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            {!collapsed && <><span>Jump to…</span><kbd>Ctrl K</kbd></>}
          </button>
        )}

        {/* Expanded: the check-ins, the pages across them, and the admin part. */}
        {!collapsed && (
          <nav className="gw-rl-scroll" aria-label="Check-ins and pages">
            {isEntryPage && (
              <div className="gw-rl-entry">
                {renamingEntry ? (
                  <input
                    ref={entryRenameRef}
                    value={entryRenameVal}
                    onChange={e => setEntryRenameVal(e.target.value)}
                    onBlur={() => { setGroundName(entryRenameVal.trim() || groundName); setRenamingEntry(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setGroundName(entryRenameVal.trim() || groundName); setRenamingEntry(false) }
                      if (e.key === 'Escape') setRenamingEntry(false)
                    }}
                    autoFocus
                    aria-label="New name for this check-in"
                    className="gw-rl-rename-input"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <b style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{groundName}</b>
                    <button
                      type="button"
                      onClick={() => { setEntryRenameVal(groundName); setRenamingEntry(true); setTimeout(() => entryRenameRef.current?.select(), 40) }}
                      className="gw-rl-ic"
                      title="Rename"
                      aria-label={`Rename ${groundName}`}
                    >✎</button>
                  </div>
                )}
                <div className="gw-rl-org-role">Not saved yet.</div>
              </div>
            )}

            {isAuthenticated && (
              <>
                {/* "Check-ins": the heading is the way to the whole list. */}
                {pinned.length > 0 && (
                  <>
                    <div className="gw-rl-h"><span>Pinned</span></div>
                    <ul className="gw-rl-list" aria-label="Pinned">{pinned.map(rowFor)}</ul>
                  </>
                )}
                <div className="gw-rl-h">
                  <NavLink to="/grounds" className="gw-rl-h-link" title="See all your check-ins">Check-ins</NavLink>
                </div>
                {/* "Nothing in progress yet" only once the list has arrived and really is empty. While it
                    is on its way the sidebar says nothing, rather than telling somebody with check-ins
                    that they have none. */}
                {listLoaded && running.length === 0 && closed.length === 0 && (
                  <p className="gw-rl-empty">Nothing in progress yet.</p>
                )}
                {listFailed && !listLoaded && (
                  <p className="gw-rl-empty" role="alert">Your check-ins did not load. Reload the page to try again.</p>
                )}
                {/* The heading stays, because it is the way to the whole list, and says why it is empty. */}
                {unpinned.length === 0 && pinned.length > 0 && (
                  <p className="gw-rl-empty">{running.length === 1 ? 'Your only check-in is pinned above.' : 'All your check-ins are pinned above.'}</p>
                )}
                <ul className="gw-rl-list">{unpinned.map(rowFor)}</ul>
                {closed.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="gw-rl-fold"
                      aria-expanded={closedOpen}
                      onClick={() => setClosedOpen(v => !v)}
                    >
                      <span aria-hidden>{closedOpen ? '▾' : '▸'}</span> Closed ({closed.length})
                    </button>
                    {closedOpen && <ul className="gw-rl-list">{closed.map(rowFor)}</ul>}
                  </>
                )}

                {pages.length > 0 && (
                  <ul className="gw-rl-list gw-rl-pages">
                    {pages.map(item => (
                      <li key={item.to}>
                        <NavLink to={item.to} className={({ isActive }) => `gw-rl-nav${isActive ? ' on' : ''}`}>
                          {item.icon(location.pathname.startsWith(item.to))}
                          <span>{item.label}</span>
                          {/* How many things need you, from the server's one read. Nothing when none. */}
                          {item.to === '/today' && todayCount > 0 && (
                            <span className="gw-rl-count">
                              <span aria-hidden>{todayCount}</span>
                              <span className="gw-sr-only">{todayCount === 1 ? '1 thing needs you' : `${todayCount} things need you`}</span>
                            </span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}

                {/* The organisation's own pages, under its name. Admins only, because every page
                    behind them is admin-only on the server too. */}
                {adminItems.length > 0 && (
                  <>
                    <div className="gw-rl-h"><span>{orgName}</span></div>
                    <ul className="gw-rl-list">
                      {adminItems.map(item => (
                        <li key={item.to}>
                          <NavLink to={item.to} className={({ isActive }) => `gw-rl-nav${isActive || under(item.to) ? ' on' : ''}`}>
                            {item.icon(location.pathname.startsWith(item.to) || under(item.to))}
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </nav>
        )}

        {/* Folded: the doors as icons, and the check-ins that need you as their first letter. */}
        {collapsed && (
          <nav className="gw-rl-scroll folded" aria-label="Check-ins and pages">
            {/* Same gate as everywhere else: navItemsFor, never a filter of its own. */}
            {navItemsFor(user).map(item => {
              const active = window.location.pathname.startsWith(item.to)
              return (
                <NavLink key={item.to} to={item.to} title={item.label} aria-label={item.label}
                  className={`gw-rl-nav icon${active ? ' on' : ''}`}
                >
                  {item.icon(active)}
                </NavLink>
              )
            })}

            {/*
              AND THE CHECK-INS THAT NEED YOU, WHICH FOLDING USED TO THROW AWAY.
              The first letter, coloured by whether it is yours to answer and how late it is, with the
              name and the reason on the tooltip. Only the ones that need somebody.
            */}
            {needsYou.length > 0 && (
              <div className="gw-rl-needs">
                {needsYou.map(({ g, attention }) => (
                  <NavLink
                    key={g.id}
                    to={`/grounds/${g.id}`}
                    title={attention.kind === 'overdue'
                      ? `${g.label}. Session ${attention.sessionNumber} is ${attention.daysLate} days past its date`
                      : attention.kind === 'yours'
                        ? `${g.label}. Session ${attention.sessionNumber} is ready for you`
                        : g.label}
                    aria-label={g.label}
                    className={`gw-rl-ini ${attention.kind === 'overdue' ? 'late' : 'turn'}`}
                  >
                    {(g.label ?? '?').trim().charAt(0).toUpperCase()}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        )}

        {/* You: "Settings, help, sign out", and the menu it opens. */}
        <div ref={meRef} className="gw-rl-foot" style={{ position: 'relative' }}>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="gw-rl-me"
                onClick={() => { setMeOpen(v => !v); setOrgOpen(false) }}
                aria-haspopup="true"
                aria-expanded={meOpen}
                title={collapsed ? `${fullName}. Settings, help, sign out` : undefined}
              >
                <span className="gw-rl-av" aria-hidden>{initials}</span>
                {!collapsed && (
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b className="gw-rl-org-name">{fullName}</b>
                    <span className="gw-rl-org-role">Settings, help, sign out</span>
                  </span>
                )}
                {collapsed && <span className="gw-sr-only">{fullName}. Settings, help, sign out</span>}
              </button>
              {meOpen && (
                <div className="gw-rl-menu gw-rl-menu-me" style={{ left: collapsed ? 70 : 10 }}>
                  <NavLink to="/settings" className="gw-rl-menu-item" onClick={() => setMeOpen(false)}>Your settings</NavLink>
                  <button type="button" className="gw-rl-menu-item" onClick={() => { setMeOpen(false); showHelp(0) }}>Help</button>
                  <NavLink to="/talk-to-us" className="gw-rl-menu-item" onClick={() => setMeOpen(false)}>Talk to us</NavLink>
                  <button type="button" className="gw-rl-menu-item" onClick={() => { setMeOpen(false); showFeedback() }}>Send feedback</button>
                  {/* Groundwork's own back office. Staff only, as the route itself is. */}
                  {staffItems.map(item => (
                    <NavLink key={item.to} to={item.to} className="gw-rl-menu-item" onClick={() => setMeOpen(false)}>{item.label}</NavLink>
                  ))}
                  <hr />
                  <button
                    type="button"
                    className="gw-rl-menu-item"
                    onClick={() => navigate('/signout', { replace: true })}
                    title="Sign out of Groundwork on this device"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            !collapsed && (
              <Button kind="secondary" wide onClick={() => navigate('/auth')}>Sign in</Button>
            )
          )}
        </div>
      </aside>

      {isAuthenticated && <JumpTo items={jumpItems} />}

      {/*
        THE BOTTOM BAR ON A PHONE (A1, layout-phone): Today, Check-ins, Start, Chat, More in the
        prototype. Chat is Ask Groundwork's own page (D1, #/chat).
        Everything else a phone used to show in this bar is on "More", through the same gate.

        REVIEW ROUND 3, ITEM 7: NOT ON THE CONVERSATION. The prototype's own rule
        (`body.focus .tabbar{display:none}`, app.css): a check-in's own card is the whole screen
        once you are inside it, and this bar sat under the composer, on top of it, and behind it -
        a second navigation fighting the one thing on screen that already has its own way out
        (Pause).
      */}
      {!onConversationPage && (
      <nav
        aria-label="Main"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
          background: 'var(--gw-card)', borderTop: '1px solid var(--gw-border)',
          display: 'flex', alignItems: 'center', zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="gw-sidebar-mobile"
      >
        {isAuthenticated ? (
          <>
            <NavLink to="/today" className={({ isActive }) => `gw-phone-bar-item${isActive ? ' on' : ''}`}>
              <PhoneIcon d="today" />Today
            </NavLink>
            <NavLink to="/grounds" className={({ isActive }) => `gw-phone-bar-item${isActive ? ' on' : ''}`}>
              <PhoneIcon d="checkins" />Check-ins
            </NavLink>
            {/* Somebody who may not start a check-in has Company in its place, as ask-on-a-phone.txt shows. */}
            {user?.mayOpenCheckIns !== false ? (
              <NavLink to="/start?new=1" className="gw-phone-bar-item start">
                <PhoneIcon d="start" />Start
              </NavLink>
            ) : user?.role !== 'GUEST' ? (
              <NavLink to="/company" className={({ isActive }) => `gw-phone-bar-item${isActive ? ' on' : ''}`}>
                <PhoneIcon d="company" />Company
              </NavLink>
            ) : null}
            <NavLink to="/chat" className={({ isActive }) => `gw-phone-bar-item${isActive ? ' on' : ''}`}>
              <PhoneIcon d="chat" />Chat
            </NavLink>
            <NavLink to="/more" className={({ isActive }) => `gw-phone-bar-item${isActive ? ' on' : ''}`}>
              <PhoneIcon d="more" />More
            </NavLink>
          </>
        ) : (
          <NavLink to="/auth" className="gw-phone-bar-item">Sign in</NavLink>
        )}
      </nav>
      )}
    </>
  )
}

/** The bottom bar's icons, drawn in the text colour. */
function PhoneIcon({ d }: { d: 'today' | 'checkins' | 'start' | 'company' | 'chat' | 'more' }) {
  if (d === 'today') {
    return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 8.5h16M7.5 2.5v3M14.5 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  }
  if (d === 'start') {
    return <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><path d="M13 5v16M5 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  }
  if (d === 'company') {
    return <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M3 17.5V8l7-4.5L17 8v9.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M2 17.5h16M8 17.5v-5h4v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  }
  if (d === 'chat') {
    return <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M10 3.2c-3.9 0-7 2.6-7 5.9 0 1.7.8 3.2 2.2 4.3L4.6 16.8l3.6-1.9c.6.1 1.2.2 1.8.2 3.9 0 7-2.6 7-5.9S13.9 3.2 10 3.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
  }
  if (d === 'more') {
    return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><circle cx="5" cy="11" r="1.8" fill="currentColor" /><circle cx="11" cy="11" r="1.8" fill="currentColor" /><circle cx="17" cy="11" r="1.8" fill="currentColor" /></svg>
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M3.5 6h10M3.5 11h10M3.5 16h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 14.5l1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The Groundwork mark: three bars widening downward, in navy. */
function GroundworkBars() {
  return (
    <svg width="22" height="17" viewBox="0 0 22 17" aria-hidden>
      <rect x="5" y="0" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="2" y="6" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="0" y="12" width="22" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  /**
   * THE ROUTER'S LOCATION, NOT THE BROWSER'S. This is why the menu was never there.
   *
   * Every other component in this file calls `useLocation()`. This one used a bare `location`,
   * which resolves to the DOM global - so the pathname was right but nothing subscribed AppShell to
   * route changes, and it did not re-render when the route changed.
   *
   * What that does in practice: you land on /auth, which is deliberately bare, so the shell renders
   * with no rail. You sign in. React Router changes the route without a page load, AppShell is
   * never told, and it keeps rendering the decision it made on /auth. The rail is missing on every
   * page from then on, at every width, until a hard refresh - which is exactly what was reported
   * three times and answered three times with the wrong thing.
   *
   * It survived because every previous test of this read the source rather than mounting it, and
   * the source is correct. Only a mount could tell.
   */
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const askOpen = useAskStore(s => s.open)
  const hideAsk = useAskStore(s => s.hide)
  /* U.10 item 8: a question typed in the board's own Ask bar, handed to the panel once it opens. */
  const pendingAskMessage = useAskStore(s => s.pendingMessage)
  const isAPhone = useIsAPhone()
  /**
   * PHONE CHECK, ITEM 1: "ASK" DID NOTHING ON A PHONE.
   *
   * The side drawer (`.gw-ask-drawer`) is hidden outright below 641px (next style block), because
   * on a phone Ask Groundwork is its own page - #/chat, already built (AskPage.tsx) and already in
   * the bottom bar. But every button that opens the panel (the header's "Ask", the board's Ask bar,
   * the Company page's "Ask about...") only ever set `askOpen` true in the store; on a phone that
   * state had nowhere to render, so the button did nothing and a typed question (`pendingMessage`)
   * was silently dropped.
   *
   * Routing here, once, is cheaper than teaching every caller about phone width: whenever the store
   * opens on a phone, send the person to the real page instead and clear the drawer's own flag.
   * `pendingAskMessage` stays in the store - AskPage reads and consumes it itself, the same way the
   * drawer already does below.
   */
  useEffect(() => {
    if (isAPhone && askOpen) {
      hideAsk()
      if (location.pathname !== '/chat') navigate('/chat')
    }
  }, [isAPhone, askOpen, hideAsk, navigate, location.pathname])
  /* REVIEW ROUND 3, ITEM 7: SEE AppSidebar's OWN COPY OF THIS - the app's bottom bar does not
     render at all on the conversation, and the room it used to reserve (`--gw-bottom-nav`) is
     given back to the card so nothing leaves a blank strip where the bar used to sit. */
  const onConversationPage = /^\/checkin\//.test(location.pathname)
  const consumePendingAskMessage = useAskStore(s => s.consumePendingMessage)
  /**
   * Signed-out visitors do not get the signed-in navigation.
   *
   * `/start` was excepted so the entry flow had some chrome, but the effect was
   * that someone with no account saw Grounds / Profile while describing
   * their situation - destinations that mean nothing to them and lead out of the
   * flow they are halfway through. The entry page has its own header and step
   * tracker, so it loses nothing by dropping the app shell. GW-004.
   */
  /**
   * PAGES THAT DRAW THEIR OWN WHOLE SCREEN. W8-68.
   *
   * Her words: "i can see the pages look a mess now, side menu has vanished etc."
   *
   * `showSidebar` was `isAuthenticated` and nothing else, so a signed-in person opening
   * any of these got the app rail AND the page's own full-page chrome: its own dark
   * Groundwork header under the rail's, its own `minHeight: 100vh` pushing everything
   * down, a sign-in form sitting next to a list of grounds. Two products in one window.
   *
   * These are the pages somebody arrives at from outside - an email link, the marketing
   * site, a password reset - and every one of them is written as a standalone screen
   * with its own header and its own way back. Being signed in does not change what they
   * are. It is also normal to be signed in while opening one: setting a password on a
   * second device, following an invite to a different ground, switching account.
   *
   * Matched on exact paths rather than a prefix, so a future `/authorised-something`
   * cannot silently lose the rail.
   */
  /*
   * AND THE ONE THAT IS MARKED ON THE ADDRESS RATHER THAN BY PATH. A team update's link opens the
   * conversation bare: no rail, no sidebar, one card. See the-link-opens-on-the-question.
   */
  const bare = justTheQuestion(location.search)

  const CHROMELESS = [
    '/auth', '/auth/sent', '/auth/google/callback', '/google-failed', '/signout',
    '/set-password', '/reset-password', '/verify-email',
    '/invite', '/join', '/answer', '/login', '/org/setup', '/org-new', '/orgs', '/join/waiting', '/welcome',
  ]

  /**
   * THERE IS NO RAIL ON /start FOR SOMEBODY WITHOUT AN ACCOUNT YET.
   *
   * GROUP 3 REVIEW, BATCH B (1 October): start.jpg, the prototype's own signed-out #/start, draws
   * no sidebar at all - just the mark, the one question, and (on the account-card screens beside
   * it) a plain way to sign in. A previous round restored a rail here (`isEntryFlow`, below,
   * OR'd into `showSidebar`) on the strength of a different memory - a signed-out window that once
   * showed an "entry ground" rail (name, renameable, session count, a navy "+ Start a check-in",
   * "Not saved yet", "Sign in") - but that rail is not what the prototype draws, and it is also
   * where w375-out-_start.png found the floating Feedback button covering "See every situation".
   *
   * The rail stays for an AUTHENTICATED reader on /start (building a second or further check-in),
   * since `isAuthenticated` alone already covers that case. Only the signed-out exception is
   * removed. `EntryChatPage.tsx` keeps a way to sign in on its own, with the shared `Mark` and a
   * plain "Sign in" link, so a stranger on /start is not left with no way back to an account -
   * see `the-door-has-no-rail-when-signed-out.spec.ts`.
   */
  /**
   * TWO PRODUCTS ON ONE SCREEN. W-UX-8.
   *
   * `/admin` and `/admin/dashboard` are the Groundwork platform back office - our own operations
   * console, for us, about every customer org. They were rendering INSIDE the customer rail, so the
   * internal page sat wrapped in a nav offering "Check-ins", "People" and "Billing" for one
   * particular organisation. The audit's line: "The customer menu wraps around your internal page."
   *
   * A PREFIX, not an exact path, because the back office has sub-pages and `CHROMELESS` matches the
   * whole pathname - which is why `/admin/dashboard` would have slipped through a literal.
   *
   * Only platform staff can reach these at all (`RequirePlatformAdmin`), so nothing a customer sees
   * changes. It is last on the list for exactly that reason.
   */
  /**
   * `/ops` joins `/admin` here. It is the team's own back office, and rendering
   * it inside the customer's rail would put "New check-in" next to the funding
   * pipeline — two different companies' navigation on one screen.
   */
  const CHROMELESS_PREFIXES = ['/admin', '/ops']
  const isBackOffice = CHROMELESS_PREFIXES.some(
    p => location.pathname === p || location.pathname.startsWith(`${p}/`),
  )
  /* The pages a link in an email opens, with a token in the address (U.3). They are a card of their
     own, as the prototype draws them, whoever happens to be signed in on this browser. */
  const fromAnEmail = ['/stop-reminders/', '/unsubscribe/', '/j/'].some(p => location.pathname.startsWith(p))
  const showSidebar =
    isAuthenticated && !CHROMELESS.includes(location.pathname) && !isBackOffice && !bare && !fromAnEmail

  if (!showSidebar) return <main id="main">{children}</main>

  return (
    <>
      {/*
        * A WAY PAST THE RAIL, AND SOMETHING TO SKIP TO.
        *
        * There was no <main> on any page and no skip link anywhere, and the rail is the first thing
        * in the tab order on every screen: at ten check-ins that is twenty-odd stops before the
        * content, every single navigation, for anybody using a keyboard. A screen reader had no
        * landmark to jump to either.
        *
        * The link is visually hidden until it takes focus, which is the one case it exists for.
        */}
      <AppSidebar />
      <main id="main" className={onConversationPage ? 'gw-main-content gw-focus' : 'gw-main-content'}>
        {children}
      </main>
      {isAuthenticated && askOpen && (
        <div className="gw-ask-drawer" style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw', zIndex: 45,
          boxShadow: '-8px 0 24px rgba(26, 25, 22, 0.08)',
        }}>
          <AskGroundwork onClose={hideAsk} initialMessage={pendingAskMessage} onSentInitialMessage={consumePendingAskMessage} />
        </div>
      )}
      <FeedbackWidget />

      <style>{`
        /*
         * HOW MUCH ROOM A FULL-HEIGHT PAGE ACTUALLY HAS.
         *
         * A chat page fills the viewport and scrolls its own message list, so the composer stays
         * on screen however long the conversation gets. It asked for 100vh. But on a narrow screen
         * the main element also reserves 60px at the bottom for the fixed nav strip - so the page came to a
         * viewport plus sixty, every chat scrolled by exactly the height of the nav bar, and the
         * one thing you always need, the box you type in, was the thing pushed off the bottom.
         *
         * The room available is the viewport less whatever is pinned over it. Declared here, next
         * to the padding that reserves it, because the two numbers have to agree and they were in
         * different files.
         */
        :root { --gw-bottom-nav: 0px; }
        @media (max-width: 640px) {
          :root { --gw-bottom-nav: calc(60px + env(safe-area-inset-bottom)); }
          .gw-sidebar-desktop { display: none !important; }
          .gw-sidebar-mobile  { display: flex !important; }
          /*
            CLEAR OF THE NAV, AND OF THE TWO THINGS FLOATING ABOVE IT.

            This was the nav's 60px exactly, so the last thing on every page ended level with the
            top of the nav bar and underneath the feedback pill and the help button, which sit at
            76 and 128 from the bottom. Measured on a real check-in at 375px: the lowest content
            ended at 752 on an 812 screen, with both floats over it.

            166 is where the help button's top edge is; the rest is a thumb's worth of room so the
            last line is readable rather than merely uncovered.
          */
          .gw-main-content    { margin-left: 0 !important; padding-bottom: calc(180px + env(safe-area-inset-bottom)); }
          /* A bottom sheet is the right shape on a phone - thumb reach, and there is no middle to
             speak of. It was being drawn that way on every screen, which is the bug. */
          .gw-fb-overlay      { align-items: flex-end !important; padding: 0 !important; }
          .gw-fb-panel        { border-radius: 12px 12px 0 0 !important; max-height: 90vh !important; }
          /* On a phone Ask Groundwork is its own page, "Chat" in the bottom bar. */
          .gw-ask-drawer      { display: none !important; }
          /*
            REVIEW ROUND 3, ITEM 7: NO APP BOTTOM BAR ON THE CONVERSATION.
            AppSidebar does not render the bottom bar at all on the conversation route (its own
            onConversationPage check); this gives the room it used to reserve back to the card,
            so the conversation fills the screen down to its own composer rather than stopping 60px
            short of it and leaving a strip of plain page behind.
          */
          .gw-main-content.gw-focus { padding-bottom: 0 !important; --gw-bottom-nav: 0px; }
        }
        @media (min-width: 641px) {
          .gw-sidebar-desktop { display: flex !important; }
          .gw-sidebar-mobile  { display: none !important; }
          .gw-main-content    { margin-left: var(--gw-sidebar-w, 256px); min-height: 100vh; }
        }
      `}</style>
    </>
  )
}
