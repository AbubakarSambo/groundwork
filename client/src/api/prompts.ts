import { apiClient } from './client'

export interface PromptVersion {
  id: string
  key: string
  version: number
  summary: string | null
  isActive: boolean
  activatedAt: string | null
  createdAt: string
  content: string
}

export interface PlatformDashboardData {
  orgs: {
    total: number
    withActiveCareFee: number
    createdLast30Days: number
  }
  grounds: {
    total: number
    byStatus: Record<string, number>
    openedLast7Days: number
    resolvedLast30Days: number
  }
  checkIns: {
    totalCompleted: number
    completedLast7Days: number
    completedLast30Days: number
    session2Rate: number | null
  }
  promptPerformance: {
    id: string
    key: string
    version: number
    isActive: boolean
    activatedAt: string | null
    createdAt: string
    groundsUsingIt: number
    outcomesResolved: number
    fairnessRate: number | null
    feedbackResponses: number
  }[]
  recentActivity: {
    type: 'checkin_completed' | 'ground_created' | 'ground_resolved'
    at: string
    orgSlug: string
    groundLabel: string
    detail?: string
  }[]
}

export interface UsageFunnelData {
  funnelBySession: { session: number; completed: number; dropOffRate: number | null }[]
  avgSessionMinutes: { session: number; avgMinutes: number }[]
  byScenario: { scenario: string; count: number; pct: number }[]
  byMoment: { moment: string; count: number }[]
  byStatus: { status: string; count: number }[]
  bothEngaged: number
  oneEngaged: number
  stalledCheckIns: number
  session5Count: number
  avgDaysToFirstCheckin: number | null
}

export const promptsApi = {
  list: () => apiClient.get<PromptVersion[]>('/prompts').then((r) => r.data),
  byKey: (key: string) => apiClient.get<PromptVersion[]>(`/prompts/by-key/${encodeURIComponent(key)}`).then((r) => r.data),
  create: (key: string, content: string, summary?: string) =>
    apiClient.post<PromptVersion>('/prompts', { key, content, summary }).then((r) => r.data),
  activate: (id: string) => apiClient.post<PromptVersion>(`/prompts/${id}/activate`).then((r) => r.data),
  platformDashboard: () =>
    apiClient.get<PlatformDashboardData>('/prompts/platform-dashboard').then((r) => r.data),
  platformFunnel: () =>
    apiClient.get<UsageFunnelData>('/prompts/platform-funnel').then((r) => r.data),
}
