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
  patch: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<Ground>(`/grounds/${id}`, data).then((r) => r.data),
  close: (id: string) => apiClient.post(`/grounds/${id}/close`).then((r) => r.data),
  remindParticipant: (groundId: string, participantId: string) =>
    apiClient.post(`/grounds/${groundId}/remind`, { participantId }).then((r) => r.data),
  remindAll: (groundId: string) =>
    apiClient.post(`/grounds/${groundId}/remind-all`).then((r) => r.data),
  addToProfile: (id: string) =>
    apiClient.post(`/grounds/${id}/add-to-profile`).then((r) => r.data),
  toggleParticipantPublic: (id: string, publicOnProfile: boolean) =>
    apiClient.patch(`/grounds/${id}/profile-visibility`, { publicOnProfile }).then((r) => r.data),
  signals: (id: string) =>
    apiClient.get(`/grounds/${id}/signals`).then((r) => r.data),
}

export const createGroundWithExtras = (body: object) =>
  apiClient.post<Ground>('/grounds', body).then((r) => r.data)

export const uploadGroundBrief = (groundId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return apiClient
    .post(`/grounds/${groundId}/brief`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}
