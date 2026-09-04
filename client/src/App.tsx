import { PageCrash } from '@/components/gw/PageCrash'
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { MARKETING_URL } from '@/lib/marketing'
import { useSessionTimeout } from '@/lib/useSessionTimeout'
import { useWhoTheServerSaysYouAre } from '@/lib/who-the-server-says-you-are'
import { AuthPage } from '@/pages/auth/AuthPage'
import { SignOutPage } from '@/pages/auth/SignOutPage'
import { MagicVerifyPage } from '@/pages/auth/MagicVerifyPage'
import { GoogleCallbackPage } from '@/pages/auth/GoogleCallbackPage'
import { ChoosePasswordPage } from '@/pages/auth/ChoosePasswordPage'
import { EntryChatPage } from '@/pages/enter/EntryChatPage'
import { ChatPage } from '@/pages/chat/ChatPage'

/** Old address for a check-in. Keeps working, lands on the one canonical route. */
function ChatRedirect() {
  const { checkInId } = useParams()
  return <Navigate to={`/checkin/${checkInId}`} replace />
}
import { GroundsListPage } from '@/pages/grounds/GroundsListPage'
import { CreateGroundPage } from '@/pages/grounds/CreateGroundPage'
import { GroundParticipantPage } from '@/pages/grounds/GroundParticipantPage'
import { GroundPage } from '@/pages/grounds/GroundPage'
import { ReportPage } from '@/pages/report/ReportPage'
import { BoardPage } from '@/pages/board/BoardPage'
import { BillingPage } from '@/pages/billing/BillingPage'
import { PricingPage } from '@/pages/billing/PricingPage'
import { PaymentPage } from '@/pages/billing/PaymentPage'
import { BillingCallbackPage } from '@/pages/billing/BillingCallbackPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { JoinPage } from '@/pages/join/JoinPage'
import OpsBoardPage from '@/pages/ops/OpsBoardPage'
import OpsSprintPage from '@/pages/ops/OpsSprintPage'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { PromptTestPage } from '@/pages/prompts/PromptTestPage'
import { IntegrationsPage } from '@/pages/org/IntegrationsPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ADoorYouCannotOpen } from '@/components/gw/a-door-you-cannot-open-says-so'
import { OrgMembersPage } from '@/pages/org/OrgMembersPage'
import { LeadsGuidePage } from '@/pages/org/LeadsGuidePage'
import { OrgSetupPage } from '@/pages/org/OrgSetupPage'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'
import { HelpModal, HelpButton } from '@/components/gw/HelpModal'
import { AppShell } from '@/components/gw/AppShell'
import type { JSX } from 'react'
import type { User } from '@/types'

// Shared so code outside the React tree can invalidate too - see lib/queryClient.
const qc = queryClient

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search
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
    const dest = window.location.pathname + window.location.search
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
          <Link
            to="/grounds"
            style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}
          >Go to my check-ins</Link>
        </div>
      </div>
    )
  }
  return children
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
function mustSetUpOrg(user: User | null | undefined) {
  if (!user) return false // let RequireAuth handle the unauthenticated case
  if (typeof user.mustSetUpOrganisation === 'boolean') return user.mustSetUpOrganisation
  return user.role === 'ADMIN' && !user.organization?.email
}

/* The two doors. Each reads the one field that decides it, and nothing else. */
function MayOpenCheckIns({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return <ADoorYouCannotOpen may={user?.mayOpenCheckIns !== false} what="open a check-in">{children}</ADoorYouCannotOpen>
}

function AdminsOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return <ADoorYouCannotOpen may={user?.role === 'ADMIN'} what="add people to your organisation">{children}</ADoorYouCannotOpen>
}

function RequireOrgSetup({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search
    return <Navigate to={`/auth?next=${encodeURIComponent(dest)}`} replace />
  }
  if (mustSetUpOrg(user)) {
    return <Navigate to="/org/setup" replace />
  }
  return children
}

function RootRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
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
    window.location.replace(MARKETING_URL)
    return null
  }
  /**
   * Signed in, the root IS your grounds - her ask, and it was already true. Worth stating rather
   * than leaving as an unlabelled fall-through, because the signed-out branch above returns early
   * and it is easy to read this as unreachable.
   */
  if (mustSetUpOrg(user)) {
    return <Navigate to="/org/setup" replace />
  }
  return <GroundsListPage />
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
          <Toaster position="top-right" richColors />
          <HelpModal />
          <HelpButton />
          <AppShell>
          {/* A render error in one page used to blank the entire app. W8-63. */}
          <PageCrash>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
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
            {/* One page, two links. Both URLs are sent in emails, so both keep resolving. W8-49. */}
            <Route path="/set-password" element={<ChoosePasswordPage />} />
            <Route path="/reset-password" element={<ChoosePasswordPage />} />
            <Route path="/start" element={<EntryChatPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/join" element={<JoinPage />} />

            {/* Post-auth setup: an org admin whose org is missing contact email / stage / plan is
                sent here by RequireOrgSetup before reaching anything else below. Plain RequireAuth,
                not RequireOrgSetup, so this route itself can never redirect-loop. */}
            <Route path="/org/setup" element={<RequireAuth><OrgSetupPage /></RequireAuth>} />

            {/* Main app - require auth, and (for an ADMIN) a completed org setup */}
            <Route path="/grounds" element={<RequireOrgSetup><GroundsListPage /></RequireOrgSetup>} />
            {/*
              * REFUSED AT THE DOOR, NOT ON SUBMIT. Both of these were behind RequireOrgSetup alone,
              * so a member who typed the address got the whole flow and was turned away at the end.
              * See a-door-you-cannot-open-says-so.tsx. The API refuses these again on the request
              * itself - this is a courtesy to the person, never the permission.
              */}
            <Route path="/grounds/new" element={<RequireOrgSetup><MayOpenCheckIns><CreateGroundPage /></MayOpenCheckIns></RequireOrgSetup>} />
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
            <Route path="/grounds/:id/board" element={<RequireOrgSetup><BoardPage /></RequireOrgSetup>} />
            {/*
              TWO ROUTES, ONE COMPONENT. /chat/:id and /checkin/:id both rendered
              ChatPage, so the same conversation had two addresses and the product
              linked to both. /checkin is the one the invite and join flows use and
              the one the word "check-in" appears in everywhere else, so it is the
              survivor; /chat redirects rather than being deleted, because links to
              it exist in the wild and in old emails.
            */}
            <Route path="/chat/:checkInId" element={<ChatRedirect />} />
            <Route path="/checkin/:checkInId" element={<RequireOrgSetup><ChatPage /></RequireOrgSetup>} />
            {/* Billing/pricing stay on plain RequireAuth (not RequireOrgSetup): choosing a paid
                plan is optional, not part of org setup - the free tier is the default, not a
                step anyone completes. */}
            <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
            <Route path="/pricing" element={<PricingPage />} />
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
            <Route path="/ops" element={<RequireAuth><OpsBoardPage /></RequireAuth>} />
            <Route path="/ops/sprint" element={<RequireAuth><OpsSprintPage /></RequireAuth>} />
            <Route path="/admin/prompts" element={<RequirePlatformAdmin><PromptVersioningPage /></RequirePlatformAdmin>} />
            <Route path="/admin/prompts/test" element={<RequirePlatformAdmin><PromptTestPage /></RequirePlatformAdmin>} />
            <Route path="/prompts" element={<Navigate to="/admin/prompts" replace />} />
            <Route path="/prompts/test" element={<Navigate to="/admin/prompts/test" replace />} />
            <Route path="/settings" element={<RequireOrgSetup><SettingsPage /></RequireOrgSetup>} />
            <Route path="/org/members" element={<RequireOrgSetup><AdminsOnly><OrgMembersPage /></AdminsOnly></RequireOrgSetup>} />
            {/*
              * THE PAGE AN ADMIN SENDS THEIR LEADS. Signed in, like the rest of /org, because
              * everybody being briefed was just invited and has an account. Not admin-only: it is
              * for the leads, and gating it would mean the person it was written for cannot open
              * the link they were sent.
              */}
            <Route path="/org/guide" element={<LeadsGuidePage />} />
            {/* RequireOrgSetup rather than RequirePlatformAdmin: this is a CUSTOMER's admin connecting
                their own systems, not Groundwork staff. The page itself refuses a non-admin, and
                every endpoint behind it is admin-gated on the server. */}
            <Route path="/org/integrations" element={<RequireOrgSetup><IntegrationsPage /></RequireOrgSetup>} />
            <Route path="/admin" element={<RequirePlatformAdmin><AdminPage /></RequirePlatformAdmin>} />
            <Route path="/admin/dashboard" element={<RequirePlatformAdmin><AdminDashboardPage /></RequirePlatformAdmin>} />

            {/* Any unmatched path renders a real not-found page rather than
                re-entering RootRoute, which for a logged-out visitor can hard-
                redirect to an externally-configured marketing URL - if that
                URL doesn't resolve, silently redirecting here would strand the
                visitor on a blank tab with no way forward. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </PageCrash>
          </AppShell>
        </SessionGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
