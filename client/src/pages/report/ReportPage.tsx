import { useParams, Navigate } from 'react-router-dom'

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
 */
export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/grounds/${id}?tab=report`} replace />
}
