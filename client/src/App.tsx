import { useEffect, useState } from 'react'
import { PageCrash } from '@/components/gw/PageCrash'
import EveryReportSideBySide from '@/pages/preview/EveryReportSideBySide'
import { Release4Boards } from '@/pages/preview/Release4Boards'
import PartsSamplePage from '@/pages/dev/PartsSamplePage'
import ConversationPreviewPage from '@/pages/dev/ConversationPreviewPage'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { MARKETING_URL, MARKETING_URL_WAS_CONFIGURED, thisIsTheProductionApp } from '@/lib/marketing'
import { useSessionTimeout } from '@/lib/useSessionTimeout'
import { useWhoTheServerSaysYouAre } from '@/lib/who-the-server-says-you-are'
import { AuthPage } from '@/pages/auth/AuthPage'
import { SignOutPage } from '@/pages/auth/SignOutPage'
import { MagicVerifyPage } from '@/pages/auth/MagicVerifyPage'
import { GoogleCallbackPage } from '@/pages/auth/GoogleCallbackPage'
import { ChoosePasswordPage } from '@/pages/auth/ChoosePasswordPage'
import { GoogleFailedPage } from '@/pages/auth/GoogleFailedPage'
import { EntryChatPage } from '@/pages/enter/EntryChatPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import SessionReportPage from '@/pages/report/SessionReportPage'
import RoundReportPage from '@/pages/report/RoundReportPage'

/** Old address for a check-in. Keeps working, lands on the one canonical route. */

/** A redirect that carries the query string with it. See the /login route. */
function KeepTheQuery({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

function ChatRedirect() {
  const { checkInId } = useParams()
  return <Navigate to={`/checkin/${checkInId}`} replace />
}

/**
 * `/start/team` KEEPS WORKING, DECISION 114 (docs/decisions-merged.md). Links already sent (on
 * WhatsApp, LinkedIn, email) still carry people here; this just redirects into the ordinary entry
 * chat with the anchor's own scenario key, keeping whatever else was on the address (a `?source=`
 * mark, say) - `/start/team?x=1` lands on `/start?scenario=HELP_TEAM_UNDERSTAND&x=1`. A `scenario`
 * already on the address is replaced: this door only ever means the one scenario.
 */
export function AnchorTeamRedirect() {
  const { search, hash } = useLocation()
  const rest = new URLSearchParams(search)
  rest.delete('scenario')
  const query = new URLSearchParams()
  query.set('scenario', 'HELP_TEAM_UNDERSTAND')
  for (const [key, value] of rest) query.append(key, value)
  return <Navigate to={`/start?${query.toString()}${hash}`} replace />
}
import { GroundsListPage } from '@/pages/grounds/GroundsListPage'
import { TodayPage } from '@/pages/today/TodayPage'
import { YouPage } from '@/pages/you/YouPage'
import { CompanyPage } from '@/pages/company/CompanyPage'
import { CompanyContextPage } from '@/pages/company/CompanyContextPage'
import { SuitesPage } from '@/pages/suites/SuitesPage'
import { OnboardingBoardPage } from '@/pages/suites/OnboardingBoardPage'
import { LeaveBoardPage } from '@/pages/suites/LeaveBoardPage'
import { QueuePage } from '@/pages/suites/QueuePage'
import { YourRequestsPage } from '@/pages/suites/YourRequestsPage'
import { LeaveRequestNewPage } from '@/pages/suites/LeaveRequestNewPage'
import { SpendRequestNewPage } from '@/pages/suites/SpendRequestNewPage'
import { TimeSheetsPage } from '@/pages/suites/TimeSheetsPage'
import { ReviewsBoardPage } from '@/pages/suites/ReviewsBoardPage'
import { ReviewPage } from '@/pages/suites/ReviewPage'
import { LeavingBoardPage } from '@/pages/suites/LeavingBoardPage'
import { RoleMapPage } from '@/pages/suites/RoleMapPage'
import { SpendingPage } from '@/pages/suites/SpendingPage'
import { FinancePage } from '@/pages/suites/FinancePage'
import { TodosPage } from '@/pages/suites/TodosPage'
import { CustomersPage } from '@/pages/suites/CustomersPage'
import { EquipmentPage } from '@/pages/suites/EquipmentPage'
import { DirectionPage } from '@/pages/direction/DirectionPage'
import { PolicyBoardPage } from '@/pages/policy/PolicyBoardPage'
import { SetUpFromYourDocumentsPage } from '@/pages/policy/SetUpFromYourDocumentsPage'
import { TemplatesPage } from '@/pages/templates/TemplatesPage'
import { AskPage } from '@/pages/ask/AskPage'
import { GroundParticipantPage } from '@/pages/grounds/GroundParticipantPage'
import { GroundPage } from '@/pages/grounds/GroundPage'
import { ReportPage } from '@/pages/report/ReportPage'
import WeeklyReportPage from '@/pages/report/WeeklyReportPage'
import { ThePersonPage } from '@/pages/board/ThePersonPage'
import { WhereTheBlockerStarted } from '@/pages/board/WhereTheBlockerStarted'
import { BoardPage } from '@/pages/board/BoardPage'
import EndingPage from '@/pages/grounds/EndingPage'
import { TeamBoardsPage } from '@/pages/boards/TeamBoardsPage'
import { BillingPage } from '@/pages/billing/BillingPage'
import { PricingPage } from '@/pages/billing/PricingPage'
import { PaymentPage } from '@/pages/billing/PaymentPage'
import { BillingCallbackPage } from '@/pages/billing/BillingCallbackPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { JoinPage } from '@/pages/join/JoinPage'
import { AnswerFirstPage } from '@/pages/join/AnswerFirstPage'
import { JoinConfirmPage } from '@/pages/join/JoinConfirmPage'
import OpsBoardPage from '@/pages/ops/OpsBoardPage'
import OpsTargetCompaniesPage from '@/pages/ops/OpsTargetCompaniesPage'
import OpsCompanyPage from '@/pages/ops/OpsCompanyPage'
import OpsPeoplePage from '@/pages/ops/OpsPeoplePage'
import OpsMoatPage from '@/pages/ops/OpsMoatPage'
import OpsOverviewPage from '@/pages/ops/OpsOverviewPage'
import {
  OpsContributionPage,
  OpsPositioningPage,
  OpsAttributionPage,
  OpsCommercialPipelinePage,
} from '@/pages/ops/OpsContributionPages'
import { OpsLayout } from '@/pages/ops/OpsLayout'
import { RequireBackOffice } from '@/pages/ops/TheBackOfficeHasADoor'
import { OpsWhatWeArePage } from '@/pages/ops/OpsWhatWeArePage'
import { OpsEverybodyPage } from '@/pages/ops/OpsEverybodyPage'
import { OpsResourcesPage } from '@/pages/ops/OpsResourcesPage'
import { OpsWorkplanPage } from '@/pages/ops/OpsWorkplanPage'
import { ApiAccessPage } from '@/pages/admin/ApiAccessPage'
import { WhatsAppSettingsPage } from '@/pages/admin/WhatsAppSettingsPage'
import { OpsDeploymentPage, OpsMarketingPage } from '@/pages/ops/OpsSellingPages'
import { OpsRoadmapPage, OpsReadinessPage, OpsTechPage, OpsUXPage } from '@/pages/ops/OpsBuildingPages'
import {
  OpsQuarterPage,
  OpsRequestsPage,
  OpsDecisionsPage,
  OpsCommitmentsPage,
  OpsApprovalsPage,
  OpsSpendPage,
  OpsFundraisePage,
  OpsStrategyPage,
  OpsIntegrationPage,
} from '@/pages/ops/OpsCompanyPages'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { PromptTestPage } from '@/pages/prompts/PromptTestPage'
import { IntegrationsPage } from '@/pages/org/IntegrationsPage'
import { ConnectionsPage } from '@/pages/connections/ConnectionsPage'
import { WhatsAppSetupPage } from '@/pages/connections/WhatsAppSetupPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { MorePage } from '@/pages/more/MorePage'
import { ADoorYouCannotOpen } from '@/components/gw/a-door-you-cannot-open-says-so'
import { OrgMembersPage } from '@/pages/org/OrgMembersPage'
import { OnePersonPage } from '@/pages/org/OnePersonPage'
import { LeadsGuidePage } from '@/pages/org/LeadsGuidePage'
import { OrgNewPage } from '@/pages/org/OrgNewPage'
import { OrgsPage } from '@/pages/org/OrgsPage'
import { WelcomePage } from '@/pages/org/WelcomePage'
import { JoinByLinkPage } from '@/pages/join/JoinByLinkPage'
import { StopRemindersPage } from '@/pages/mail/StopRemindersPage'
import { WaitingForAnAdminPage } from '@/pages/join/WaitingForAnAdminPage'
import { useYourOrganisations } from '@/components/gw/your-organisations'
import { takeJustSignedIn, stillToChoose } from '@/lib/choose-an-organisation'
import { authApi } from '@/api/auth'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'
import { StopMailPage } from '@/pages/mail/StopMailPage'
import { HelpModal } from '@/components/gw/HelpModal'
import { OfflineNote } from '@/components/gw/OfflineNote'
import { AppShell } from '@/components/gw/AppShell'
import { TalkToUsPage } from '@/pages/talk/TalkToUsPage'
import type { JSX } from 'react'

// Shared so code outside the React tree can invalidate too - see lib/queryClient.
const qc = queryClient

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    // B-221: THE HASH RIDES ALONG TOO, so a link to a section of the page you land on - the
    // "yours to keep" email's `/settings#your-data` - still opens there once you are signed in,
    // rather than at the top of the page with no sign anything was asked for.
    const dest = window.location.pathname + window.location.search + window.location.hash
    // `next`, NOT `from`: AuthPage has only ever read `next`, so every person who was
    // sent here from a protected page lost their destination and landed on the grounds
    // list. Two spellings of one idea, and the one the redirects used was the dead one.
    // W8-70.
    return <Navigate to={`/auth?next=${encodeURIComponent(dest)}`} replace />
  }
  return children
}

