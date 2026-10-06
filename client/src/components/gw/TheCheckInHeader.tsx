import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { cadenceLabel } from '@/lib/cadence'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { useAskStore } from '@/stores/ask'
import { scrollTo } from '@/lib/scroll-to'
import type { GroundCadence } from '@/api/grounds'
import './ui/gw-ui.css'

/**
 * U.10 ITEM 2: THE CHECK-IN'S OWN HEADER AND TABS, THE PROTOTYPE'S SHAPE, AS ONE COMPONENT.
 *
 * The prototype (board-as-lead.jpg) draws every check-in page with the same header: a breadcrumb
 * ("Check-ins / Sales team, Q3"), the title in serif on cream, a cadence line under it, a navy
 * "Your check-in" button and an "Ask" link on the right, then a tab bar (Board / Check-in / Context
 * / My work / People and setup / "Views ▾"). The board drew none of this - it had "← Back to the
 * check-in" above a dark navy card (rgb(10,22,40)) of its own invention.
 *
 * ROUND 6, ITEM I: NOW SHARED BY EVERY CHECK-IN PAGE, NOT ONLY THE BOARD.
 * Two ways to drive the tab bar: pass nothing and get the board's own five Link-based tabs
 * (unchanged from the first pass), or pass `tabs` (each `{key,label,to?}`) and `onSelectTab` -
 * GroundAdminPage.tsx and GroundParticipantPage.tsx do this, because their tabs switch a local
 * `tab` state and rewrite `?tab=` rather than navigating to a different route (`ground-tabs.ts`,
 * `GroundTabRow.tsx`, which this replaces on both pages). An entry with its own `to` (only "Board",
 * a genuinely different route) still renders as a real link even inside a callback-driven tab row.
 *
 * TAB MAP, prototype → product's existing routes/tabs:
 *   Board             → /grounds/:id/board (its own route)
 *   Check-in          → the `chat` tab (ground-tabs.ts FIRST_TAB)
 *   Context           → the `context`/`documents` tab
 *   My work           → the `sessions` tab (whoever runs it) or `record` (a party) - the two tabs
 *                        ground-tabs.ts already splits "everyone's state" from "your own" into
 *   People and setup  → the `settings` tab (labelled "Setup" there; holds access and roles)
 *   Views ▾            → NOT BUILT. Nothing in the product answers "what does this menu offer" -
 *                        no alternate board views exist yet. Left out rather than a dead button.
 *   (no prototype tab) → `report` ("Report") has no equivalent in the prototype's five tabs - the
 *                        prototype folds a session list into the board itself, but this product's
 *                        Report tab does more (the forming picture, every session, release). Kept
 *                        reachable as a sixth tab rather than dropped.
 */
