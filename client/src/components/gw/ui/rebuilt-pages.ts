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
 *
 * GROUP 2, PIECE 3 (D2-company, docs/prototype/screens/D2-company): the Company page and company
 * context. See the comment near the end of this list for what it added.
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
  /*
   * GROUP 2's FIRST PIECE (C1-today-and-check-ins, docs/prototype/screens/C1-today-and-check-ins):
   * Today, the check-ins list, and the two page-local pieces they both draw ("You are in." and the
   * admin's welcome card/checklist). New shared parts this piece added: `Greeting`, `ComingUp`,
   * `CheckInsTable`/`CheckInRow`, and `Callout`'s `tone="success"` - see
   * docs/the-parts-against-the-prototype.md.
   */
  'pages/today/TodayPage.tsx',
  'pages/today/YouAreIn.tsx',
  'pages/grounds/GroundsListPage.tsx',
  'pages/grounds/an-admin-lands-on-a-check-in-list.tsx',
  /*
   * GROUP 2, PIECE 2 (C2-the-you-board, docs/prototype/screens/C2-the-you-board): the You board.
   * New shared parts this piece added: `Panel`'s own `as="section"`/`heading` (a titled card that
   * is a landmark, in place of the page's own `Card`) and `RowList`/`Row` (the page's four plain
   * row-lists) - see docs/the-parts-against-the-prototype.md.
   */
  'pages/you/YouPage.tsx',
  /*
   * GROUP 2, PIECE 3 (D2-company, docs/prototype/screens/D2-company): the Company page and company
   * context. New shared parts this piece added: `.gwui-priority-top`, `.gwui-team-col` and
   * `.gwui-compare-table` in `gw-ui.css` - see docs/the-parts-against-the-prototype.md.
   */
  'pages/company/CompanyPage.tsx',
  'pages/company/CompanyContextPage.tsx',
  /*
   * GROUP 2, PIECE 4 (E-suites, docs/prototype/screens/E-suites): the Suites page and each suite's
   * board. New shared parts this piece added: `.gwui-suite-head`/`.gwui-suite-switch`,
   * `.gwui-suite-ask`/`.gwui-suite-q` and `.gwui-record-table` in `gw-ui.css` - see
   * docs/the-parts-against-the-prototype.md.
   */
  'pages/suites/SuitesPage.tsx',
  'pages/suites/OnboardingBoardPage.tsx',
  'pages/suites/LeaveBoardPage.tsx',
  'pages/suites/TimeSheetsPage.tsx',
  'pages/suites/ReviewsBoardPage.tsx',
  'pages/suites/ReviewPage.tsx',
  'pages/suites/LeavingBoardPage.tsx',
  'pages/suites/RoleMapPage.tsx',
  'pages/suites/SpendingPage.tsx',
  'pages/suites/TodosPage.tsx',
  'pages/suites/CustomersPage.tsx',
  'pages/suites/EquipmentPage.tsx',
  /*
   * GROUP 3's FIRST PIECE (signing in and joining, docs/prototype/screens/A2-accounts-and-signing-in
   * and A3-organisations-and-joining): the sign-in family and the broadcast join landing. New shared
   * parts this piece added: `PasswordField` (the "Show"/"Hide" box every password screen needs),
   * `SplitPage`/`SplitPanelLine`/`SplitPanelList` (the sign-in screen's own two-column layout, the
   * only A2 screen drawn that way), `Callout`'s `tone="warning"`, and `PageTitle`'s `subtitle`
   * widened to take a sentence with a bold address in it, not only a plain string - see
   * docs/the-parts-against-the-prototype.md. `auth-kit.tsx` keeps every other auth page's import
   * (`AuthCard`, `AuthField`, `AuthError`, and the rest) unchanged, so `LinkExpired.tsx`,
   * `EmailConfirmed.tsx`, `LinkSentPanel.tsx`, `GoogleFailedPage.tsx`, `SignOutPage.tsx` and
   * `ChoosePasswordPage.tsx` draw the new parts too without being rewritten from nothing.
   */
  'pages/auth/auth-kit.tsx',
  'pages/auth/AuthPage.tsx',
  'pages/auth/MagicVerifyPage.tsx',
  'pages/join/JoinPage.tsx',
  /*
   * GROUP 3, PIECE 2 (the reports, docs/prototype/screens/B4-reports-and-sharing):
   * `SessionReportPage.tsx`, the live per-session report page (`/checkin/:checkInId/report`).
   * `ReportPage.tsx`'s default export is a three-line redirect to the Report tab and draws
   * nothing itself; the page's own chrome now draws `Page`/`Panel`/`Button` from the shared kit,
   * with every button reduced to the page's one true primary action ("Start a new check-in") -
   * see docs/the-parts-against-the-prototype.md for what this piece found and added.
   */
  'pages/report/SessionReportPage.tsx',
  /*
   * GROUP 3, PIECE 2 (continued): `ReportPage.tsx` came OFF this list (1 October 2026), the moment
   * its only content, `ReportBody`, was deleted - see the comment at the top of `ReportPage.tsx`
   * for where each of its sections went. What is left is a three-line redirect to the Report tab
   * with no styling of its own to guard: a page with no inline style and no kit import trivially
   * satisfies this guard and no longer needs an entry to prove it.
   */
]
