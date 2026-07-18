import { apiClient } from './client'
import type { User, GroundScenario } from '@/types'

export interface InvitePreview {
  groundLabel: string
  scenario: GroundScenario
  initiatorName: string
  roleAsDescribed: string | null
  email: string
  alreadyAccepted: boolean
}

export interface AcceptInviteResponse {
  accessToken: string
  user: User
  groundId: string
  checkInId: string | null
}

export const participantsApi = {
  preview: (token: string) =>
    apiClient.get<InvitePreview>('/participants/invite', { params: { token } }).then((r) => r.data),
  accept: (token: string, names?: { firstName?: string; lastName?: string }) =>
    apiClient.post<AcceptInviteResponse>('/participants/accept', { token, ...names }).then((r) => r.data),
  saveIntake: (checkInId: string, data: object) =>
    apiClient.patch<{ ok: boolean }>(`/participants/${checkInId}/intake`, data).then((r) => r.data),
  // Fix a bounced/wrong address and resend the invite. Server-guarded:
  // initiator only, and rejected once the participant has accepted.
  updateEmail: (participantId: string, email: string) =>
    apiClient.patch<{ id: string; email: string }>(`/participants/${participantId}/email`, { email }).then(r => r.data),

  updateRole: (participantId: string, roleAsDescribed: string) =>
    apiClient.patch<{ id: string; roleAsDescribed: string }>(`/participants/${participantId}`, { roleAsDescribed }).then((r) => r.data),
}
