import { apiClient } from './client'
import type { Report } from '@/types'

export type ActivationStatus = {
  groundId: string
  parties: { participantId: string; activated: boolean }[]
  allActivated: boolean
}

export const reportsApi = {
  get: (groundId: string) =>
    apiClient.get<Report & { activated?: boolean }>(`/grounds/${groundId}/report`).then(r => r.data),

  release: (groundId: string) =>
    apiClient.post<Report>(`/grounds/${groundId}/report/release`).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<ActivationStatus>(`/grounds/${groundId}/report/activate`).then(r => r.data),

  activationStatus: (groundId: string) =>
    apiClient.get<ActivationStatus>(`/grounds/${groundId}/report/activation-status`).then(r => r.data),

  startClarification: (groundId: string, inferenceId: string) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/clarify`, { inferenceId }).then(r => r.data),

  startSelfCorrection: (groundId: string, sessionNumber: number) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/correct-session`, { sessionNumber }).then(r => r.data),
}
