import { apiClient } from './client'

export interface FeedbackItem {
  id: string
  text: string
  checkInText?: string | null
  email?: string | null
  createdAt: string
}

export const feedbackApi = {
  submit: (data: { text: string; checkInText?: string; email?: string }) =>
    apiClient.post('/feedback', data).then((r) => r.data),
  list: () => apiClient.get<FeedbackItem[]>('/feedback').then((r) => r.data),
}
