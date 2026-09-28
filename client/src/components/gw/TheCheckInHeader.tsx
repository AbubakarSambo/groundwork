import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { cadenceLabel } from '@/lib/cadence'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { useAskStore } from '@/stores/ask'
import type { GroundCadence } from '@/api/grounds'

/**
 * U.10 ITEM 2: THE CHECK-IN'S OWN HEADER AND TABS, THE PROTOTYPE'S SHAPE, AS ONE COMPONENT.
 *
 * The prototype (board-as-lead.jpg) draws every check-in page with the same header: a breadcrumb
 * ("Check-ins / Sales team, Q3"), the title in serif on cream, a cadence line under it, a navy
 * "Your check-in" button and an "Ask" link on the right, then a tab bar (Board / Check-in / Context
 * / My work / People and setup / "Views ▾"). The board drew none of this - it had "← Back to the
 * check-in" above a dark navy card (rgb(10,22,40)) of its own invention.
 *
 * SCOPE OF THIS PASS. This component is built to be shared by every check-in page, and is wired
 * into the board now. GroundAdminPage.tsx and GroundParticipantPage.tsx are large, heavily-tested
 * pages with their own header and tab-row already (GroundTabRow.tsx, ground-tabs.ts) - carrying
 * this component to them too is real further work, and is left undone rather than rushed into files
 * this task does not own testing time for. See the morning report and docs/requests-to-engine.md
 * for what that would need.
 *
 * TAB MAP, prototype → product's existing routes:
 *   Board             → /grounds/:id/board (this page)
 *   Check-in          → /grounds/:id (opens on the chat tab, ground-tabs.ts FIRST_TAB)
 *   Context           → /grounds/:id?tab=context
 *   My work           → /grounds/:id?tab=sessions (whoever runs it) or ?tab=record (a party) -
 *                        the two tabs ground-tabs.ts split "Sessions" (everyone's state) and
 *                        "What I shared" (your own) into, kept as they are named there
 *   People and setup  → /grounds/:id?tab=settings (labelled "Setup" there; holds access and roles)
 *   Views ▾            → NOT BUILT. Nothing in the product answers "what does this menu offer" -
 *                        no alternate board views exist yet. Left out rather than a dead button.
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
  active: 'board' | 'chat' | 'context' | 'sessions' | 'record' | 'settings'
}) {
  const showAsk = useAskStore((s) => s.show)

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

  const myWorkTab = canRunThisCheckIn ? 'sessions' : 'record'
  const tabs: { key: string; label: string; to: string }[] = [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    { key: 'chat', label: 'Check-in', to: `/grounds/${id}` },
    { key: 'context', label: 'Context', to: `/grounds/${id}?tab=context` },
    ...(canRunThisCheckIn || isAParty ? [{ key: myWorkTab, label: 'My work', to: `/grounds/${id}?tab=${myWorkTab}` }] : []),
    ...(canRunThisCheckIn ? [{ key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` }] : []),
  ]

  return (
    <header>
      {/* "Check-ins / Sales team, Q3" (board-as-lead.txt). */}
      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 6 }}>
        <Link to="/grounds" style={{ color: 'var(--gw-sub)', textDecoration: 'none' }}>Check-ins</Link>
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
          {/* Your own turn on this check-in - the same place the "Check-in" tab opens. */}
          <Link to={`/grounds/${id}`} style={{ ...linkAsBtn }}>Your check-in</Link>
          <button
            type="button"
            onClick={showAsk}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            Ask
          </button>
        </div>
      </div>

      <nav aria-label="This check-in" style={{ display: 'flex', gap: 20, marginTop: 18, borderBottom: '1px solid var(--gw-border)', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            aria-current={t.key === active ? 'page' : undefined}
            style={{
              padding: '0 0 10px', fontSize: 13.5, fontWeight: t.key === active ? 700 : 500,
              color: t.key === active ? 'var(--gw-text)' : 'var(--gw-sub)', textDecoration: 'none',
              borderBottom: t.key === active ? '2px solid var(--gw-navy)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

const linkAsBtn: CSSProperties = {
  padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white',
  fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit',
}
