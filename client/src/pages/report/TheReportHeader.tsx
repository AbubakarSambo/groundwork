import { Link } from 'react-router-dom'
import { CheckInHeader } from '@/components/gw/ui/CheckInHeader'
import { checkInHeaderTabs } from '@/pages/grounds/ground-tabs'
import { theRhythmInFull } from '@/lib/the-closing-after-your-first-check-in'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { useAskStore } from '@/stores/ask'
import type { GroundCadence } from '@/api/grounds'

/**
 * THE HEADER OF A SESSION'S REPORT PAGE: the one shared check-in header (CheckInHeader) with this page's own subtitle and doors.
 * It replaces the old TheCheckInHeader, which drew its own crumbs, title, tabs and gaps in inline styles (docs/spacing-audit-15-nov.md).
 *
 * The subtitle says the rhythm and the planned number of sessions, with only the parts this page knows. The lead gets "Your check-in";
 * a person who is only in the check-in has the Check-in tab one row down, so a second link of the same name would lead to the place
 * they were standing (audit of the check-in pages, row 3). Everybody gets "Ask". Someone who neither runs it nor is in it (an admin
 * who only reads) has no Check-in or My work tab (read-only-view.txt).
 */
export function TheReportHeader({
  id, title, cadence, cadenceDays, workingDays, cadenceAnchorDay, plannedSessions, canRunThisCheckIn, isAParty, active,
}: {
  id: string
  title: string
  cadence?: GroundCadence | null
  cadenceDays?: number[] | null
  workingDays?: number[] | null
  cadenceAnchorDay?: number | null
  plannedSessions?: number | null
  canRunThisCheckIn: boolean
  isAParty: boolean
  active: string
}) {
  const showAsk = useAskStore((s) => s.show)
  const rhythm = cadence ? theRhythmInFull({ cadence, cadenceDays, workingDays, cadenceAnchorDay }, { stop: false }) : null
  const subtitle = [rhythm ? `${rhythm}.` : null, phaseSpineSentence(null, plannedSessions ?? null)].filter(Boolean).join(' ') || undefined
  return (
    <CheckInHeader
      crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: title }]}
      title={title}
      subtitle={subtitle}
      action={(
        <div className="gwui-button-row">
          {canRunThisCheckIn && <Link to={`/grounds/${id}`} className="gwui-plain-link">Your check-in</Link>}
          <button type="button" onClick={showAsk} className="gwui-plain-link">Ask</button>
        </div>
      )}
      active={active}
      tabs={checkInHeaderTabs({ id, canRunThisCheckIn, isAParty })}
    />
  )
}
