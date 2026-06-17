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
import { CofounderPage } from '@/pages/cofounder/CofounderPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { DemoConversationPage } from '@/pages/demo/DemoConversationPage'
import { HomePage } from '@/pages/home/HomePage'
import { OnboardingChat } from '@/pages/home/OnboardingChat'
import { ParticipantOnboardingChat } from '@/pages/home/ParticipantOnboardingChat'
import { LeadOnboardingChat } from '@/pages/home/LeadOnboardingChat'
import { AppShell } from '@/components/layout/AppShell'
import type { JSX } from 'react'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function RootRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (isAuthenticated) {
    return (
      <AppShell>
        <GroundsListPage />
      </AppShell>
    )
  }
  return <HomePage />
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
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/sent" element={<MagicSentPage />} />
            <Route path="/verify-email" element={<MagicVerifyPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/entry-chat" element={<OnboardingChat />} />
            <Route path="/participant-chat" element={<ParticipantOnboardingChat />} />
            <Route path="/lead-onboarding" element={<LeadOnboardingChat />} />
            <Route path="/enter" element={<EnterPage />} />
            <Route path="/pin" element={<PinPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/demo/:persona" element={<DemoConversationPage />} />

            {/* Post-auth setup */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/welcome" element={<WelcomePage />} />

            {/* Main app — require auth */}
            <Route path="/grounds" element={<RequireAuth><AppShell><GroundsListPage /></AppShell></RequireAuth>} />
            <Route path="/grounds/new" element={<RequireAuth><AppShell><CreateGroundPage /></AppShell></RequireAuth>} />
            <Route path="/grounds/:id" element={<RequireAuth><AppShell><GroundAdminPage /></AppShell></RequireAuth>} />
            <Route path="/grounds/:id/p" element={<RequireAuth><AppShell><GroundParticipantPage /></AppShell></RequireAuth>} />
            <Route path="/chat/:checkInId" element={<RequireAuth><AppShell><ChatPage /></AppShell></RequireAuth>} />
            <Route path="/checkin/:checkInId" element={<RequireAuth><AppShell><ChatPage /></AppShell></RequireAuth>} />
            <Route path="/feed" element={<RequireAuth><AppShell><AlignmentFeedPage /></AppShell></RequireAuth>} />
            <Route path="/billing" element={<RequireAuth><AppShell><BillingPage /></AppShell></RequireAuth>} />
            <Route path="/billing/checkout" element={<RequireAuth><PaymentPage /></RequireAuth>} />
            <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />
            <Route path="/profile/:id?" element={<AppShell><ProfilePage /></AppShell>} />
            <Route path="/cofounder" element={<RequireAuth><AppShell><CofounderPage /></AppShell></RequireAuth>} />
            <Route path="/prompts" element={<RequireAuth><AppShell><PromptVersioningPage /></AppShell></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AppShell><AdminPage /></AppShell></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
