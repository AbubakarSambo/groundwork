import { Button } from '@/components/gw/ui'
import { CheckInHeader } from '@/components/gw/ui/CheckInHeader'
import { theScheduleInWords } from '@/pages/board/pictured/ThePicturedSalesBoard'
import { plannedSessionsFor } from '@/lib/sessionCount'

type Any = any

/**
 * THE CHECK-IN'S OWN HEADER ON A REPORT WITH NOTHING IN IT YET (faith90-team-report.jpg, faith90-weekly-report.jpg; screens 57
 * and 58): the title, how many people and the schedule, "Your check-in", and the five tabs, as the board draws them.
 */
export function TheCheckInsOwnHeader({ groundId, ground, sessionNumber, label }: { groundId: string; ground: Any; sessionNumber?: number | null; label: string }) {
  const people = (ground?.participants ?? []).length
  const planned = plannedSessionsFor(ground?.timelineDays, ground?.cadence, ground?.plannedSessions, ground?.cadenceDays)
  const now = sessionNumber ?? null
  return (
    <CheckInHeader
      crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label }]}
      title={label}
      subtitle={[
        people ? `${people} ${people === 1 ? 'person' : 'people'}.` : null,
        theScheduleInWords(ground?.cadence, ground?.workingDays, null, ground?.cadenceAnchorDay ?? null),
        planned && now ? `${ground?.cadence === 'WEEKLY' ? 'Week' : 'Session'} ${now} of ${planned}.` : null,
      ].filter(Boolean).join(' ')}
      action={<YourCheckIn groundId={groundId} />}
      active=""
      tabs={[
        { key: 'board', label: 'Board', to: `/grounds/${groundId}/board` },
        { key: 'chat', label: 'Check-in', to: `/grounds/${groundId}` },
        { key: 'context', label: 'Context and resources', to: `/grounds/${groundId}?tab=context` },
        { key: 'sessions', label: 'My work', to: `/grounds/${groundId}?tab=sessions` },
        { key: 'settings', label: 'People and setup', to: `/grounds/${groundId}?tab=settings` },
      ]}
    />
  )
}

/** "Your check-in", the board's one primary, to the check-in's own page. */
export function YourCheckIn({ groundId }: { groundId: string }) {
  return (
    <Button kind="primary" to={`/grounds/${groundId}`}>Your check-in</Button>
  )
}
