import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useSessionTimeout } from '@/lib/useSessionTimeout'
import { AuthPage } from '@/pages/auth/AuthPage'
import { MagicSentPage } from '@/pages/auth/MagicSentPage'
import { MagicVerifyPage } from '@/pages/auth/MagicVerifyPage'
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SetupPage } from '@/pages/setup/SetupPage'
import { EnterPage } from '@/pages/enter/EnterPage'
import { PinPage } from '@/pages/enter/PinPage'
import { EntryChatPage } from '@/pages/enter/EntryChatPage'
import { WelcomePage } from '@/pages/welcome/WelcomePage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { AlignmentFeedPage } from '@/pages/feed/AlignmentFeedPage'
import { GroundsListPage } from '@/pages/grounds/GroundsListPage'
import { CreateGroundPage } from '@/pages/grounds/CreateGroundPage'
import { GroundAdminPage } from '@/pages/grounds/GroundAdminPage'
import { GroundParticipantPage } from '@/pages/grounds/GroundParticipantPage'
import { BillingPage } from '@/pages/billing/BillingPage'
import { PaymentPage } from '@/pages/billing/PaymentPage'
import { BillingCallbackPage } from '@/pages/billing/BillingCallbackPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { JoinPage } from '@/pages/join/JoinPage'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { PromptTestPage } from '@/pages/prompts/PromptTestPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { DemoConversationPage } from '@/pages/demo/DemoConversationPage'
import { HelpModal, HelpButton } from '@/components/gw/HelpModal'
import { AppShell } from '@/components/gw/AppShell'
import type { JSX } from 'react'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    const dest = window.location.pathname + window.location.search
    return <Navigate to={`/auth?from=${encodeURIComponent(dest)}`} replace />
  }
  return children
}

function RootRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) {
    window.location.replace(import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work')
    return null
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
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/sent" element={<MagicSentPage />} />
            <Route path="/verify-email" element={<MagicVerifyPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/start" element={<EntryChatPage />} />
            <Route path="/enter" element={<EnterPage />} />
            <Route path="/pin" element={<PinPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/demo/:persona" element={<DemoConversationPage />} />

            {/* Post-auth setup */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/welcome" element={<WelcomePage />} />

            {/* Main app — require auth */}
            <Route path="/grounds" element={<RequireAuth><GroundsListPage /></RequireAuth>} />
            <Route path="/grounds/new" element={<RequireAuth><CreateGroundPage /></RequireAuth>} />
            <Route path="/grounds/:id" element={<RequireAuth><GroundAdminPage /></RequireAuth>} />
            <Route path="/grounds/:id/p" element={<RequireAuth><GroundParticipantPage /></RequireAuth>} />
            <Route path="/chat/:checkInId" element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/checkin/:checkInId" element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/feed" element={<RequireAuth><AlignmentFeedPage /></RequireAuth>} />
            <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
            <Route path="/billing/checkout" element={<RequireAuth><PaymentPage /></RequireAuth>} />
            <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />
            <Route path="/profile/:id?" element={<ProfilePage />} />
            <Route path="/prompts" element={<RequireAuth><PromptVersioningPage /></RequireAuth>} />
            <Route path="/prompts/test" element={<RequireAuth><PromptTestPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
            <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboardPage /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </AppShell>
        </SessionGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