// A non-platform-admin who reaches /admin today sees the page mount and
// render its own "you are not an admin" denial message - the panel's
// existence and shape are visible before the denial fires. Redirect at the
// route level instead, so a non-admin never sees the admin page at all.
function RequirePlatformAdmin({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isPlatformAdmin = useAuthStore(s => s.user?.isPlatformAdmin)
  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search + window.location.hash
    // `next`, NOT `from`: AuthPage has only ever read `next`, so every person who was
    // sent here from a protected page lost their destination and landed on the grounds
    // list. Two spellings of one idea, and the one the redirects used was the dead one.
    // W8-70.
    return <Navigate to={`/auth?next=${encodeURIComponent(dest)}`} replace />
  }
  /*
   * A SILENT REDIRECT READS AS A BUG, NOT AS A REFUSAL.
   *
   * This was `<Navigate to="/grounds" replace />`: an admin in a customer organisation who opened
   * one of these addresses was moved to their check-in list with nothing said. From the outside
   * that is a link that does not work, and the natural response is to try it again.
   *
   * Say who the area is for and leave them somewhere to go, which is what every other refusal in
   * this product now does.
   */
  if (!isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em', color: 'var(--gw-text)' }}>
            This part is for Groundwork staff
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 18 }}>
            It is not part of your organisation's admin, and there is nothing here that affects your
            check-ins. Being an admin in your own organisation does not include it.
          </div>
          <Link className="btn pri"
            to="/grounds"
          >Go to my check-ins</Link>
        </div>
      </div>
    )
  }
  /* The platform console is a back office too: a code to the email once a week, unless Google. */
  return <RequireBackOffice>{children}</RequireBackOffice>
}

/** An org created before it has a contact email can't run check-ins yet - only the admin who
 * created it can fix that, so only ADMIN is gated here. `subscriptionPlan` is deliberately NOT
 * part of this check: staying on the free tier means it is null forever - that's the free tier,
 * not an unfinished step - and /pricing has no "confirm free" action to ever set it.
 *
 * THE RULE ITSELF NOW LIVES ON THE SERVER, as `mustSetUpOrganisation`. It read
 * `role === 'ADMIN' && !organization.email` here, which sent anyone invited into another
 * company's check-in to "Set up your organization" - they administer their own untouched
 * workspace, so both halves were true and neither was the point. The server adds the missing
 * clause (do they belong anywhere else) and answers in one field.
 *
 * Falls back to the old reading only when the field is absent - a `user` persisted by an older
 * build, before the next `/auth/me` refreshes it. */

