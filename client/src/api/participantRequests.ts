import { apiClient } from './client'

export interface ParticipantRequest {
  id: string
  groundId: string
  requestedByEmail: string
  requestedEmail: string
  requestedName?: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'DISMISSED'
  createdAt: string
}

export const participantRequestsApi = {
  create: (
    groundId: string,
    data: { requestedEmail: string; requestedName?: string; reason: string; requestedByEmail?: string },
  ) =>
    apiClient.post<ParticipantRequest>(`/grounds/${groundId}/participant-requests`, data).then(r => r.data),

  list: (groundId: string) =>
    apiClient.get<ParticipantRequest[]>(`/grounds/${groundId}/participant-requests`).then(r => r.data),

  update: (groundId: string, reqId: string, status: 'APPROVED' | 'DISMISSED') =>
    apiClient.patch<ParticipantRequest>(`/grounds/${groundId}/participant-requests/${reqId}`, { status }).then(r => r.data),
}
