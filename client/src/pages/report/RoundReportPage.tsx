import { TheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ThePicturedTeamReport, TheTeamReportIsNotSharedYet } from './pictured/ThePicturedTeamReport'
import { reportsApi } from '@/api/reports'
import { useQuery } from '@tanstack/react-query'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'
import { groundsApi } from '@/api/grounds'
import { isASalesKind } from '@/lib/a-sales-kind'
import { theCountOf } from '@/lib/the-one-count'
import { useAuthStore } from '@/stores/auth'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { TheCheckInHeader } from '@/components/gw/TheCheckInHeader'
import { checkInHeaderTabs } from '@/pages/grounds/ground-tabs'
import { GroundGone } from '@/components/gw/GroundGone'

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
  const [searchParams] = useSearchParams()
  const user = useAuthStore((st) => st.user)
  const n = Number(sessionNumber)
  /*
   * U.9 REVIEW FIX 6: THE SAME COUNT AS THE CHECK-IN HEADER.
   * The header on GroundAdminPage reads who is in this round from the served one count; the session
   * report's own count can disagree with it (engine request 56). This reader has no session of
   * their own, so their only count is this one - it should still be the product's one count.
   */
  const { data: ground, isError, error } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  /**
   * B-201: A STRANGER OPENING ONE SESSION'S REPORT BY ITS OWN ADDRESS READS THE SAME REFUSAL EVERY
   * OTHER GROUND PAGE DOES, NOT AN EMPTY SHELL.
   *
   * This page had no isError branch at all: a 403 (not this reader's check-in) or 404 (made-up id)
   * left `ground` undefined and rendered straight through to the header ("Check-in", no cadence)
   * over an empty "Session N" with nothing below it - `TheSessionsReport` itself answers `null` for
   * the same two statuses. The same two reasons GroundAdminPage and GroundParticipantPage already
   * read as "gone" (GW-PRI-04: one screen, whichever reason) apply here too.
   */
  /* Whether this session's team report has been shared, for a person who checks in (team-report-as-participant.jpg). */
  const { data: shaped } = useQuery({
    queryKey: ['session-shaped-report', id, n],
    queryFn: () => reportsApi.sessionReport(id!, n),
    enabled: !!id && Number.isFinite(n) && !!ground && (ground as any)?.initiatorId !== user?.id,
    retry: false,
  })
  const definitelyGone = isError && [404, 403].includes((error as any)?.response?.status)
  if (definitelyGone) return <GroundGone />

  const canRunThisCheckIn = !!user?.id && (ground as any)?.initiatorId === user.id
  const isAParty = !!(ground as any)?.viewerIsInitiator || !!(ground as any)?.participants?.some((p: any) => p.userId === user?.id)
  const contextEnabled = (ground as any)?.contextEnabled === true
  /* The direct morning (lib/the-direct-morning.tsx), from the check-in this page already reads, said once for what it draws. */
  const direct = isTheDirectMorningOn(ground)
  const plannedSessions = ground ? plannedSessionsFor((ground as any).timelineDays, (ground as any).cadence, (ground as any).plannedSessions, (ground as any)?.cadenceDays) : null

  /*
   * SCREEN MATCH, 16 OCTOBER: THE TEAM'S REPORT AS PICTURED, FOR WHOEVER RUNS THE CHECK-IN (team-report.jpg). The whole
   * report as it was stays one tap away, on "See every other part of this report" (?whole=1).
   */
  if (id && ground && canRunThisCheckIn && Number.isFinite(n) && searchParams.get('whole') !== '1') {
    return <TheDirectMorning on={direct}><ThePicturedTeamReport groundId={id} sessionNumber={n} ground={ground} /></TheDirectMorning>
  }
  if (id && ground && !canRunThisCheckIn && isAParty && shaped && (shaped as any).released === false && searchParams.get('whole') !== '1') {
    return <TheDirectMorning on={direct}><TheTeamReportIsNotSharedYet groundId={id} sessionNumber={n} ground={ground} /></TheDirectMorning>
  }

  return (
    <TheDirectMorning on={direct}>
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
          tabs={checkInHeaderTabs({ id, contextEnabled, canRunThisCheckIn, isAParty, ground: ground as any })}
        />
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate(`/grounds/${id}?tab=report`)}
          className="gwui-tap-44"
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
        >
          &larr; Every session
        </button>
        {/*
          U.9: "What everyone said, for this session. It never quotes anyone." is gone. Its second
          half is not true: what people say about their own work can be shown word for word to the
          people in the check-in (docs/decisions.md, rule 4). The report below says how many people
          checked in, as the prototype's session page does.
        */}
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Session {n}</div>
        {!!id && Number.isFinite(n) && (
          <TheSessionsReport
            groundId={id}
            sessionNumber={n}
            light={isASalesKind((ground as any)?.kindOfWork)}
            totalInThisRound={ground ? theCountOf(ground, n)?.onTheCheckIn.length ?? null : null}
          />
        )}
      </div>
    </div>
    </TheDirectMorning>
  )
}
