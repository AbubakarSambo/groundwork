import { apiClient } from './client'

export interface DashboardData {
  groundActivity: {
    active: number
    reportReady: number
    resolved: number
    total: number
    session1Completions: number
    session2Completions: number
    session2Rate: number | null
  }
  outcomeRates: {
    key: string
    version: number
    resolvedCount: number
    responses: number
    fairnessRate: number | null
  }[]
}

export interface OutcomeFeedback {
  id: string
  feltFair: boolean
  note: string | null
}

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard').then((r) => r.data),
  myFeedback: (groundId: string) =>
    apiClient.get<OutcomeFeedback | null>(`/grounds/${groundId}/outcome-feedback`).then((r) => r.data),
  submitFeedback: (groundId: string, feltFair: boolean, note?: string) =>
    apiClient.post<OutcomeFeedback>(`/grounds/${groundId}/outcome-feedback`, { feltFair, note }).then((r) => r.data),
}
