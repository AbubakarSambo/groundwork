import { apiClient } from './client'

export interface OpenCheckInResponse { reply: string }
export interface SendMessageResponse { reply: string; sessionComplete?: boolean }

export const conversationApi = {
  open: (checkInId: string) =>
    apiClient.post<OpenCheckInResponse>(`/check-ins/${checkInId}/open`).then(r => r.data),

  send: (checkInId: string, message: string) =>
    apiClient.post<SendMessageResponse>(`/check-ins/${checkInId}/messages`, { message }).then(r => r.data),

  complete: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/complete`).then(r => r.data),

  decline: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/decline`).then(r => r.data),

  transcript: (checkInId: string) =>
    apiClient.get(`/check-ins/${checkInId}/transcript`).then(r => r.data),

  artifact: (checkInId: string) =>
    apiClient.get(`/check-ins/${checkInId}/artifact`).then(r => r.data),

  remind: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/remind`).then(r => r.data),
}
