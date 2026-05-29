import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { GroundsListPage } from '@/pages/grounds/GroundsListPage'
import { CreateGroundPage } from '@/pages/grounds/CreateGroundPage'
import { GroundDetailPage } from '@/pages/grounds/GroundDetailPage'
import { CheckInPage } from '@/pages/checkin/CheckInPage'
import { ReportPage } from '@/pages/report/ReportPage'
import { BillingCallbackPage } from '@/pages/billing/BillingCallbackPage'
import { InvitePage } from '@/pages/invite/InvitePage'
import { AlignmentFeedPage } from '@/pages/alignment/AlignmentFeedPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { PromptVersioningPage } from '@/pages/prompts/PromptVersioningPage'
import type { JSX } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite" element={<InvitePage />} />

          <Route path="/" element={<RequireAuth><GroundsListPage /></RequireAuth>} />
          <Route path="/grounds/new" element={<RequireAuth><CreateGroundPage /></RequireAuth>} />
          <Route path="/grounds/:id" element={<RequireAuth><GroundDetailPage /></RequireAuth>} />
          <Route path="/alignment-feed" element={<RequireAuth><AlignmentFeedPage /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/prompts" element={<RequireAuth><PromptVersioningPage /></RequireAuth>} />
          <Route path="/checkin/:checkInId" element={<RequireAuth><CheckInPage /></RequireAuth>} />
          <Route path="/report/:groundId" element={<RequireAuth><ReportPage /></RequireAuth>} />
          <Route path="/billing/callback" element={<RequireAuth><BillingCallbackPage /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
