import { toast } from 'sonner'
import { mayRenameACheckIn } from '@/lib/who-may-rename-a-check-in'
import { MARKETING_URL } from '@/lib/marketing'
import { authApi } from '@/api/auth'
import { railAttention, railRank, stillInRail } from '@/lib/rail-attention'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { useEntryStore } from '@/stores/entry'
import { useFeedbackStore } from '@/stores/feedback'
import { feedbackApi } from '@/api/feedback'
import type { Ground } from '@/types'
import { alignmentShort } from '@/lib/alignment'
import {
  asStyle, keepItOnScreen, rememberIt, theyMeantToMoveIt, whereItLands, whereTheyLeftIt,
  type Resting, type Where,
} from './a-button-that-gets-out-of-the-way'

const NAV_ITEMS = [
  {
    /*
     * "ALL CHECK-INS", BECAUSE THE RAIL ABOVE IT IS ALREADY A LIST OF CHECK-INS.
     *
     * The top of this rail is a live list of the check-ins somebody is in, and this item said
     * "Check-ins" and went to a page of the same thing - so a person looking at their check-ins was
     * offered a link called check-ins, and reasonably asked which one they were meant to use.
     *
     * The page is not redundant: it holds the ones the rail does not show and the ways in to them.
     * What was redundant was the name.
     */
    /* WHAT THE BOTTOM BAR CALLS IT (`short`, below). Measured at 320px: this label is 64px wide in
       a 64px cell on a customer's five-item bar and a 53px cell on our six-item one, so it
       overflows and - because the cell centres it - loses its START rather than its end.
       "ll check-ins" is not a truncated label, it reads as a different one. Type size cannot fix
       it: 8.5px still overflows, and that is not a size to ask a thumb to read. So the bar gets the
       short name and the rail keeps the full one, which is the only place "All" was ever doing work.
       The note sits ABOVE the label deliberately: `two-things-called-check-ins.spec.ts` reads a
       fixed window after `label:` to check this item still points at /grounds, and a comment
       wedged between the two pushed the route out of its view. */
    label: 'All check-ins',
    short: 'Check-ins',
    to: '/grounds',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    /*
      THE BOARDS, WHICH HAD NO ADDRESS OF THEIR OWN.
      A board lived inside one check-in: to read three you opened three check-ins. Asked for
      plainly - "where do I go to see the archive and all team boards" - and there was nowhere to
      send anybody. It sits beside People because it is the same kind of thing: a view across the
      organisation rather than into one piece of work.
      WHO GETS THE DOOR. Anybody overseeing more than one check-in: an admin, who sees the
      organisation's, and a LEAD, who sees their department's. A participant reads the board of the
      check-in they are on and reaches it from that check-in, so a second address across several
      would be a page holding one row - and the member's rail is deliberately two items.
    */
    label: 'Boards',
    to: '/boards',
    oversightOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M2 7.5h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 11h3M6 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // "Team" and "Teams" sat side by side, one letter apart, pointing at
    // different pages - a coin-flip for anyone looking for the list of people in
    // their org. Named for what each one actually is. GW-011.
    label: 'People',
    to: '/org/members',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path d="M1 16c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 12c1.657 0 3 1.12 3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  /**
   * "All grounds" is gone. W9-5.
   *
   * `grounds.list` already returns every ground in the organisation when the caller
   * is an admin, so the roster was the same data at a second address - one page with
   * two levels of detail, not two audiences. The one column it added that mattered,
   * who leads each ground, is on the grounds card now.
   */
  {
    /* A route with no door is a page nobody finds. This one is admin-only because every endpoint
       behind it is, and a nav item that leads to a refusal is worse than no nav item. */
    label: 'Connect',
    to: '/org/integrations',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 12.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 4.5l1.5-1.5a3.5 3.5 0 015 5L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
        <path d="M9 15.5L7.5 17a3.5 3.5 0 01-5-5L4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Billing',
    to: '/billing',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
        <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="11" width="3" height="2" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    /**
     * "ADMIN" MEANT TWO THINGS AND THIS WAS THE OTHER ONE. W-UX-3.
     *
     * The list page's header carries a pill saying what YOU are in this organisation - "Admin" or
     * "Team member" - and this rail item, pointing at Groundwork's own back office, wore the
     * identical word one inch away. Renaming the page's link and leaving this one would have moved
     * the collision rather than removed it.
     */
    /* Same measurement, same reason as All check-ins. Only platform admins see this one, so it is
       our own bar that breaks worst - which is no reason to leave it broken. */
    label: 'Platform ops',
    short: 'Ops',
    to: '/admin',
    // Groundwork's own back-office, NOT the org admin's area. The route is
    // wrapped in RequirePlatformAdmin, so gating this on `adminOnly` showed
    // every org admin a door that bounced her straight back to /grounds.
    platformAdminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2.5L12.5 7.5H17.5L13.5 10.5L15 15.5L10 12.5L5 15.5L6.5 10.5L2.5 7.5H7.5L10 2.5Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    /**
     * SETTINGS WAS NOT IN THE RAIL AT ALL. It lived only in the user block at the bottom of the
     * grounds list, so the org's own settings - its name, the thing every page shows the team - were
     * reachable from one page and nowhere else.
     *
     * Not `adminOnly`: everybody has settings of their own here (notifications, WhatsApp number, what
     * we hold about them). The org section of that page is already gated inside it.
     */
    label: 'Settings',
    to: '/settings',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M10 2.2v2.2M10 15.6v2.2M4.5 4.5l1.6 1.6M13.9 13.9l1.6 1.6M2.2 10h2.2M15.6 10h2.2M4.5 15.5l1.6-1.6M13.9 6.1l1.6-1.6"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  /**
   * PROFILE IS NOT IN THE RAIL, because the page says it does not exist yet:
   * "A profile that gathers them in one place is not built yet." A permanent menu
   * item that admits it does nothing teaches people the menu is unreliable, and
   * this rail is about to become the main way around the product.
   *
   * The route stays - but I justified that with "links to a person's profile keep
   * working", and there are no such links. Not one, anywhere in the app. Measured
   * after the same mistake was found on the marketing site, where four pages were
   * written, deployed and reachable by nobody. So /profile/:id? is a page that can
   * only be opened by typing its URL, kept for callers that do not exist.
   *
   * Left in place rather than deleted because that is Hafsah's call and the page is
   * three sentences of true copy, worth linking the moment a person's name becomes
   * clickable. `every-page-can-be-reached.spec.ts` lists it as the one real gap so
   * it cannot be forgotten again.
   */
]

/**
 * WHO SEES WHICH NAV ITEM, DECIDED ONCE.
 *
 * There were three renderers - the collapsed rail, the expanded rail, the mobile bar - and three
 * different answers:
 *
 *   collapsed   `!item.adminOnly || user?.role === 'ADMIN'`   correct
 *   expanded    `!item.adminOnly`                             an ADMIN saw no People and no Billing
 *   mobile      no filter at all                              everybody saw both
 *
 * So an admin on a desktop had no way to reach billing from the rail, and a team member on a phone had
 * two doors that would bounce them. Her words: "billing and settings for the org should have its own
 * accessibility at the very top for the admin."
 */
export function navItemsFor(user: { role?: string; isPlatformAdmin?: boolean } | null | undefined) {
  return NAV_ITEMS.filter(item => {
    if ((item as any).platformAdminOnly) return !!user?.isPlatformAdmin
    if ((item as any).adminOnly) return user?.role === 'ADMIN'
    /* Whoever oversees more than one check-in: the org's, or a department's. */
    if ((item as any).oversightOnly) return user?.role === 'ADMIN' || user?.role === 'LEAD'
    return true
  })
}

/**
 * The organisation's own pages, as opposed to the grounds inside it.
 *
 * /boards is deliberately NOT one. It sits beside People in the rail, but it is a view of the WORK
 * - every check-in's shared picture - not a setting of the organisation. Listing it here would put
 * the company's name as a heading over a lead's two items, one of which is their own settings.
 */
export const ORG_ROUTES = ['/org/members', '/org/integrations', '/billing', '/settings']

type FbTab = 'reaction' | 'build' | 'wrong'

const REACTION_OPTIONS = ['This clicked', 'I could see myself using this', 'Interesting but I am not sure', 'Not for me']
const BUILD_OPTIONS    = ['Reminder / email nudge', 'Mobile app', 'Slack integration', 'Better reports', 'More templates', 'Team analytics']

function FeedbackWidget() {
  const location = useLocation()
  const isChatPage = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/checkin/') || location.pathname === '/start'
  // `/feed` used to draw its own feedback button in its header, so the floating one was
  // hidden there to avoid two. The page is gone (W13-13), so the floating trigger is
  // simply always on.
  const hideTrigger = false
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

function NavItem({ item, compact }: { item: typeof NAV_ITEMS[0]; compact?: boolean }) {
  const location = useLocation()
  const active = location.pathname.startsWith(item.to)
  const user = useAuthStore(s => s.user)
  if (item.adminOnly && user?.role !== 'ADMIN') return null
  if ((item as any).platformAdminOnly && !user?.isPlatformAdmin) return null

  if (compact) {
    return (
      <NavLink
        to={item.to}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 4px', borderRadius: 10, color: active ? '#93C5FD' : 'rgba(255,255,255,.55)',
          textDecoration: 'none', fontSize: 10, fontWeight: active ? 700 : 500,
          background: active ? 'rgba(147,197,253,.1)' : 'transparent', flex: 1, minWidth: 0,
          /**
           * BROKEN LABELS IN THE BOTTOM BAR. W-UX-A.
           *
           * Five items across 375px with 12px of side padding each left too little room, so the two
           * longest snapped mid-word: "Check-" over "ins", "Platform" over "ops". The bar is 60px
           * tall, so the second line was clipped as well as wrong.
           *
           * The padding was the slack. Trimmed to 4px and the label held on one line; `nowrap` with
           * ellipsis is the backstop, so a longer name in future degrades to "Platform o..." rather
           * than to a broken word.
           */
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {item.icon(active)}
        {/* The short name where there is one. See the note on the item itself. */}
        {(item as { short?: string }).short ?? item.label}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 10, color: active ? 'var(--gw-green-t)' : '#374151',
        textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500,
        background: active ? 'rgba(8,80,65,0.09)' : 'transparent', transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(8,80,65,0.05)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {item.icon(active)}
      {item.label}
    </NavLink>
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

function GroundStatusBadge({ status }: { status: string }) {
  if (SILENT_STATUSES.includes(status)) return null
  const isReady = status === 'REPORT_READY'
  /** Amber for "somebody has to act before this can move", grey for a finished record. */
  const isWaiting = status === 'AWAITING_APPROVAL' || status === 'PAUSED'
  const color = isReady ? '#065f46' : isWaiting ? 'var(--gw-amber-t)' : '#6B7280'
  const bg = isReady ? 'rgba(6,95,70,.1)' : isWaiting ? 'var(--gw-amber-bg)' : 'rgba(107,114,128,.08)'
  const label = isReady ? 'Report ready' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 4, padding: '2px 6px' }}>
      {label}
    </span>
  )
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  // .gw-main-content and .cg-fixed-bar live outside this component and need
  // to offset by the sidebar's actual width, not just its expanded default,
  // or content/fixed bars leave a gap when the sidebar is collapsed to 60px.
  useEffect(() => {
    document.documentElement.style.setProperty('--gw-sidebar-w', collapsed ? '60px' : '240px')
  }, [collapsed])

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)

  /**
   * The organisations this person belongs to. Only asked when signed in: before that
   * it is a guaranteed 401 and a toast nobody caused.
   */
  const { data: myOrgs = [] } = useQuery({
    queryKey: ['my-organizations'],
    queryFn: authApi.myOrganizations,
    enabled: isAuthenticated,
    retry: false,
  })
  const setAuth = useAuthStore(s => s.setAuth)
  const switchOrg = useMutation({
    mutationFn: (organizationId: string) => authApi.switchOrganization(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      // A full reload rather than invalidating queries: a half-switched app still
      // showing the previous organisation's grounds is worse than a second of waiting.
      window.location.assign('/grounds')
    },
    onError: () => toast.error('Could not switch organisation. Try again.'),
  })
  const { data: grounds = [] } = useQuery<Ground[]>({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    staleTime: 30_000,
    enabled: isAuthenticated,
  })

  const location = useLocation()
  const isEntryPage = !isAuthenticated && location.pathname === '/start'
  const { groundName, setGroundName } = useEntryStore()
  const [renamingEntry, setRenamingEntry] = useState(false)
  const [entryRenameVal, setEntryRenameVal] = useState('')
  const entryRenameRef = useRef<HTMLInputElement>(null)


  const initials = user ? (user.firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase() : 'U'

  function startRename(g: Ground) {
    setRenamingId(g.id)
    setRenameValue(g.label)
    setTimeout(() => renameRef.current?.select(), 50)
  }

  /*
   * A REFUSAL LEFT THE FIELD OPEN AND SAID NOTHING.
   *
   * There was no catch here. The server now answers 403 when somebody who is not the lead tries to
   * rename a check-in, so the await rejected, `setRenamingId(null)` never ran, and the input sat
   * there in edit mode with no error and no change - the same "pressed it and nothing happened"
   * the audit found, just arriving by a different route.
   *
   * The pencil is hidden from people who cannot rename (see `mayRename` below), so this path is
   * now only reached by somebody who may rename and whose request failed anyway - a dropped
   * connection, a check-in closed in another tab. That still has to be said out loud.
   */
  async function commitRename(id: string) {
    const val = renameValue.trim()
    setRenamingId(null)
    if (!val) return
    try {
      await groundsApi.update(id, { label: val }, { quiet: true })
      qc.invalidateQueries({ queryKey: ['grounds'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'The name did not change. Nothing else was altered — try again.')
    }
  }

  /* Renaming is the lead's call or an admin's, and the server enforces it. Showing the pencil to
     anybody else offers something that will be refused. The rule is shared with the server's, in
     `who-may-rename-a-check-in`, so the two cannot drift apart again. */
  const mayRename = (g: Ground) => mayRenameACheckIn(g, user)

  const sidebarWidth = collapsed ? 60 : 240

  return (
    <>
      <aside
        className="gw-sidebar-desktop"
        style={{
          position: 'fixed', top: 0, left: 0, width: sidebarWidth, height: '100vh',
          background: '#0D1A2B', borderRight: '1px solid rgba(255,255,255,.07)',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          transition: 'width .2s ease', overflow: 'hidden',
        }}
      >
        {/* Logo + collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 12px', flexShrink: 0 }}>
          {/**
            * THE WAY BACK TO THE SITE, IN BOTH STATES.
            *
            * Expanded, the wordmark links out, as it always did. Collapsed, there was nothing at all -
            * just the chevron - so the rail somebody works in all day had no way home. A single G,
            * same destination.
            */}
          {!collapsed ? (
            <a href={MARKETING_URL} style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)', letterSpacing: '-0.3px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Groundwork
            </a>
          ) : (
            <a
              href={MARKETING_URL}
              title="Groundwork"
              style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)', textDecoration: 'none', lineHeight: 1 }}
            >
              G
            </a>
          )}
          <button
            className="gw-tap44"
            onClick={() => setCollapsed(v => !v)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', fontFamily: 'inherit', marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/*
          The Chat / More switch was here for one day. More was the card view of a
          ground, and Hafsah retired it once the conversation carried the history:
          "we have now made the more obsolete which is fine." A switch with one side
          left is a control that teaches people to look for something that is not
          there.
        */}
        {/* New ground button */}
        <div style={{ padding: collapsed ? '0 8px 10px' : '0 10px 10px', flexShrink: 0 }}>
          {/*
            * NOT SHOWN TO SOMEBODY IT WOULD REFUSE.
            *
            * A member used to see this, fill in eight steps, and be told on submit that opening a
            * check-in is limited to people their admin has named. The refusal was right and the
            * journey was a waste of their afternoon.
            *
            * They lose nothing by not seeing it: taking part in a check-in happens by being added
            * to one, and everything they are in is on the list below.
            */}
          {user?.mayOpenCheckIns !== false && <button
            onClick={() => navigate('/start?new=1')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 7,
              padding: collapsed ? '8px' : '8px 12px', borderRadius: 8,
              background: 'rgba(26,86,219,.18)', border: '1px solid rgba(26,86,219,.3)',
              color: '#93C5FD', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {!collapsed && <span>Start a check-in</span>}
          </button>}
        </div>

        {/* Grounds list */}
        {!collapsed && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {/* Entry ground shown when unauthenticated on /start */}
            {isEntryPage && (
              <div style={{ padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,.09)', marginBottom: 6 }}>
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
                    style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 4, color: 'rgba(255,255,255,.92)', fontSize: 13, fontWeight: 600, padding: '3px 7px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.92)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groundName}</span>
                    <button
                      onClick={() => { setEntryRenameVal(groundName); setRenamingEntry(true); setTimeout(() => entryRenameRef.current?.select(), 40) }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: 11, padding: '0 2px', fontFamily: 'inherit' }}
                      title="Rename"
                      aria-label={`Rename ${groundName}`}
                    >✎</button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>Not saved yet</span>
                  
                </div>
              </div>
            )}
            {!isEntryPage && grounds.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', padding: '8px 6px' }}>Nothing in progress yet</div>
            )}
            {/*
              THE RAIL IS A CHANNEL LIST, so it is ordered by what needs you and it
              drops grounds that closed long ago.

              Attention first (overdue, then your turn, then waiting on others), and
              a closed ground stays about three months before leaving - long enough
              that the report and the resolution are still where people expect them.
              Sorting by attention is most of why a flat rail can stay flat: the rows
              that need you are always at the top, whatever the count.
            */}
            {grounds
              .filter(g => stillInRail(g as any))
              .slice()
              .sort((a, b) => railRank(railAttention(a as any, user?.id)) - railRank(railAttention(b as any, user?.id)))
              .map(g => {
              // DISTINCT session numbers, not the number of check-in rows: with 5
              // people over 13 sessions this counted 65 "sessions".
              //
              // AND ONLY THE COMPLETED ONES, so this agrees with the ground page.
              // It counted every check-in row including NOT_STARTED, so the rail
              // said "1/6" for a ground whose header said "Session 2 of 6" - two
              // readings of the same ground, one counting what exists and the
              // other what is done. The label below now says which it is.
              const sessions = new Set(
                (g.checkIns ?? []).filter((c: any) => c.status === 'COMPLETED').map((c: any) => c.sessionNumber),
              ).size
              // Respect the ground's real cadence. Hardcoding /14 said "7 sessions"
              // for a 90-day WEEKLY ground that actually runs ~13.
              const planned = plannedSessionsFor(g.timelineDays, (g as any).cadence, (g as any).maxSessions)
              // Never show fewer planned than have already happened.
              const maxSessions = planned != null ? Math.max(planned, sessions) : null
              // What this ground needs from you, if anything. See lib/rail-attention.
              const attention = railAttention(g as any, user?.id)
              return (
                <div key={g.id} style={{ marginBottom: 2, borderRadius: 8, overflow: 'hidden' }}>
                  <NavLink
                    to={`/grounds/${g.id}`}
                    title={[
                      g.label,
                      `${sessions}${maxSessions ? ` of ${maxSessions}` : ''} sessions done`,
                      alignmentShort((g as any).alignment) || null,
                      attention.kind === 'overdue'
                        ? `Session ${attention.sessionNumber} is ${attention.daysLate} days past its date`
                        : attention.kind === 'yours'
                          ? `Session ${attention.sessionNumber} is ready for you`
                          : attention.kind === 'waiting'
                            ? `${attention.done} of ${attention.total} have checked in`
                            : null,
                    ].filter(Boolean).join(' · ')}
                    style={({ isActive }) => ({
                      display: 'block', padding: renamingId === g.id ? '6px 10px 4px' : '9px 10px 6px', borderRadius: 8,
                      textDecoration: 'none',
                      background: isActive ? 'rgba(255,255,255,.09)' : 'transparent',
                    })}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                    onMouseLeave={e => {
                      const loc = window.location.pathname
                      if (!loc.includes(g.id)) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Label row with rename */}
                    {renamingId === g.id ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(g.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(g.id); if (e.key === 'Escape') setRenamingId(null) }}
                        onClick={e => e.preventDefault()}
                        style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 4, color: 'rgba(255,255,255,.92)', fontSize: 13, fontWeight: 600, padding: '3px 7px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      />
                    ) : (
                      <div className="gw-rail-row" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/*
                          BOLD AND A DOT WHEN IT IS YOUR TURN, RED ONLY WHEN LATE.
                          Hafsah asked for the name to turn red when it is time to
                          check in; this splits that in two deliberately. A ground
                          going red the moment it is your turn puts a red mark
                          against somebody for being on time, and the engine's own
                          rules forbid surveillance signals of exactly that shape.
                        */}
                        {(attention.kind === 'yours' || attention.kind === 'overdue') && (
                          <span
                            title={attention.kind === 'overdue' ? `Session ${attention.sessionNumber} is ${attention.daysLate} days past its date` : `Session ${attention.sessionNumber} is ready for you`}
                            style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: attention.kind === 'overdue' ? 'var(--gw-red-b-soft)' : 'var(--gw-green-b)',
                            }}
                          />
                        )}
                        <span style={{
                          fontSize: 13,
                          fontWeight: attention.kind === 'yours' || attention.kind === 'overdue' ? 800 : 600,
                          color: attention.kind === 'overdue' ? 'var(--gw-red-b)' : attention.kind === 'yours' ? 'white' : 'rgba(255,255,255,.88)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                        }}>
                          {g.label}
                        </span>
                        {/**
                          * OFFERED ONLY TO SOMEBODY WHO CAN ACTUALLY RENAME IT.
                          *
                          * This pencil rendered for every user beside every check-in, with no role
                          * condition at all. For most of its life that was harmless in the worst
                          * way - renaming did nothing for anybody, so nobody found out.
                          *
                          * It works now, and it is the lead's call or an admin's, the same gate as
                          * changing how long a check-in runs. So a participant clicking this got a
                          * refusal from the server for a control the rail had offered them.
                          *
                          * The same question the server asks, asked before the button is drawn.
                          *
                          * MERGE NOTE. Two branches fixed this independently and the conflict was
                          * real: staging asked the question inline here, this branch had moved it
                          * into `who-may-rename-a-check-in` so the rail and the server share one
                          * rule rather than two copies of it. The shared rule is kept - it is what
                          * stops them drifting apart again, which is how the pencil came to be
                          * offered to everybody in the first place - and staging's account of the
                          * history is kept with it, because it is the better explanation.
                          */}
                        {mayRename(g) && <button
                          className="gw-rename"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); startRename(g) }}
                          title={`Rename ${g.label}`}
                          aria-label={`Rename ${g.label}`}
                          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 2px', fontSize: 11, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}
                        >✎</button>}
                      </div>
                    )}

                    {/*
                      ONE LINE PER GROUND, WHICH IS WHAT MAKES IT A CHANNEL LIST.

                      This row carried a second line - "no read yet · 1/6 done" and
                      a status pill - under every name. Three facts about a ground
                      you are not looking at, on every row, in a rail whose job is
                      to tell you which one needs you. A channel list is names; the
                      state belongs on the ground, and the ground page now opens
                      with it (sessions done, who has checked in, the report).

                      NOTHING IS LOST, IT MOVED. The count and the read are on the
                      row's tooltip for anyone who wants them without navigating,
                      and a ground that is not ACTIVE still says so, because "this
                      one is closed" changes whether you click at all.
                    */}
                    {!SILENT_STATUSES.includes(g.status) && (
                      <div style={{ marginTop: 3 }}>
                        <GroundStatusBadge status={g.status} />
                      </div>
                    )}
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}

        {/* Collapsed: nav icons */}
        {collapsed && (
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            {/* Same two gates the expanded nav applies. This list rendered
                NavLinks directly rather than going through NavItem, so it skipped
                the adminOnly check entirely and showed People / Roster / Billing
                to every member whose sidebar happened to be collapsed. */}
            {navItemsFor(user).map(item => {
              const active = window.location.pathname.startsWith(item.to)
              return (
                <NavLink key={item.to} to={item.to} title={item.label}
                  style={{ color: active ? '#93C5FD' : 'rgba(255,255,255,.55)', padding: '8px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {item.icon(active)}
                </NavLink>
              )
            })}
          </nav>
        )}

        {/* Nav items - always visible in expanded sidebar */}
        {!collapsed && (
          <nav style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            {/**
              * ONE GATE. This used to filter on `!item.adminOnly`, which meant an ADMIN - the only
              * person People and Billing are for - could not see either of them in the expanded rail.
              * They appeared in the collapsed icon strip, which used the right test.
              */}
            {navItemsFor(user).map((item, i, all) => {
              const active = location.pathname.startsWith(item.to)
              const canNav = isAuthenticated
              /**
               * THE ORGANISATION'S OWN PAGES, GROUPED AND NAMED. Her words: "billing and settings for
               * the org should have its own accessibility at the very top for the admin or somewhere
               * else. What if the admin is also a participant or lead."
               *
               * That last question is the reason this is a heading rather than a separate bar: what
               * somebody can do for the ORGANISATION does not change with the part they hold on any
               * ground. An admin who is also a lead and a party sees this section unchanged, and their
               * part in a ground decides only what the ground's own tabs contain.
               *
               * The name is the organisation's, so it reads as a place rather than a category.
               */
              const isOrg = ORG_ROUTES.includes(item.to)
              /**
               * The heading appears only when there is a group to head. A team member sees Settings
               * and nothing else from this list, and their settings are their own - notifications,
               * their WhatsApp number, what we hold about them - so putting the company's name above
               * it would be wrong about whose page it is.
               */
              const orgCount = all.filter(x => ORG_ROUTES.includes(x.to)).length
              /**
               * THE ORG NAME WAS PRINTED TWICE. W15-4.
               *
               * "Is the item before me an org route?" is not the same question as "am I the first
               * org route?", and the difference is `/admin`, which sits between `/billing` and
               * `/settings` and is not an org route. So `/settings` looked like the start of a
               * second org group and printed the heading again: People, Billing, ADMIN, then the
               * company name a second time above Settings.
               *
               * Only ever visible to a platform admin, because they are the only ones with
               * `/admin` in the middle of the group - which is why it survived. Found by looking
               * at a screenshot of the sidebar.
               *
               * Asked properly now: am I the first org route in the list.
               */
              const firstOrg = isOrg && orgCount > 1
                && all.findIndex(x => ORG_ROUTES.includes(x.to)) === i
              return (
                <div key={item.to}>
                  {firstOrg && (
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'rgba(255,255,255,.55)', fontWeight: 700, padding: '10px 10px 4px' }}>
                      {user?.organizationName ?? 'Your organisation'}
                    </div>
                  )}
                  <NavLink
                    to={canNav ? item.to : '/auth'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                      color: active ? '#93C5FD' : canNav ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)',
                      background: active ? 'rgba(147,197,253,.08)' : 'transparent',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      pointerEvents: canNav ? 'auto' : 'none',
                    }}
                  >
                    {item.icon(active)}
                    <span>{item.label}</span>
                  </NavLink>
                </div>
              )
            })}
          </nav>
        )}

        {/*
          SWITCHING ORGANISATION, AT THE BOTTOM WITH THE PERSON. W9-4.

          Her call that the bottom is fine, and it belongs next to who you are because
          that is what it changes: not a filter on one page, but whose organisation
          every page is about. It appears only when there is somewhere to switch TO - a
          switcher listing one thing is a control that does nothing.

          The role shown is per organisation. Somebody can run their own company and be
          an ordinary member of a client's, and the token carries the membership's role,
          not the person's.
        */}
        {isAuthenticated && !collapsed && myOrgs.length > 1 && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 6 }}>
              Organisation
            </div>
            {myOrgs.map(o => (
              <button
                key={o.id}
                /**
                 * ONE CLICK USED TO BE ENOUGH. W8-71.
                 *
                 * Switching organisation changes which data you can see, changes your role
                 * (a person can administer their own company and be an ordinary member of
                 * a client's), and reloads the whole app onto a different grounds list.
                 * These rows sit in the rail directly above the profile block, so a
                 * mis-aimed click did all of that silently - and then the grounds you were
                 * looking at were gone and your role said Member, which reads exactly like
                 * the product losing your data. That happened to me while testing, and I
                 * could not tell afterwards whether I had clicked it or something had done
                 * it for me.
                 *
                 * A native confirm rather than a designed modal: this is a rail control on
                 * every page, the question is one line, and a modal here would be a bigger
                 * change than the problem warrants. It names the organisation and the role
                 * they will have in it, since the role change is the part nobody expects.
                 */
                onClick={() => {
                  if (o.active || switchOrg.isPending) return
                  const asRole = o.role.toLowerCase()
                  if (!window.confirm(`Switch to ${o.name}? You will see ${o.name}'s check-ins instead of this organisation's, as a ${asRole}.`)) return
                  switchOrg.mutate(o.id)
                }}
                disabled={switchOrg.isPending}
                title={o.active ? 'You are in this organisation' : `Switch to ${o.name}`}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 8px', marginBottom: 2, borderRadius: 6, border: 'none',
                  background: o.active ? 'rgba(255,255,255,.09)' : 'transparent',
                  color: o.active ? 'white' : 'rgba(255,255,255,.6)',
                  cursor: o.active ? 'default' : 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: o.active ? 700 : 500,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: o.active ? 'var(--gw-green-live)' : 'transparent' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', textTransform: 'capitalize', flexShrink: 0 }}>
                  {o.role.toLowerCase()}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* User profile / sign in */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1A56DB', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials}
              </div>
              {!collapsed && (
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email ?? ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    {/**
                      * WHICH ORGANISATION YOU ARE IN, BESIDE WHAT YOU ARE IN IT.
                      *
                      * An ordinary member could not see the company's name anywhere in the chrome.
                      * People and Billing are admin-only, so the org heading above them - which is
                      * the only place the name appeared - never rendered for them. They knew they
                      * were a "Member" of something unnamed.
                      *
                      * NOT FIXED BY PUTTING THE NAME ABOVE SETTINGS, which was the obvious move and
                      * is wrong: a member's Settings is their OWN - notifications, their number,
                      * what we hold about them - and the company's name over it mislabels whose page
                      * it is. `the-org-is-not-a-ground` guards that, correctly.
                      *
                      * It belongs here because this block is about the person's MEMBERSHIP, which is
                      * exactly the thing in question, and because switching organisation happens two
                      * lines above. Role and org are one fact: you are a member OF something.
                      */}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ textTransform: 'capitalize' }}>{(user?.role ?? '').toLowerCase()}</span>
                      {user?.organizationName ? ` at ${user.organizationName}` : ''}
                    </span>
                    {/**
                      * SIGNING OUT EXISTED ON ONE PAGE, AS A SPAN.
                      *
                      * It was on the grounds list and nowhere else, so from a ground, a check-in,
                      * billing or settings there was no way to leave - you either navigated back to
                      * the list to find it or cleared the browser.
                      *
                      * It belongs here because this is the block that says who you are, on every
                      * page. The session itself lasts seven days and is persisted, which is the
                      * other half of what she asked for: you stay signed in on the device, and
                      * leaving is something you choose rather than something that happens to you.
                      */}
                    <button
                      onClick={() => { logout(); navigate('/') }}
                      style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                      title="Sign out of Groundwork on this device"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            !collapsed && (
              <button
                onClick={() => navigate('/auth')}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                Sign in →
              </button>
            )
          )}
        </div>
      </aside>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
        background: '#0D1A2B', borderTop: '1px solid rgba(255,255,255,.07)',
        display: 'flex', alignItems: 'center', zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
        className="gw-sidebar-mobile"
      >
        {/* Was unfiltered, so a team member on a phone saw People and Billing and got bounced. */}
        {navItemsFor(user).map(item => <NavItem key={item.to} item={item} compact />)}
      </nav>
    </>
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
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
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
  const CHROMELESS = [
    '/auth', '/auth/sent', '/auth/google/callback',
    '/set-password', '/reset-password', '/verify-email',
    '/invite', '/join', '/login', '/org/setup',
  ]

  /**
   * THE RAIL ON /start FOR SOMEBODY WITHOUT AN ACCOUNT YET.
   *
   * `AppSidebar` has a branch for exactly this, and its own comment says so: "Entry ground shown when
   * unauthenticated on /start". It draws the ground being built - its name, renameable, and how many
   * sessions - for a person who has no grounds because they are making their first one.
   *
   * It could never run. `showSidebar` required `isAuthenticated`, so the sidebar was not mounted at
   * all for a stranger, which made `isEntryPage = !isAuthenticated && pathname === '/start'` a
   * condition that is false whenever it is evaluated. The rail Hafsah remembered on a signed-out
   * window was real, and an auth gate added later killed it without removing the branch.
   *
   * Same shape as the G37 defect: a check that cannot be true, no failure, just a thing that quietly
   * stopped happening. The API sweep for this class did not cover the client.
   */
  const isEntryFlow = location.pathname === '/start'
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
  const showSidebar =
    (isAuthenticated || isEntryFlow) && !CHROMELESS.includes(location.pathname) && !isBackOffice

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
      <main id="main" className="gw-main-content">
        {children}
      </main>
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
          .gw-main-content    { margin-left: 0 !important; padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
          /* A bottom sheet is the right shape on a phone - thumb reach, and there is no middle to
             speak of. It was being drawn that way on every screen, which is the bug. */
          .gw-fb-overlay      { align-items: flex-end !important; padding: 0 !important; }
          .gw-fb-panel        { border-radius: 12px 12px 0 0 !important; max-height: 90vh !important; }
        }
        @media (min-width: 641px) {
          .gw-sidebar-desktop { display: flex !important; }
          .gw-sidebar-mobile  { display: none !important; }
          .gw-main-content    { margin-left: var(--gw-sidebar-w, 240px); min-height: 100vh; }
        }
      `}</style>
    </>
  )
}
