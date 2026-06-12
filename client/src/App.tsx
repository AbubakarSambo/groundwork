import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { CheckEmailPage } from '@/pages/auth/CheckEmailPage'
import { OrgCodeEntryPage } from '@/pages/auth/OrgCodeEntryPage'
import { PinSetupPage } from '@/pages/auth/PinSetupPage'
import { PinAuthPage } from '@/pages/auth/PinAuthPage'
import { WelcomeScreen } from '@/pages/auth/WelcomeScreen'
import { OrgSetupPage } from '@/pages/auth/OrgSetupPage'
import { LandingPage } from '@/pages/LandingPage'
import { GroundsListPage } from '@/pages/grounds/GroundsListPage'
import { CreateGroundPage } from '@/pages/grounds/CreateGroundPage'
import { GroundDetailPage } from '@/pages/grounds/GroundDetailPage'
import { CheckInPage } from '@/pages/checkin/CheckInPage'
import { ReportPage } from '@/pages/report/ReportPage'
import { BillingCallbackPage } from '@/pages/billing/BillingCallbackPage'
import { BillingPage } from '@/pages/billing/BillingPage'
import { GroundFeedbackPage } from '@/pages/grounds/GroundFeedbackPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { AlignmentFeedPage } from '@/pages/alignment/AlignmentFeedPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import { PlatformDashboardPage } from '@/pages/prompts/PlatformDashboardPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { DevSkipPanel } from '@/components/gw'
import { useSessionTimeout } from '@/lib/useSessionTimeout'
import type { JSX } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RootRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <GroundsListPage /> : <LandingPage />
}

// Mounts inside BrowserRouter so useNavigate is available
function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  useSessionTimeout()
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionTimeoutGuard>
        <Toaster position="top-right" richColors />

        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/enter-org-code" element={<OrgCodeEntryPage />} />
          <Route path="/set-pin" element={<PinSetupPage />} />
          <Route path="/pin-login" element={<PinAuthPage />} />
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/setup" element={<OrgSetupPage />} />

          {/* Protected */}
          <Route path="/grounds/new" element={<RequireAuth><CreateGroundPage /></RequireAuth>} />
          <Route path="/grounds/:id" element={<RequireAuth><GroundDetailPage /></RequireAuth>} />
          <Route path="/alignment-feed" element={<RequireAuth><AlignmentFeedPage /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/prompts" element={<RequireAuth><PromptVersioningPage /></RequireAuth>} />
          <Route path="/admin/dashboard" element={<RequireAuth><PlatformDashboardPage /></RequireAuth>} />
          <Route path="/checkin/:checkInId" element={<RequireAuth><CheckInPage /></RequireAuth>} />
          <Route path="/report/:groundId" element={<RequireAuth><ReportPage /></RequireAuth>} />
          <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/grounds/:groundId/feedback" element={<RequireAuth><GroundFeedbackPage /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {import.meta.env.DEV && <DevSkipPanel />}
        </SessionTimeoutGuard>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
