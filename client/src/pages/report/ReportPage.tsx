import { useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { buildSessionRows } from '@/lib/session-rows'

/**
 * THE OLD ROUTE. KEPT AS A REDIRECT, DELETED AS A PAGE.
 *
 * This used to hold `ReportBody`, a ~1750-line component (and its inner parts - `ResolutionSection`,
 * `OutcomeFeedbackSection`, `PatternBlock`, `AreaBlock`, `HonestClose`, `WhereTheRecordIsThin`,
 * `WhatTheGroundCanTellYou`, `HiddenContributorsSection` and the rest) that no route had mounted
 * since the Report tab became a list of sessions (`TheReportIsAListOfSessions`, in
 * `GroundAdminPage.tsx` and `GroundParticipantPage.tsx`).
 *
 * Before it was deleted, every section was compared against the rebuilt Report tab and the pages it
 * opens onto (the board, the per-session report, My record, the ending page) - see
 * `docs/the-old-team-report-against-the-report-tab.md` for the table. Everything the tab lacked that
 * the server still sends to that reader was moved: the resolution flow was already live and richer
 * (`ResolutionPanel`), patterns and coaching for the lead were already live and better-gated
 * (`managerAlignment` on the board), and the probe structure was already live
 * (`WhatToProbeThemOn`). What genuinely had no live home - "did this feel fair"
 * (`OutcomeFeedback.tsx`, now on the board), downloading your own record
 * (`SessionReportPage.tsx`), the lead's weigh section's two missing fields and the soft-spots
 * cross-participant view (both now in `WhatToProbeThemOn.tsx`), the visible updates trail
 * (`UpdatesToTheRecord.tsx`, now on `SessionReportPage.tsx`), the record-shape flag for the lead
 * (`arcAdvisories`, now in `WhatToProbeThemOn.tsx`), and a real add-or-request action on a hidden
 * contributor (`HiddenContributorRow`, now on the board) - was built there, from the shared parts.
 *
 * Kept as a redirect rather than removed outright, because links to it exist in email and in
 * people's history, and a dead link to somebody's report is worse than an extra hop.
 *
 * B-222: FOR THE LEAD (AND AN ADMIN WHO MAY READ IT), THIS OPENS THE REPORT ITSELF, NOT THE LIST.
 *
 * The emails say "your report is ready" and link here. A participant arriving on this address
 * already reads their report straight away (B-203, on `GroundParticipantPage`, which this still
 * redirects to via `?tab=report`). The lead and an admin used to land on "Every session" instead,
 * one click from the report the email promised - `?tab=report` is this reader's own index of
 * sessions (`TheReportIsAListOfSessions`), not a report.
 *
 * So for whoever runs this ground (the same `viewerRunsThisGround` rule `GroundPage` routes on),
 * this fetches the ground once and finds the newest session whose report is actually READY - shared
 * with the team, the same `shared` fact `TheReportIsAListOfSessions` draws as "Shared" versus "Not
 * shared" (`isSessionShared`, session-rows.ts, mirroring the server's own
 * `isThisSessionReleased`) - and opens that session's own report page. The email says a report is
 * READY, and a session with a completed check-in but nothing released yet is still forming, not
 * ready - the lead's own My work list already draws that same session "Not shared". If nothing has
 * been released yet, this keeps today's landing, the list, which then explains why there is nothing
 * to open.
 *
 * A stranger, or anyone the server refuses, gets no special handling here - the fallback is the same
 * `?tab=report` address, which hands them on to `GroundParticipantPage`'s own fetch and its own
 * refusal (`GroundGone`, B-201), unchanged.
 */
export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  const { data: ground, isLoading, isError } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  const fallback = `/grounds/${id}?tab=report`
  if (isLoading) return null
  if (isError || !ground) return <Navigate to={fallback} replace />

  const runsIt = (ground as any).viewerRunsThisGround
    ?? ((ground as any).initiatorId === user?.id || (user?.role === 'ADMIN' && (ground as any).organizationId === user?.organizationId))
  if (!runsIt) return <Navigate to={fallback} replace />

  const rows = buildSessionRows(ground, user?.id, () => '')
  const latestReleased = rows.find(r => r.shared)?.sessionNumber
  if (!latestReleased) return <Navigate to={fallback} replace />

  return <Navigate to={`/grounds/${id}/session/${latestReleased}`} replace />
}
