import { PageCrash } from '@/components/gw/PageCrash'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useSessionTimeout } from '@/lib/useSessionTimeout'
import { AuthPage } from '@/pages/auth/AuthPage'
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
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { PromptTestPage } from '@/pages/prompts/PromptTestPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { OrgMembersPage } from '@/pages/org/OrgMembersPage'
import { NotFoundPage } from '@/pages/notfound/NotFoundPage'
import { HelpModal, HelpButton } from '@/components/gw/HelpModal'
import { AppShell } from '@/components/gw/AppShell'
import type { JSX } from 'react'

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
  if (!isPlatformAdmin) {
    return <Navigate to="/grounds" replace />
  }
  return children
}

function RootRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    // A logged-out visitor who lands on the app root (e.g. someone handed a raw
    // app link) should reach onboarding, not silently bounce to marketing.
    // Only redirect to marketing when one is explicitly configured.
    const marketing = import.meta.env.VITE_MARKETING_URL
    if (marketing) { window.location.replace(marketing); return null }
    return <Navigate to="/start" replace />
  }
  return <GroundsListPage />
}

function SessionGuard({ children }: { children: React.ReactNode }) {
  useSessionTimeout()
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <SessionGuard>
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

            {/* Post-auth setup */}

            {/* Main app - require auth */}
            <Route path="/grounds" element={<RequireAuth><GroundsListPage /></RequireAuth>} />
            <Route path="/grounds/new" element={<RequireAuth><CreateGroundPage /></RequireAuth>} />
            {/**
              * ONE URL, AND IT LANDS YOU ON YOUR OWN VIEW.
              *
              * This was `GroundAdminPage` directly, and the rail links every ground here - so a
              * participant clicking their own ground was shown "This view is for whoever runs this
              * ground" with a button to go and find their real page. `GroundPage` decides first.
              */}
            <Route path="/grounds/:id" element={<RequireAuth><GroundPage /></RequireAuth>} />
            <Route path="/grounds/:id/p" element={<RequireAuth><GroundParticipantPage /></RequireAuth>} />
            <Route path="/grounds/:id/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
            <Route path="/grounds/:id/board" element={<RequireAuth><BoardPage /></RequireAuth>} />
            {/*
              TWO ROUTES, ONE COMPONENT. /chat/:id and /checkin/:id both rendered
              ChatPage, so the same conversation had two addresses and the product
              linked to both. /checkin is the one the invite and join flows use and
              the one the word "check-in" appears in everywhere else, so it is the
              survivor; /chat redirects rather than being deleted, because links to
              it exist in the wild and in old emails.
            */}
            <Route path="/chat/:checkInId" element={<ChatRedirect />} />
            <Route path="/checkin/:checkInId" element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/billing/checkout" element={<RequireAuth><PaymentPage /></RequireAuth>} />
            <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />
            <Route path="/prompts" element={<RequireAuth><PromptVersioningPage /></RequireAuth>} />
            <Route path="/prompts/test" element={<RequireAuth><PromptTestPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/org/members" element={<RequireAuth><OrgMembersPage /></RequireAuth>} />
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