export function TheCheckInHeader({
  id,
  title,
  cadence,
  plannedSessions,
  currentSession,
  endsAt,
  endedSaying,
  canRunThisCheckIn,
  isAParty,
  active,
  trailing,
  tabs: tabsOverride,
  onSelectTab,
}: {
  id: string
  title: string
  cadence?: GroundCadence | null
  plannedSessions?: number | null
  currentSession?: number | null
  endsAt?: string | null
  /** Said instead of the cadence line, once the check-in has ended. */
  endedSaying?: string | null
  canRunThisCheckIn: boolean
  isAParty: boolean
  active: string
  /**
   * U.10 PICTURE-CHECK ROUND 6, ITEM A: drawn at the right of the tab row, in the same slot the
   * prototype's own "Views ▾" sits in (not built - nothing answers what it would offer). Used by
   * the board for TheOtherBoardsYouAreIn, a real control the prototype has no equivalent slot for
   * anywhere else on the page.
   */
  trailing?: ReactNode
  /**
   * ROUND 6, ITEM I: an override for the board's own default five tabs. An entry with `to` is a
   * real link (a different route - "Board" from a ground page, say); an entry with none calls
   * `onSelectTab(key)` instead (a local `tab` state and a `?tab=` rewrite, the way GroundAdminPage
   * and GroundParticipantPage already switch tabs).
   */
  tabs?: { key: string; label: string; to?: string }[]
  onSelectTab?: (key: string) => void
}) {
  const showAsk = useAskStore((s) => s.show)

  /*
   * RELEASE WALKTHROUGH A, FIX 3: AT 375px THE ACTIVE TAB CAN SIT PAST THE RIGHT EDGE.
   * The row scrolls sideways (`overflowX: 'auto'` below) and a reader can land on a page with a
   * later tab already active - "My work", say - while the strip is still scrolled to its own
   * start, so the one tab saying where they are is off screen on a phone. `Tabs.tsx` (the other
   * tab strip this product draws) already fixes this with `scrollTo`, which is proven not to be
   * fatal in an environment with no real scrolling (jsdom's tests included); this draws its own
   * markup rather than that component (it mixes real links, a callback-driven row and a trailing
   * slot `Tabs` has no room for), so the same fix is repeated here rather than left out.
   */
  const activeTabRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null)
  useEffect(() => {
    scrollTo(activeTabRef.current, { block: 'nearest', inline: 'nearest' })
  }, [active])

  /*
   * THE CADENCE LINE, WITH ONLY THE PARTS WE HAVE. The prototype's own line names a time of day
   * ("from 4pm") this product does not keep as a fact about the ground, so that part is not
   * invented - the rhythm, the session count and the end date are.
   */
  const cadenceWords = cadence ? cadenceLabel(cadence) : null
  const spineWords = phaseSpineSentence(
    currentSession ? { startsAt: null, endsAt: endsAt ?? null, currentSession } : null,
    plannedSessions ?? null,
  )
  const cadenceLine = endedSaying ?? [cadenceWords ? `${cadenceWords}.` : null, spineWords].filter(Boolean).join(' ')

  /*
   * ground-tabs.ts ALWAYS PUSHES 'settings' ("Setup"), FOR LEAD AND PARTY ALIKE - not gated on
   * `canRunThisCheckIn`. board-as-participant.txt shows "People and setup" on a party's own board
   * too, which agrees: kept unconditional here, matching that file rather than my first guess.
   */
  const myWorkTab = canRunThisCheckIn ? 'sessions' : 'record'
  const tabs: { key: string; label: string; to?: string }[] = tabsOverride ?? [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    /* Someone who neither runs this check-in nor is in it (an admin who only reads) has no
       conversation here: the prototype's read-only view (read-only-view.txt) has three tabs. */
    ...(canRunThisCheckIn || isAParty ? [{ key: 'chat', label: 'Check-in', to: `/grounds/${id}` }] : []),
    { key: 'context', label: 'Context and resources', to: `/grounds/${id}?tab=context` },
    ...(canRunThisCheckIn || isAParty ? [{ key: myWorkTab, label: 'My work', to: `/grounds/${id}?tab=${myWorkTab}` }] : []),
    { key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` },
  ]

  return (
    <header>
      {/*
        "Check-ins / Sales team, Q3" (board-as-lead.txt). "Check-ins" is a link in the prototype -
        underlined navy - not plain grey text (picture-check round 6, item B).
      */}
      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 6 }}>
        {/* SCREEN FAULT 10: 16px tall on a phone - `.gwui-tap-40` (gw-ui.css) gives it the same
            40px floor every other tappable link on this header already has, without touching its
            size or look at any other width. */}
        <Link to="/grounds" className="gwui-tap-40" style={{ color: 'var(--gw-navy)', textDecoration: 'underline' }}>Check-ins</Link>
        {' / '}{title}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--gw-font-name)', fontSize: 30, fontWeight: 600, color: 'var(--gw-text)', margin: 0, lineHeight: 1.15 }}>
            {title}
          </h1>
          {cadenceLine && (
            <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.5, margin: '6px 0 0' }}>{cadenceLine}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {/*
            THE PROTOTYPE USES TWO DIFFERENT WORDS HERE. The lead's own board says "Your check-in"
            (board-as-lead.txt); a party's says "Start my check-in" (board-as-participant.txt). Both
            go to the same place - the same the "Check-in" tab opens.
          */}
          {/*
            GROUP 3, PIECE 2 REVIEW: THIS HEADER'S OWN ACTIONS ARE LINKS, NOT BUTTONS.
            Both only take you somewhere else - "Your check-in"/"Start my check-in" opens the
            conversation tab, "Ask" opens the Ask Groundwork panel - neither sends anything or
            changes a record, so neither earns a boxed, navy-filled control (Hafsah, 30 September:
            "no more buttons than the prototype's own version of that screen has"). This header
            draws only the session report and round report pages (every other check-in page has
            its own, separately reviewed, header), and the prototype's own report screen has no
            button here at all. The quiet link style (`.gwui-plain-link`) says the same thing a
            plain, visible link would.
          */}
          {(canRunThisCheckIn || isAParty) && (
            <Link to={`/grounds/${id}`} className="gwui-plain-link">
              {isAParty && !canRunThisCheckIn ? 'Start my check-in' : 'Your check-in'}
            </Link>
          )}
          <button type="button" onClick={showAsk} className="gwui-plain-link">
            Ask
          </button>
        </div>
      </div>

      <nav
        aria-label="This check-in"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 18, borderBottom: '1px solid var(--gw-border)', overflowX: 'auto' }}
      >
        <div style={{ display: 'flex', gap: 20 }}>
          {tabs.map((t) => {
            const isOn = t.key === active
            const tabClass = `gwui-ci-tab${isOn ? ' gwui-ci-tab-on' : ''}`
            return t.to ? (
              <Link
                key={t.key}
                ref={isOn ? (activeTabRef as React.Ref<HTMLAnchorElement>) : undefined}
                to={t.to}
                aria-current={isOn ? 'page' : undefined}
                className={tabClass}
              >
                {t.label}
              </Link>
            ) : (
              <button
                key={t.key}
                ref={isOn ? (activeTabRef as React.Ref<HTMLButtonElement>) : undefined}
                type="button"
                aria-current={isOn ? 'page' : undefined}
                onClick={() => onSelectTab?.(t.key)}
                className={tabClass}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        {trailing && <div style={{ paddingBottom: 8, flexShrink: 0 }}>{trailing}</div>}
      </nav>
    </header>
  )
}
