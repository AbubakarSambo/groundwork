import { apiClient } from './client'
import type { Ground, GroundScenario, GroundMoment } from '@/types'

export const groundsApi = {
  list: () => apiClient.get<Ground[]>('/grounds').then((r) => r.data),
  get: (id: string) => apiClient.get<Ground>(`/grounds/${id}`).then((r) => r.data),
  create: (data: { label: string; scenario: GroundScenario; moment: GroundMoment; timelineDays?: number }) =>
    apiClient.post<Ground>('/grounds', data).then((r) => r.data),
  addParticipant: (id: string, data: { email: string; roleAsDescribed?: string }) =>
    apiClient.post(`/grounds/${id}/participants`, data).then((r) => r.data),
  activate: (id: string) => apiClient.post(`/grounds/${id}/activate`).then((r) => r.data),
}