/* The two doors. Each reads the one field that decides it, and nothing else. */
function MayOpenCheckIns({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return <ADoorYouCannotOpen may={user?.mayOpenCheckIns !== false} what="open a check-in">{children}</ADoorYouCannotOpen>
}

function AdminsOnly({ children, what = 'add people to your organisation' }: { children: React.ReactNode; what?: 'add people to your organisation' | 'connect your systems' | 'connect your organisation’s WhatsApp number' | 'open People' }) {
  const { user } = useAuthStore()
  return <ADoorYouCannotOpen may={user?.role === 'ADMIN'} what={what}>{children}</ADoorYouCannotOpen>
}

/**
 * THE WALL IN FRONT OF THE WHOLE PRODUCT CAME DOWN (fix plan F6). This redirected every admin to
 * /org/setup until Organization.email was filled in - a second address, in front of everything,
 * for a column nothing ever mails and that only Stripe reads, at checkout, where it can be asked
 * for. The name stays because eleven routes wrap it and it also does the signed-in check; what it
 * requires now is exactly what RequireAuth requires. /org/setup is still reachable from settings.
 *
 * B-202: AND NOBODY STILL WAITING TO BE LET IN EVER SEES WHAT IS BEHIND THIS WALL.
 *
 * An outsider added to a check-in, who sets a password (or signs in later) before an admin lets
 * them in, used to reach Today here and read "Nothing needs you right now" - true in the sense
 * that nothing here is theirs to open yet, and false in what it implies: that nothing is stopping
 * them. `/users/me/waiting` is the same read `WaitingForAnAdminPage` already makes of its own
 * membership. Checked HERE, rather than only where `HomeOrChooseAnOrganisation` lands (the root
 * and `/grounds`), because every one of the eleven routes this wraps is reachable directly - a
 * bookmark, an old link, the server's own `next=/today` - and a wall that only stops some doors
 * is not a wall. Nobody waiting ever renders what is behind any of them; they are sent to "Almost
 * in" (`/join/waiting`) every time, until they are let in.
 */
export function RequireOrgSetup({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const waiting = useQuery({ queryKey: ['my-waiting'], queryFn: authApi.myWaiting, enabled: isAuthenticated, retry: false })
  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search + window.location.hash
    return <Navigate to={`/auth?next=${encodeURIComponent(dest)}`} replace />
  }
  /**
   * B-202 (review round 2), TWO FAULTS IN THE SAME WALL.
   *
   * (a) NOBODY IS SHOWN THE PAGE BEHIND THIS WALL WHILE IT IS STILL DECIDING.
   *
   * `children` used to render while this very `my-waiting` read was still in flight, so a person
   * waiting to be let in briefly saw Today's "Nothing needs you right now", Ask, or a board - and
   * the page under them fired its own requests (/today, /grounds, /ask, /you, /company,
   * /users/colleagues, the board) before the redirect below ever caught up. Nothing renders, and
   * nothing is asked for, until the first answer is in. A failed read lets the person through
   * rather than locking everyone out of the whole product because one read failed - the safer
   * failure here is showing the app, not an endless blank wall.
   *
   * (b) A CACHED "WAITING: TRUE" IS NEVER TRUSTED WITHOUT ASKING AGAIN.
   *
   * `WaitingForAnAdminPage` reads this exact same `['my-waiting']` key, so once somebody has been
   * stuck on "Almost in", the cache holds `waiting: true` - and this component used to act on that
   * cached answer the instant it was read, even though React Query (staleTime 0, the default) was
   * at that very moment already re-fetching it in the background. An admin letting them in a moment
   * later changed nothing on screen: the stale `true` sent them straight back to "Almost in" on
   * every navigation, before the fresh answer ever arrived. So a cached `waiting: true` is acted on
   * only once `isFetching` says the read for THIS mount has actually settled - never off a value
   * that might be the one that got them stuck here in the first place.
   */
  if (waiting.isLoading) return null
  if (!waiting.isError && waiting.data?.waiting === true) {
    if (waiting.isFetching) return null
    return <Navigate to="/join/waiting" replace />
  }
  return children
}

/**
 * WHAT THE ROOT SHOWS WHEN THERE IS NO MARKETING SITE TO SEND SOMEBODY TO.
 *
 * Deliberately not a copy of the marketing page. It is the two things somebody at the root of a
 * non-production build actually wants - sign in, or start a check-in without an account - plus the
 * one sentence that stops them mistaking it for the live product.
 */
function AFrontDoorOfItsOwn() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: 'var(--gw-navy)', marginBottom: 12 }}>
          GROUNDWORK
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-text)', margin: '0 0 8px', letterSpacing: '-.02em' }}>
          This is not the live site.
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--gw-sub)', lineHeight: 1.7, margin: '0 0 18px' }}>
          It is a test build of the product, with its own database. A sign-in from the live site does
          not work here.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn pri"
            href="/start"
          >
            Start a check-in
          </a>
          <a className="btn sec"
            href="/auth"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}

function RootRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    /**
     * ONE ANSWER TO "WHERE IS HOME", SHARED WITH THE LOGO. W15-4.
     *
     * This read `import.meta.env.VITE_MARKETING_URL` directly and fell through to `/start` whenever
     * it was unset or empty - so a stranger handed a bare app link landed in the entry chat, while
     * the logo in the corner of that same chat went to the marketing site. Two components disagreeing
     * about where home is, for the same person, on the same screen.
     *
     * `MARKETING_URL` is that decision in one place, with the real domain as its default rather than
     * nothing. Same module the logo uses, so they cannot drift apart again. Its `||` (not `??`) is
     * deliberate and load-bearing: an env var set to an empty string is the case that produced a
     * `href=""` logo, which looked like a working link and reloaded the page.
     */
    /**
     * AND NOT ACROSS ENVIRONMENTS.
     *
     * `MARKETING_URL` defaults to the production domain when nothing sets it, and nothing sets it on
     * staging - there is no staging marketing site to set it to. So the root of staging threw people
     * onto the LIVE site, where they would sign in against production data believing they were
     * testing. Reported as "staging.myground.work is a blank white page": the white was this
     * component drawing nothing, and the part after the white was worse than the white.
     *
     * A build that has not been told where its own marketing site is does not guess. It shows its own
     * front door instead - sign in, or start a check-in, which is the whole product from a standing
     * start - and says plainly that it is not the live site.
     */
    if (!MARKETING_URL_WAS_CONFIGURED && !thisIsTheProductionApp()) {
      return <AFrontDoorOfItsOwn />
    }
    window.location.replace(MARKETING_URL)
    /*
     * NOT `null`, WHICH IS A WHITE PAGE.
     *
     * Reported as "staging.myground.work is a blank white page", and that is exactly what this is:
     * a redirect is asked for and nothing is drawn while it happens. When it is quick nobody sees
     * this; when the destination is slow, blocked by an extension, or offline, the whole product is
     * a blank screen with no explanation and no way forward. A person cannot tell that apart from
     * something being broken - and on staging it is worse, because the destination is a DIFFERENT
     * SITE and they may not have meant to leave.
     *
     * So it says where it is going and gives a link that works without JavaScript finishing.
     */
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 380, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: 'var(--gw-navy)', marginBottom: 10 }}>
            GROUNDWORK
          </div>
          <p style={{ fontSize: 14.5, color: 'var(--gw-sub)', lineHeight: 1.7, margin: '0 0 12px' }}>
            Taking you to <strong>{MARKETING_URL.replace(/^https?:\/\//, '')}</strong>. If nothing
            happens, follow the link.
          </p>
          <p style={{ margin: 0 }}>
            <a href={MARKETING_URL} style={{ color: 'var(--gw-navy)', fontSize: 14.5 }}>Continue →</a>
            {' · '}
            {/* The way back into the product itself, for somebody who landed here and wanted to
                sign in rather than read about it. */}
            <a href="/auth" style={{ color: 'var(--gw-sub)', fontSize: 14.5 }}>Sign in</a>
          </p>
        </div>
      </div>
    )
  }
  /**
   * Signed in, the root is Today (C1, U.5), as in the prototype, where home is #/today. It was the
   * check-ins list until Today existed. Worth stating rather than leaving as an unlabelled
   * fall-through, because the signed-out branch above returns early and it is easy to read this as
   * unreachable.
   */
  return <HomeOrChooseAnOrganisation home="today" />
}

/**
 * THE FIRST STOP RIGHT AFTER SIGNING IN (A3, U.3). Once: the flag is cleared as it is read.
 *
 *   - Somebody who belongs nowhere yet, whose confirmed email domain an organisation lets join, is
 *     offered it first, on "Where do you work?" (#/welcome). Never somebody who was invited: they
 *     already belong to the organisation that invited them (U.4 review).
 *   - Otherwise somebody in two or more organisations is asked which to open (#/orgs).
 *   - Everybody else lands on Today (C1, U.5), as in the prototype. After that, the check-ins list is
 *     at its own address, and the root is Today.
 */
export function HomeOrChooseAnOrganisation({ home = 'list' }: { home?: 'today' | 'list' }) {
  const { search } = useLocation()
  const { myOrgs, loaded } = useYourOrganisations()
  const [justIn] = useState(() => stillToChoose())
  const offers = useQuery({ queryKey: ['where-can-i-join'], queryFn: authApi.whereCanIJoin, enabled: justIn, retry: false })
  const [go, setGo] = useState<'welcome' | 'orgs' | 'stay' | null>(null)
  useEffect(() => {
    if (go !== null || !loaded) return
    if (justIn && !offers.isFetched) return
    takeJustSignedIn()
    if (!justIn) { setGo('stay'); return }
    /* Only for somebody who belongs nowhere yet (U.4 review): an invited person already belongs to the
       organisation that invited them, and goes where the invitation leads. */
    if ((offers.data?.byDomain?.length ?? 0) > 0 && offers.data?.nowhereYet === true) setGo('welcome')
    else if (myOrgs.length >= 2) setGo('orgs')
    else setGo('stay')
  }, [go, loaded, justIn, offers.isFetched, offers.data, myOrgs.length])
  if (go === 'welcome') return <Navigate to="/welcome" replace />
  if (go === 'orgs') return <Navigate to="/orgs" replace />
  if (!justIn) return home === 'today' ? <Navigate to={`/today${search}`} replace /> : <GroundsListPage />
  /* Just signed in, and still finding out whether to offer an organisation first. Said, not blank. */
  if (go === null) return <p className="gw-t-body" style={{ padding: 32, color: 'var(--gw-sub)' }}>Loading…</p>
  return <Navigate to={`/today${search}`} replace />
}

