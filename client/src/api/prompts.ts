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

export interface OrgListItem {
  id: string
  name: string
  slug: string
  email: string
  billingActive: boolean
  careFeeStatus: string
  groundCount: number
  userCount: number
  lastActivity: string | null
  createdAt: string
}

export interface UsageStatsData {
  checkInsLast14Days: { date: string; count: number }[]
  totalCheckIns: number
  groundsCreated: number
  reportsGenerated: number
  eventTotals: Record<string, number>
}

export interface FeedbackSummaryData {
  total: number
  fairRate: number | null
  recent: { id: string; feltFair: boolean; note: string | null; groundLabel: string; orgSlug: string; createdAt: string }[]
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
  orgList: () =>
    apiClient.get<OrgListItem[]>('/prompts/org-list').then((r) => r.data),
  usageStats: () =>
    apiClient.get<UsageStatsData>('/prompts/usage-stats').then((r) => r.data),
  feedbackSummary: () =>
    apiClient.get<FeedbackSummaryData>('/prompts/feedback-summary').then((r) => r.data),

  testChat: (systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient.post<{ reply: string }>('/prompts/test-chat', { systemPrompt, messages }).then((r) => r.data),

  testReport: (systemPrompt: string, adminMessages: { role: 'user' | 'assistant'; content: string }[], p1Messages: { role: 'user' | 'assistant'; content: string }[], p2Messages: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient.post<{ crossReference: string; p1Report: string; p2Report: string }>('/prompts/test-report', { systemPrompt, adminMessages, p1Messages, p2Messages }).then((r) => r.data),
}
