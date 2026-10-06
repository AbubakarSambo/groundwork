import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { groundsApi } from '@/api/grounds'
import { whoIsInRound } from '@/lib/who-is-in-this-round'
import { useAuthStore } from '@/stores/auth'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { TheCheckInHeader } from '@/components/gw/TheCheckInHeader'
import { checkInHeaderTabs } from '@/pages/grounds/ground-tabs'

/**
 * ONE ROUND'S REPORT, FOR SOMEBODY WHO HAS NO SESSION OF THEIR OWN ON IT.
 *
 * A lead who runs a check-in without giving an account, and an org admin looking in, both have a
 * legitimate reason to read a round and no check-in id to reach it by. Everybody else opens their
 * own session, which carries their own report above this same view.
 */
export default function RoundReportPage() {
  const { id, sessionNumber } = useParams<{ id: string; sessionNumber: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((st) => st.user)
  const n = Number(sessionNumber)
  /*
   * U.9 REVIEW FIX 6: THE SAME COUNT AS THE CHECK-IN HEADER.
   * The header on GroundAdminPage counts who is in this round with `whoIsInRound`; the session
   * report's own count can disagree with it (engine request 56). This reader has no session of
   * their own, so their only count is this one - it should still be the product's one count.
   */
  const { data: ground } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  const canRunThisCheckIn = !!user?.id && (ground as any)?.initiatorId === user.id
  const isAParty = !!(ground as any)?.viewerIsInitiator || !!(ground as any)?.participants?.some((p: any) => p.userId === user?.id)
  const contextEnabled = (ground as any)?.contextEnabled === true
  const plannedSessions = ground ? plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).plannedSessions) : null

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 20px 60px' }}>
      {/*
        U.10 PICTURE-CHECK ROUND 6, ITEM I: THE SAME SHARED HEADER EVERY CHECK-IN PAGE NOW USES.
        This page has no `phaseSpine` (that is board-specific data this read does not fetch), so
        the cadence line says the rhythm and the planned-session count but not "Session N of M" -
        nothing here is invented to fill that in. "Report" is not one of the prototype's five tabs
        (see TheCheckInHeader.tsx); kept reachable as a sixth. "← Every session" became the Report
        tab itself, since that is exactly what it opens.
      */}
      {id && (
        <TheCheckInHeader
          id={id}
          title={(ground as any)?.label ?? 'Check-in'}
          cadence={(ground as any)?.cadence ?? null}
          plannedSessions={plannedSessions}
          canRunThisCheckIn={canRunThisCheckIn}
          isAParty={isAParty}
          active="report"
          tabs={checkInHeaderTabs({ id, contextEnabled, canRunThisCheckIn, isAParty })}
        />
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate(`/grounds/${id}?tab=report`)}
          className="gwui-tap-40"
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
        >
          &larr; Every session
        </button>
        {/*
          U.9: "What everyone said, for this session. It never quotes anyone." is gone. Its second
          half is not true: what people say about their own work can be shown word for word to the
          people in the check-in (docs/decisions.md, rule 4). The report below says how many people
          checked in, as the prototype's session page does.
        */}
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Session {n}</div>
        {!!id && Number.isFinite(n) && (
          <TheSessionsReport
            groundId={id}
            sessionNumber={n}
            totalInThisRound={ground ? whoIsInRound(((ground as any).participants ?? []), n, (ground as any).scenario).length : null}
          />
        )}
      </div>
    </div>
  )
}
