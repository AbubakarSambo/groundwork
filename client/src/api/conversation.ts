import { apiClient } from './client'
import type { ConversationTurn } from '@/types'

export const conversationApi = {
  transcript: (checkInId: string) =>
    apiClient.get<{ turns: ConversationTurn[] }>(`/check-ins/${checkInId}/transcript`).then((r) => r.data),
  open: (checkInId: string) =>
    apiClient.post<{ reply: string }>(`/check-ins/${checkInId}/open`).then((r) => r.data),
  send: (checkInId: string, message: string) =>
    apiClient.post<{ reply: string }>(`/check-ins/${checkInId}/messages`, { message }).then((r) => r.data),
  complete: (checkInId: string) =>
    apiClient.post<{ status: string; groundId: string }>(`/check-ins/${checkInId}/complete`).then((r) => r.data),
}
