/**
 * THE REBUILT-PAGES LIST (design-audit.md section 4, "The order to rebuild the screens").
 *
 * Add a page's path here (relative to `client/src`, e.g. `pages/org/MembersPage.tsx`) the moment
 * it is rebuilt from `components/gw/ui` only, with no inline styles for size, colour or spacing.
 * From that moment, the-rebuilt-pages-use-only-the-new-parts.spec.ts fails the build if that file
 * ever imports one of kit.tsx's old parts, or writes one of the old CSS classes, again.
 *
 * THE INVITATION (design-audit.md section 3, "The invitation"; the invitation task) is the first
 * entry: the invite landing and the three states it hands over to when someone cannot answer
 * today - held for a seat, waiting for an admin to let them in, and a check-in out of time. Each
 * is now `Page narrow` with the small `Mark`, `PageTitle` in Literata, the standard `Button`, and
 * (where the prototype has one) `Callout`/`Panel`/`Section`/`Steps` - no `Arrival`, no `AuthCard`,
 * no old CSS class.
 *
 * PEOPLE (design-audit.md section 3, "People (the admin's list)") is the second entry: the admin's
 * list at `/org/members`, `OrgMembersPage.tsx` plus every section it is built from - the no-seat
 * warning, "Waiting to be let in", "Everyone at <organisation>" with its folded "Who reports to
 * whom", "Invite people", "Who can join" with the invite link, "Who can open a check-in", and "Help
 * your team get started".
 *
 * ONE PERSON (design-audit.md section 3, "One person (the admin's view)") is the third entry:
 * `OnePersonPage.tsx`, at `/org/members/:id`.
 */
export const REBUILT_PAGES: string[] = [
  'pages/invite/InvitePage.tsx',
  'pages/invite/InvitationExpired.tsx',
  'pages/join/WaitingForAnAdminPage.tsx',
  'pages/grounds/OutOfTime.tsx',
  'pages/org/OrgMembersPage.tsx',
  'pages/org/WaitingToBeLetIn.tsx',
  'pages/org/EveryoneHere.tsx',
  'pages/org/InvitePeople.tsx',
  'pages/org/WhoCanJoin.tsx',
  'pages/org/TheInviteLink.tsx',
  'pages/org/WhoCanOpenACheckIn.tsx',
  'pages/org/OnePersonPage.tsx',
  'pages/grounds/CheckInPeopleAndSetup.tsx',
  'pages/board/BoardPage.tsx',
  'pages/board/WorkRecords.tsx',
  'components/gw/where-each-person-is.tsx',
  'components/gw/WhatTheRecordShows.tsx',
  'components/gw/TheJudgement.tsx',
  'components/gw/WhatTheNetworkSaid.tsx',
  'components/gw/HowThisHasMoved.tsx',
  'components/gw/ResolutionPanel.tsx',
  'components/gw/TheSessionsReport.tsx',
  'components/gw/split-one-total-across-people.tsx',
  'components/gw/WhatSuccessLooksLike.tsx',
  'components/gw/TargetsBand.tsx',
  'components/gw/Suggestions.tsx',
  'components/gw/how-it-is-going.tsx',
  'components/gw/what-to-settle-together.tsx',
  'components/gw/a-second-press-before-it-is-gone.tsx',
  'components/gw/TheOtherBoardsYouAreIn.tsx',
  'pages/settings/SettingsPage.tsx',
  'pages/more/MorePage.tsx',
  'pages/connections/WhatsAppSetupPage.tsx',
  'pages/connections/ConnectionsPage.tsx',
  'pages/billing/BillingPage.tsx',
  'pages/org/IntegrationsPage.tsx',
]
