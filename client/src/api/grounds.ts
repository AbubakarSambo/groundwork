import { apiClient } from './client'
import type { Ground } from '@/types'

export type GroundScenario =
  | 'NEW_HIRE' | 'NEW_COFOUNDER' | 'NEW_ADVISOR'
  | 'NEW_PROJECT' | 'NEW_MANAGER' | 'CONTRACT_RENEWAL'
  | 'RECOGNITION' | 'DRIFT' | 'CRISIS_ALIGNMENT'

export type GroundMoment = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'
export type GroundCadence = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'

export interface CreateGroundBody {
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  timelineDays?: number
  cadence?: GroundCadence
}

export interface AddParticipantBody {
  email: string
  roleAsDescribed?: string
}

export const groundsApi = {
  list: () =>
    apiClient.get<Ground[]>('/grounds').then(r => r.data),

  get: (id: string) =>
    apiClient.get<Ground>(`/grounds/${id}`).then(r => r.data),

  create: (body: CreateGroundBody) =>
    apiClient.post<Ground>('/grounds', body).then(r => r.data),

  addParticipant: (groundId: string, body: AddParticipantBody) =>
    apiClient.post(`/grounds/${groundId}/participants`, body).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<Ground>(`/grounds/${groundId}/activate`).then(r => r.data),

  resendParticipantInvite: (groundId: string, participantId: string) =>
    apiClient.post(`/grounds/${groundId}/participants/${participantId}/resend-invite`).then(r => r.data),

  getParticipantInviteUrl: (groundId: string, participantId: string) =>
    apiClient.get<{ inviteUrl: string }>(`/grounds/${groundId}/participants/${participantId}/invite-url`).then(r => r.data),

  getMediatorBrief: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/mediator-brief`).then(r => r.data),

  update: (groundId: string, body: { timelineWeeks?: number; cadence?: GroundCadence; contextNote?: string }) =>
    apiClient.patch<Ground>(`/grounds/${groundId}`, body).then(r => r.data),
}
