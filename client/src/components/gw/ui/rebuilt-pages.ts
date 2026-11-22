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
  'pages/grounds/PeopleAndSetupAsPictured.tsx',
  'pages/grounds/YourPeopleAndSetup.tsx',
  /* Release 1B, pull request 2 of 3: References and resources, and an item's evidence on the board. */
  'pages/grounds/ReferencesAndResources.tsx',
  'components/gw/ItsEvidence.tsx',
  /* Release 1B, pull request 3 of 3: My work. */
  'pages/grounds/MyWorkPage.tsx',
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
  /* CompanyContextPage.tsx is gone (S7, 20 November 2026): company context is part of the Desk now. */
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
  'pages/suites/FinancePage.tsx',
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
  /* `SessionReportPage.tsx` was deleted in batch 2, group 5: a person's own report is drawn in My work. */
  /*
   * GROUP 3, PIECE 2 (continued): `ReportPage.tsx` came OFF this list (1 October 2026), the moment
   * its only content, `ReportBody`, was deleted - see the comment at the top of `ReportPage.tsx`
   * for where each of its sections went. What is left is a three-line redirect to the Report tab
   * with no styling of its own to guard: a page with no inline style and no kit import trivially
   * satisfies this guard and no longer needs an entry to prove it.
   */
  /*
   * GROUP 3, PIECE 3 (the check-in conversation, docs/prototype/screens/B3-the-check-in):
   * `ChatPage.tsx` and the components it draws from `components/gw/checkin` that still carried an
   * inline style or an old-kit import - `TheCheckInHeader.tsx` and `TheEndCard.tsx`. New shared
   * CSS this piece added: the `.gwui-ci-*` classes in gw-ui.css (the header, its Pause menu, the
   * banners, the footer strip, the attach menu, the two bottom sheets, the document-assessment
   * card, the end card, and the settled/declined/finished states). `TheDonePage.tsx` and
   * `SuggestedAnswers.tsx` were already built this way from U.8 and are reused unchanged;
   * `TheDonePage.tsx` keeps `StageLadder` from `kit.tsx` on purpose - see the comment at the top of
   * that file.
   */
  'pages/chat/ChatPage.tsx',
  'components/gw/checkin/TheCheckInHeader.tsx',
  'components/gw/checkin/TheEndCard.tsx',
  /* Batch 2, group 5: the end's one pop-up (TheDonePage.tsx is gone) and the line and the box under a finished conversation. */
  'components/gw/UntilTheNextOne.tsx',
  'pages/chat/TheConversationLivesInItsTab.tsx',
  /*
   * GROUP 3, PIECE 4 (starting a check-in, docs/prototype/screens/B1-starting-a-check-in):
   * `SaveCard.tsx` so far - the anonymous entry chat's own "keep this conversation" card. New
   * shared parts this piece added: `Callout`'s `title` prop (so a tinted banner can carry a bold
   * first line in any tone, not only warning) and its new `tone="info"` (blue, for an instruction
   * rather than a fact just confirmed or a warning) - see docs/the-parts-against-the-prototype.md.
   * `CreateGroundPage.tsx` and `EntryChatPage.tsx` are the rest of this piece and are not on this
   * list yet - see the morning report for why.
   */
  /*
   * GROUP 3, PIECE 4 (continued, 4d-4): `EntryChatPage.tsx` itself, the live way to start a
   * check-in at /start - done in four parts (4d-1 the frame/header/composer, 4d-2 the attach menu
   * and sheets, 4d-3 the save card, 4d-4 everything left: the "fills in as you talk" side panel's
   * own wrapper, the check-in phase's composer and bubbles, and the lead's first-check-in briefing,
   * seemingly unreachable today - see that screen's own comment). `CreateGroundPage.tsx` stays off
   * this list; its own render is unreachable (see the morning report), so rebuilding it would guard
   * dead code rather than anything a person can open.
   */
  'pages/enter/EntryChatPage.tsx',
  'pages/grounds/GroundAdminPage.tsx',
  'components/gw/ContextPage.tsx',
  /*
   * GROUP 3, PIECE 5, THE LAST PIECE (the participant's check-in page, B3-the-check-in): the
   * header, loading, no-check-in and "not in this check-in" states, rebuilt the same way
   * GroundAdminPage.tsx's own equivalent states were (`Page narrow` + `Empty` + `Button`, the
   * shared `gwui-page-shell`, `gw-bd` for the tab content column). Its four tabs were already
   * rebuilt components (`BetweenCheckIns`, `YourWork`, `SharedReportForAParty`, `ContextPage`,
   * `MyParticipation`) before this page itself joined the list. (`WhoIsInThis` was on that list too; it went with the old People
   * and setup page, 7 November 2026.)
   */
  'pages/grounds/GroundParticipantPage.tsx',
  /*
   * BOARD TASK, BATCH 3 (CLAUDE.md, Hafsah 1 October: "the board's one-off classes become shared
   * parts"): `CheckInLinks.tsx` rebuilt from `Section`/`RowList`/`Row`/`Note`, in place of
   * `kit.tsx`'s `Card`/`Row`/`Sec` and six inline styles for size, colour and spacing.
   */
  'pages/board/CheckInLinks.tsx',
  /*
   * BOARD TASK, BATCH 3, PART 2: `where-each-person-is.tsx` rebuilt from `Note`/`Stack` in place of
   * eleven one-off `gwui-fs-*`/`gwui-ink-*`/`gwui-mt-*` combinations on "the team today"'s per-person
   * caption lines (the target sentence, the "ask"/"finding" line, "what keeps coming up").
   */
  'components/gw/where-each-person-is.tsx',
  /*
   * BOARD TASK, BATCH 3, PART 2: `TheSwitchboardsSections.tsx` rebuilt from `Note`/`Stack` in place
   * of fifty-nine one-off `gwui-fs-*`/`gwui-ink-*`/`gwui-mt-*` combinations across its sentence,
   * blocker, record-history, obligation, forecast and question rows; the single section-level
   * "cannot tell you" sentence (`BusyOrMovingSection`) now uses `Section`'s own `foot` rather than
   * a one-off dashed-rule box, since it is the only trailing note here that sits under a whole
   * section rather than beside one row.
   */
  'pages/board/TheSwitchboardsSections.tsx',
  /*
   * BOARD TASK, BATCH 3, PART 2: `PatternPanel.tsx` rebuilt from `Note`/`Stack`/`Callout` in place
   * of fifteen inline styles for size, colour, border and spacing - PROTECTED (every field this
   * one pattern card draws, for exactly the readers it reaches now, stays exactly as it was): the
   * amber card is `gwui-panel-caution` (already used elsewhere for the same colours); three runs
   * of paragraphs that already shared one gap (6px) group under `Stack`; the "question you could
   * ask" box, previously a left-rule aside, is now `Callout`, at that part's own size and tint.
   */
  'components/gw/ui/PatternPanel.tsx',
  /*
   * BOARD TASK, BATCH 3, PART 2: `WhatTheRecordShows.tsx` rebuilt from `SubHeading`/`RowList`/
   * `Row`/`Note` in place of thirty-one one-off `gwui-fs-*`/`gwui-ink-*`/`gwui-mt-*`/`gwui-pt-*`/
   * `gwui-pb-*` combinations and its own local `Head`/`Line` helpers. `Callout` is not used here:
   * its own two tinted boxes ("Settle these before deciding anything", "What this cannot tell
   * you") each hold several sentences, and `Callout` draws one sentence (or a title and one body),
   * so neither box is that part's shape; both stay the inline `background`/`borderRadius` pair
   * they already used (neither prop is banned - size, colour, margin, padding and border are).
   */
  'components/gw/WhatTheRecordShows.tsx',
  /*
   * BOARD TASK, BATCH 3, PART 2: `OutcomeFeedback.tsx`'s question and its privacy sentence are now
   * one `Callout` (title and body) in place of two separately-styled one-off divs. `Choices` is not
   * used for the "It felt fair"/"It did not" pair: the file's own doc comment is explicit that
   * "neither [button is] the page's one navy button - this pair's whole point is a green and an
   * amber of equal visual weight" (the three deliberate choices carried over from the old report
   * body, unchanged) - `Choices`' own selected state is navy, which is exactly the look this pair
   * was built to avoid, and its 40px/15px sizing does not match either. Both buttons keep their
   * existing classes/inline styles (fontWeight, background, borderRadius, cursor, fontFamily -
   * none of which the guard bans).
   */
  'components/gw/OutcomeFeedback.tsx',
  /*
   * U.20 (F4-small-states): the small states and error pages, rebuilt from `Page narrow`/`Mark`/
   * `PageTitle`/`Button`/`Empty` in place of each page's own inline `fontSize`/`color`/`margin`/
   * `padding` pairs - `NotFoundPage.tsx` ("Nothing is at this address"), `PageCrash.tsx`
   * ("Something broke on this page") and `GroundGone.tsx` ("This check-in isn't available any
   * more", docs/prototype/screens/F4-small-states/c-gone-board.txt).
   */
  'pages/notfound/NotFoundPage.tsx',
  'components/gw/PageCrash.tsx',
  'components/gw/GroundGone.tsx',
]
