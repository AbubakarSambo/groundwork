/**
 * HOW MANY TIMES EACH FILE USES A ONE-OFF STYLE CLASS, FROZEN ON 2 OCTOBER 2026.
 *
 * The one-off classes may not be added to (one-off-style-classes.ts), but builders kept reusing the
 * old ones in new places. This count may only go down: a file that uses one more fails the guard.
 * When a file's count falls, lower it here. Files not listed here use none, and must keep it so.
 */
export const ONE_OFF_USES_PER_FILE: Record<string, number> = {
  'components/gw/ContextPage.tsx': 34,
  'components/gw/HowThisHasMoved.tsx': 20,
  'components/gw/OutcomeFeedback.tsx': 29,
  'components/gw/ResolutionPanel.tsx': 64,
  'components/gw/Suggestions.tsx': 46,
  'components/gw/TargetsBand.tsx': 52,
  'components/gw/TheJudgement.tsx': 30,
  'components/gw/UpdatesToTheRecord.tsx': 19,
  'components/gw/WhatSuccessLooksLike.tsx': 38,
  'components/gw/WhatTheNetworkSaid.tsx': 30,
  'components/gw/WhatTheRecordShows.tsx': 17,
  'components/gw/WhatToProbeThemOn.tsx': 1,
  'components/gw/WhatToWalkInWith.tsx': 15,
  'components/gw/split-one-total-across-people.tsx': 53,
  'components/gw/two-accounts-side-by-side.tsx': 29,
  'components/gw/ui/PageTitle.tsx': 10,
  'components/gw/ui/PatternPanel.tsx': 13,
  'components/gw/where-each-person-is.tsx': 4,
  'components/gw/where-to-focus.tsx': 26,
  'pages/board/BoardPage.tsx': 584,
  'pages/board/TheSwitchboardsSections.tsx': 32,
  'pages/board/WorkRecords.tsx': 70,
  'pages/company/CompanyContextPage.tsx': 1,
  'pages/company/CompanyPage.tsx': 2,
  'pages/grounds/GroundParticipantPage.tsx': 1,
  'pages/invite/InvitePage.tsx': 2,
  'pages/join/WaitingForAnAdminPage.tsx': 2,
  'pages/suites/OnboardingBoardPage.tsx': 2,
  'pages/you/YouPage.tsx': 3,
}