function SessionGuard({ children }: { children: React.ReactNode }) {
  useSessionTimeout()
  /* The stored user is a copy from sign-in day; ask the server what is true now. */
  useWhoTheServerSaysYouAre()
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <SessionGuard>
          {/* First in the document, so it is the first thing a keyboard reaches. It was inside the
              shell, behind the help button, which made it the second stop and therefore useless. */}
          <a href="#main" className="gw-skip">Skip to content</a>
          {/* B-042: a toast fired the moment a page loads (for example, a suite that is switched
              off) used to sit right over the page's own heading and subtitle - the two-line
              subtitles on Time sheets, Onboarding, Leaving, Roles, To-dos and Customers and deals
              were the ones long enough for the default 24px/16px offset to reach into. 150px (170
              on a phone, where the toast also spans the full width and the subtitle can wrap to
              three lines) clears every page's own heading and subtitle before a toast begins,
              without moving the toast off the screen on any page. */}
          <Toaster position="top-right" richColors offset={{ top: 150 }} mobileOffset={{ top: 170 }} />
          <HelpModal />
          {/* B-113: the connection drops while the app is already open. The service worker
              (public/sw.js) covers a fresh navigation that cannot reach the server at all; this
              covers staying on a page that is already open. */}
          <OfflineNote />
          {/* A render error in one page used to blank the entire app. W8-63. Outside the shell, so
              the crash card takes the whole window (crash.jpg) and a broken sidebar is caught too. */}
          <PageCrash>
          <AppShell>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRoute />} />
            {/*
              * THE QUERY STRING SURVIVES THIS REDIRECT NOW.
              *
              * `<Navigate to="/auth">` drops it, and the Google callback's failure path sent people
              * to `/login?error=...`. The reason was thrown away in the hop, so a failed Google
              * sign-in put somebody back on an ordinary sign-in form with nothing said - which
              * reads as the button having done nothing at all.
              */}
            <Route path="/login" element={<KeepTheQuery to="/auth" />} />
            <Route path="/auth" element={<AuthPage />} />
            {/* The link-sent state of /auth, not a page of its own. W8-49. */}
            <Route path="/auth/sent" element={<AuthPage />} />
            {/* An address that means "end my session", so a plain link can offer it. W15-2. */}
            <Route path="/signout" element={<SignOutPage />} />
            <Route path="/verify-email" element={<MagicVerifyPage />} />
            {/* Where the server's Google OAuth redirect lands. Inert until
                GOOGLE_CLIENT_ID/SECRET are set - the button that starts the flow
                only renders when /auth/methods says google is available. */}
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            {/* One page for every way a Google sign-in can fail. A2. */}
            <Route path="/google-failed" element={<GoogleFailedPage />} />
            {/* One page, two links. Both URLs are sent in emails, so both keep resolving. W8-49. */}
            <Route path="/set-password" element={<ChoosePasswordPage />} />
            <Route path="/reset-password" element={<ChoosePasswordPage />} />
            {/*
              * THE SAME DOOR AS /grounds/new, AND IT WAS NOT GUARDED.
              *
              * /start ends at `POST /entry/commit`, which asks `mayOpen` exactly as the create page
              * does and throws a Forbidden for anybody who is not allowed. Nothing said so on the way
              * in. So a member of an organisation set to NAMED_LEADS, or a guest from another
              * company, could describe their situation, answer every setup question, give a full
              * check-in, read their report - and be refused at the save, with all of it thrown away.
              * That is strictly worse than the create page's version of this bug, which at least
              * refused before the typing.
              *
              * `MayOpenCheckIns` reads `user?.mayOpenCheckIns !== false`, and an anonymous visitor
              * has no user - so a stranger with no account still walks straight in, which is the
              * whole point of this door. They become the admin of their own organisation.
              */}
            <Route path="/start" element={<MayOpenCheckIns><EntryChatPage /></MayOpenCheckIns>} />
            {/*
              DECISION 114 (docs/decisions-merged.md; docs/answers-from-engine.md, "8 October:
              decision 114, the anchor changes no screen"): the anchor scenario must not change the
              UI. It used to have its own front door, `AnchorLandingPage.tsx` - now gone - which
              asked the engine's public switch before showing itself at all. This address is kept,
              for links already sent, as a plain redirect into the ordinary entry chat with the
              anchor's own scenario key, which now makes the one call `AnchorLandingPage.tsx` used to
              make (`GET /entry/anchor-start`, see `EntryChatPage.tsx`). `GET /entry/anchor-available`
              is no longer called from the client at all: nothing here needs to know the switch is on
              before asking anything else, and a 404 from `anchor-start` already says it is off.
            */}
            <Route path="/start/team" element={<AnchorTeamRedirect />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/join" element={<JoinPage />} />
            {/* The QR code's own door: answer first, say who you are at the end. */}
            <Route path="/answer" element={<AnswerFirstPage />} />
            <Route path="/join/confirm" element={<JoinConfirmPage />} />
            {/* "Almost in" (A3): somebody from outside, waiting for an admin to let them in. */}
            <Route path="/join/waiting" element={<RequireAuth><WaitingForAnAdminPage /></RequireAuth>} />

            {/* "Create an organisation" (A3). Plain RequireAuth: it is where somebody makes or names
                one, so nothing about their organisation may be asked of them first. The old
                /org/setup address goes to it, with its query, because links to it are out there. */}
            <Route path="/org-new" element={<RequireAuth><OrgNewPage /></RequireAuth>} />
            <Route path="/org/setup" element={<KeepTheQuery to="/org-new" />} />
            {/* "Choose an organisation" (A3). */}
            <Route path="/orgs" element={<RequireAuth><OrgsPage /></RequireAuth>} />
            {/* "Where do you work?" (A3): join by email domain, as a guest, or create one. */}
            <Route path="/welcome" element={<RequireAuth><WelcomePage /></RequireAuth>} />
            {/* An organisation's own invite link (A3, #/j/baridi). Public: the person may not have an account yet. */}
            <Route path="/j/:code" element={<JoinByLinkPage />} />

            {/* Main app - require auth, and (for an ADMIN) a completed org setup */}
            <Route path="/grounds" element={<RequireOrgSetup><HomeOrChooseAnOrganisation /></RequireOrgSetup>} />
            {/* Today (C1, U.5): what needs you now. Home after signing in, as in the prototype. */}
            <Route path="/today" element={<RequireOrgSetup><TodayPage /></RequireOrgSetup>} />
            {/* The You board (C2, U.12): yours alone, and the server refuses anybody else. */}
            <Route path="/you" element={<RequireOrgSetup><YouPage /></RequireOrgSetup>} />
            {/* The Company page (D2, U.15) and its context: what each reader is given is the server's. */}
            <Route path="/company" element={<RequireOrgSetup><CompanyPage /></RequireOrgSetup>} />
            <Route path="/company/context" element={<RequireOrgSetup><CompanyContextPage /></RequireOrgSetup>} />
            {/* THE SUITES PAGE (E, U.17). What each reader is given is the server's (GET /suites). */}
            <Route path="/settings/suites" element={<RequireOrgSetup><SuitesPage /></RequireOrgSetup>} />
            {/* Release 4: the template library (B1, #/templates). */}
            <Route path="/templates" element={<RequireOrgSetup><TemplatesPage /></RequireOrgSetup>} />
            {/* Release 6: the company's direction. */}
            <Route path="/direction" element={<RequireOrgSetup><DirectionPage /></RequireOrgSetup>} />
            {/* Release 9: the policy board, and setting up from documents. */}
            <Route path="/policies" element={<RequireOrgSetup><PolicyBoardPage /></RequireOrgSetup>} />
            <Route path="/policies/setup" element={<RequireOrgSetup><SetUpFromYourDocumentsPage /></RequireOrgSetup>} />
            <Route path="/suite/onboard" element={<RequireOrgSetup><OnboardingBoardPage /></RequireOrgSetup>} />
            <Route path="/suite/mine" element={<RequireOrgSetup><YourRequestsPage /></RequireOrgSetup>} />
            <Route path="/suite/leave/new" element={<RequireOrgSetup><LeaveRequestNewPage /></RequireOrgSetup>} />
            <Route path="/suite/spend/new" element={<RequireOrgSetup><SpendRequestNewPage /></RequireOrgSetup>} />
            <Route path="/suite/leave" element={<RequireOrgSetup><LeaveBoardPage /></RequireOrgSetup>} />
            <Route path="/suite/queue" element={<RequireOrgSetup><QueuePage /></RequireOrgSetup>} />
            <Route path="/suite/time" element={<RequireOrgSetup><TimeSheetsPage /></RequireOrgSetup>} />
            <Route path="/suite/reviews" element={<RequireOrgSetup><ReviewsBoardPage /></RequireOrgSetup>} />
            <Route path="/suite/reviews/:id" element={<RequireOrgSetup><ReviewPage /></RequireOrgSetup>} />
            <Route path="/suite/leaving" element={<RequireOrgSetup><LeavingBoardPage /></RequireOrgSetup>} />
            <Route path="/suite/roles" element={<RequireOrgSetup><RoleMapPage /></RequireOrgSetup>} />
            <Route path="/suite/spend" element={<RequireOrgSetup><SpendingPage /></RequireOrgSetup>} />
            <Route path="/suite/spend/finance" element={<RequireOrgSetup><FinancePage /></RequireOrgSetup>} />
            <Route path="/suite/todos" element={<RequireOrgSetup><TodosPage /></RequireOrgSetup>} />
            <Route path="/suite/customers" element={<RequireOrgSetup><CustomersPage /></RequireOrgSetup>} />
            <Route path="/suite/equipment" element={<RequireOrgSetup><EquipmentPage /></RequireOrgSetup>} />
            {/* Ask Groundwork as its own page (D1, #/chat), which is how a phone opens it. */}
            <Route path="/chat" element={<RequireOrgSetup><AskPage /></RequireOrgSetup>} />
            {/*
              * REFUSED AT THE DOOR, NOT ON SUBMIT. Both of these were behind RequireOrgSetup alone,
              * so a member who typed the address got the whole flow and was turned away at the end.
              * See a-door-you-cannot-open-says-so.tsx. The API refuses these again on the request
              * itself - this is a courtesy to the person, never the permission.
              */}
            {/* The card wizard is retired: Setup is the chat at /start, which reads the situation from what the person says. Old links keep working. */}
            <Route path="/grounds/new" element={<Navigate to="/start" replace />} />
            {/**
              * ONE URL, AND IT LANDS YOU ON YOUR OWN VIEW.
              *
              * This was `GroundAdminPage` directly, and the rail links every ground here - so a
              * participant clicking their own ground was shown "This view is for whoever runs this
              * ground" with a button to go and find their real page. `GroundPage` decides first.
              */}
            <Route path="/grounds/:id" element={<RequireOrgSetup><GroundPage /></RequireOrgSetup>} />
            <Route path="/grounds/:id/p" element={<RequireOrgSetup><GroundParticipantPage /></RequireOrgSetup>} />
            <Route path="/grounds/:id/report" element={<RequireOrgSetup><ReportPage /></RequireOrgSetup>} />
            {/* THE WEEKLY REPORT (B4, "This week"): GET /grounds/:id/report/week. See WeeklyReportPage.tsx. */}
            <Route path="/grounds/:id/report/week" element={<RequireOrgSetup><WeeklyReportPage /></RequireOrgSetup>} />
            {/*
              BACK, AND IT SHOULD NOT SHIP. It was deleted on the grounds that every surface had a
              real home - which was checked, and was the wrong question. The question is whether
              each surface MATCHES the template it was rebuilt against, and this page is the only
              place that can be seen. One of its own notes says surface 02 was never rebuilt.
              Verifying that is a pre-merge requirement. This goes again once it is done.
            */}
            {/*
              OURS, NOT A CUSTOMER'S. It was behind RequireOrgSetup, which is every signed-in
              customer - so anybody who guessed the address read a page of internal notes about our
              own unfinished work ("its note read 'not rebuilt yet' for months"). It is the bench
              where the eight report surfaces are compared on one check-in, and that is a Groundwork
              tool, so it sits behind the same gate as the rest of the platform back office.
            */}
            <Route path="/preview/reports" element={<RequirePlatformAdmin><EveryReportSideBySide /></RequirePlatformAdmin>} />
            {/* Release 4's boards from their hand-written test organisations: development builds only, never in production. */}
            {import.meta.env.DEV && <Route path="/release-4-preview" element={<Release4Boards />} />}
            {/*
              THE SHARED PARTS' SAMPLE PAGE (design-audit.md section 4, step 1), development only.
              `import.meta.env.DEV` is false in a built, production app, so this route does not
              exist there at all - not hidden, absent. Nothing it shows needs a signed-in person.
            */}
            {import.meta.env.DEV && <Route path="/dev/parts" element={<PartsSamplePage />} />}
            {/*
              THE LIVE CONVERSATION, PICTURED WITHOUT A REAL SESSION, development only - same guard
              as /dev/parts above. Every unfinished check-in on this machine has not started, and
              opening ChatPage.tsx for real starts one, so this draws the same frame from the same
              shared parts with fixed words instead. See ConversationPreviewPage.tsx.
            */}
            {import.meta.env.DEV && <Route path="/dev/conversation" element={<ConversationPreviewPage />} />}
            <Route path="/boards" element={<RequireOrgSetup><TeamBoardsPage /></RequireOrgSetup>} />
            <Route path="/grounds/:id/board" element={<RequireOrgSetup><BoardPage /></RequireOrgSetup>} />
            {/* One person in a check-in, for whoever runs it (person-page.jpg), opened from "The team today". */}
            <Route path="/grounds/:id/person/:participantId" element={<RequireOrgSetup><ThePersonPage /></RequireOrgSetup>} />
            {/* Where a blocker started, step by step (where-a-blocker-started.jpg), from "See where it started". */}
            <Route path="/grounds/:id/trace" element={<RequireOrgSetup><WhereTheBlockerStarted /></RequireOrgSetup>} />
            {/* U.11: "How does this end?", where the lead decides, with a reason. */}
            <Route path="/grounds/:id/end" element={<RequireOrgSetup><EndingPage /></RequireOrgSetup>} />
            {/*
              EVERY REPORT SURFACE ON ONE PAGE, while the rebuild runs.
              
              Signed in like every other route, and it fetches nothing of its own: each surface
              calls the endpoint it always calls with the reader's own token, so this adds no route
              to any data. Nothing links to it. It goes when the last surface is ported.
            */}
            {/* One round's report, for a lead or org admin with no session of their own on it. */}
            <Route path="/grounds/:id/session/:sessionNumber" element={<RequireOrgSetup><RoundReportPage /></RequireOrgSetup>} />
            {/*
              TWO ROUTES, ONE COMPONENT. /chat/:id and /checkin/:id both rendered
              ChatPage, so the same conversation had two addresses and the product
              linked to both. /checkin is the one the invite and join flows use and
              the one the word "check-in" appears in everywhere else, so it is the
              survivor; /chat redirects rather than being deleted, because links to
              it exist in the wild and in old emails.
            */}
            <Route path="/chat/:checkInId" element={<ChatRedirect />} />
            {/*
              B-128: a webhook's `permalink` for a finished check-in builds `/check-in/<id>`, with a
              hyphen - a real address the client never had. Opened from a connected tool's
              notification, it read "Nothing is at this address". Same redirect as `/chat/:id` above,
              to the one real route; a request to fix the hyphen at its source is in
              docs/requests-to-engine.md.
            */}
            <Route path="/check-in/:checkInId" element={<ChatRedirect />} />
            <Route path="/checkin/:checkInId" element={<RequireOrgSetup><ChatPage /></RequireOrgSetup>} />
            {/*
              THE REPORT ONE SESSION ENDED ON, on its own route.
              Clicking a finished session used to land on the CHAT above, which is the transcript
              with a different summary under it - "it sends me back to the chat and the report
              looks nothing like what I got at the end". This is the report.
            */}
            <Route path="/checkin/:checkInId/report" element={<RequireOrgSetup><SessionReportPage /></RequireOrgSetup>} />
            {/* Billing/pricing stay on plain RequireAuth (not RequireOrgSetup): choosing a paid
                plan is optional, not part of org setup - the free tier is the default, not a
                step anyone completes. */}
            <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
            {/* The prototype's address for this page (F2-billing/settings-billing.txt): the same
                page as /billing, reached from Settings rather than the rail's "Plan and billing". */}
            <Route path="/settings/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
            <Route path="/pricing" element={<PricingPage />} />
            {/* PUBLIC, because the person this is for has not signed up. The pricing page's three
                paid services all ended at a mailto, which does nothing without a configured mail
                client - see TalkToUsPage. */}
            <Route path="/talk-to-us" element={<TalkToUsPage />} />
            <Route path="/billing/checkout" element={<RequireAuth><PaymentPage /></RequireAuth>} />
            <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />
            {/*
              * INTERNAL TOOLING, ON A CUSTOMER ROUTE.
              *
              * These two were guarded only by `RequireOrgSetup`, which means "you are signed in and
              * your organisation is named" - true of every customer. Neither is linked from the
              * navigation, so nobody found them by accident, and every endpoint behind them already
              * carries `PlatformAdminGuard` at the class level: a customer who reached them got a
              * page whose every request returned 403, written in internal language, with no way to
              * know why.
              *
              * Not a data exposure. A page that can only fail, shown to the wrong person.
              */}
            {/*
              * BACK-OFFICE TOOLING OFF THE CUSTOMER ROUTES.
              *
              * These are Groundwork's own prompt tools and they sat at /prompts and /prompts/test,
              * top-level addresses in a customer's app, rendered inside the customer's rail. Under
              * /admin they are covered by CHROMELESS_PREFIXES like the rest of the back office, so
              * they no longer wear the shell of the product they are used to operate.
              *
              * Nothing in the app ever linked to them - they are reached by typing the address - so
              * the move breaks no navigation. The two redirects are for whoever has them
              * bookmarked, because a silent 404 on a tool you use daily reads as an outage.
              */}
            {/*
              * THE TEAM'S OWN OPERATING SYSTEM.
              *
              * Under /ops and chromeless, for the same reason the prompt tools moved: it must not
              * wear the shell of the product it is used to run. It is also not admin - a platform
              * admin is Groundwork operating Groundwork, and this is our company operating itself.
              * Who may see what is decided by ops grants, checked by the server on every route;
              * somebody signed in who is not on this team gets a page that says so rather than six
              * failing requests.
              */}
            <Route path="/ops" element={<RequireBackOffice><OpsLayout><OpsBoardPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/target-companies" element={<RequireBackOffice><OpsLayout><OpsTargetCompaniesPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/companies/:key" element={<RequireBackOffice><OpsLayout><OpsCompanyPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/commitments" element={<RequireBackOffice><OpsLayout><OpsCommitmentsPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/spend" element={<RequireBackOffice><OpsLayout><OpsSpendPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/overview" element={<RequireBackOffice><OpsLayout><OpsOverviewPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/pipeline" element={<RequireBackOffice><OpsLayout><OpsCommercialPipelinePage /></OpsLayout></RequireBackOffice>} />
            {/* The old address, kept as a redirect: it is in people's history and
                a silent 404 on a page somebody used daily reads as an outage. */}
            <Route path="/ops/sales" element={<Navigate to="/ops/pipeline" replace />} />
            <Route path="/ops/contribution" element={<RequireBackOffice><OpsLayout><OpsContributionPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/positioning" element={<RequireBackOffice><OpsLayout><OpsPositioningPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/attribution" element={<RequireBackOffice><OpsLayout><OpsAttributionPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/marketing" element={<RequireBackOffice><OpsLayout><OpsMarketingPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/deployment" element={<RequireBackOffice><OpsLayout><OpsDeploymentPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/roadmap" element={<RequireBackOffice><OpsLayout><OpsRoadmapPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/moat" element={<RequireBackOffice><OpsLayout><OpsMoatPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/readiness" element={<RequireBackOffice><OpsLayout><OpsReadinessPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/tech" element={<RequireBackOffice><OpsLayout><OpsTechPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/ux" element={<RequireBackOffice><OpsLayout><OpsUXPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/workplan" element={<RequireBackOffice><OpsLayout><OpsWorkplanPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/resources" element={<RequireBackOffice><OpsLayout><OpsResourcesPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/everybody" element={<RequireBackOffice><OpsLayout><OpsEverybodyPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/quarter" element={<RequireBackOffice><OpsLayout><OpsQuarterPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/what-we-are" element={<RequireBackOffice><OpsLayout><OpsWhatWeArePage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/requests" element={<RequireBackOffice><OpsLayout><OpsRequestsPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/decisions" element={<RequireBackOffice><OpsLayout><OpsDecisionsPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/approvals" element={<RequireBackOffice><OpsLayout><OpsApprovalsPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/fundraise" element={<RequireBackOffice><OpsLayout><OpsFundraisePage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/strategy" element={<RequireBackOffice><OpsLayout><OpsStrategyPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/people" element={<RequireBackOffice><OpsLayout><OpsPeoplePage /></OpsLayout></RequireBackOffice>} />
            <Route path="/ops/integration" element={<RequireBackOffice><OpsLayout><OpsIntegrationPage /></OpsLayout></RequireBackOffice>} />
            <Route path="/admin/prompts" element={<RequirePlatformAdmin><PromptVersioningPage /></RequirePlatformAdmin>} />
            <Route path="/admin/prompts/test" element={<RequirePlatformAdmin><PromptTestPage /></RequirePlatformAdmin>} />
            <Route path="/prompts" element={<Navigate to="/admin/prompts" replace />} />
            <Route path="/prompts/test" element={<Navigate to="/admin/prompts/test" replace />} />
            <Route path="/settings" element={<RequireOrgSetup><SettingsPage /></RequireOrgSetup>} />
            {/* "More", the phone's menu for everything the bottom bar has no room for (A1). */}
            <Route path="/more" element={<RequireOrgSetup><MorePage /></RequireOrgSetup>} />
            <Route path="/org/members" element={<RequireOrgSetup><AdminsOnly what="open People"><OrgMembersPage /></AdminsOnly></RequireOrgSetup>} />
            <Route path="/org/members/:id" element={<RequireOrgSetup><AdminsOnly what="open People"><OnePersonPage /></AdminsOnly></RequireOrgSetup>} />
            {/*
              * THE PAGE AN ADMIN SENDS THEIR LEADS. Signed in, like the rest of /org, because
              * everybody being briefed was just invited and has an account. Not admin-only: it is
              * for the leads, and gating it would mean the person it was written for cannot open
              * the link they were sent.
              */}
            <Route path="/org/guide" element={<LeadsGuidePage />} />
            {/* RequireOrgSetup rather than RequirePlatformAdmin: this is a CUSTOMER's admin connecting
                their own systems, not Groundwork staff. Every endpoint behind it is admin-gated on the
                server, and since A12 the door is at the route: AdminsOnly, the same gate /org/members
                has, rather than the page mounting and refusing - the pattern RequirePlatformAdmin's
                note above was written to remove. */}
            {/* Connections (F1, U.18): the page, WhatsApp step by step, and your own tools. The old address, which emails still carry, opens your own tools, the page it always was. */}
            <Route path="/settings/connections" element={<RequireOrgSetup><AdminsOnly what="connect your systems"><ConnectionsPage /></AdminsOnly></RequireOrgSetup>} />
            <Route path="/settings/whatsapp" element={<RequireOrgSetup><AdminsOnly what="connect your organisation’s WhatsApp number"><WhatsAppSetupPage /></AdminsOnly></RequireOrgSetup>} />
            <Route path="/settings/tools" element={<RequireOrgSetup><AdminsOnly what="connect your systems"><IntegrationsPage /></AdminsOnly></RequireOrgSetup>} />
            <Route path="/org/integrations" element={<Navigate to="/settings/tools" replace />} />
            <Route path="/admin" element={<RequirePlatformAdmin><AdminPage /></RequirePlatformAdmin>} />
            <Route path="/admin/api-access" element={<RequirePlatformAdmin><ApiAccessPage /></RequirePlatformAdmin>} />
            {/* Groundwork's own WhatsApp number and its keys, set by staff (5 Oct 2026). Staff only, on the API too. */}
            <Route path="/admin/whatsapp" element={<RequirePlatformAdmin><WhatsAppSettingsPage /></RequirePlatformAdmin>} />
            <Route path="/admin/dashboard" element={<RequirePlatformAdmin><AdminDashboardPage /></RequirePlatformAdmin>} />

            {/* Any unmatched path renders a real not-found page rather than
                re-entering RootRoute, which for a logged-out visitor can hard-
                redirect to an externally-configured marketing URL - if that
                URL doesn't resolve, silently redirecting here would strand the
                visitor on a blank tab with no way forward. */}
            {/* THE LINKS ON OUR MAIL LAND HERE. Public by necessity: somebody who wants the
                mail to stop must not need an account to say so, and the unsubscribe link had been
                pointing at a route that did not exist, so it drew the not-found page below. */}
            <Route path="/unsubscribe/:token" element={<StopMailPage which="unsubscribe" />} />
            {/* "Stop these reminders" (A3, #/stop), with the check-in's name and the prototype's two ways on. */}
            <Route path="/stop-reminders/:token" element={<StopRemindersPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </AppShell>
          </PageCrash>
        </SessionGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
