import { apiClient } from './client'

export interface FeedbackSubmission {
  id: string
  tab: string
  pill: string
  text: string | null
  status: string
  createdAt: string
}

export const feedbackApi = {
  submit: (data: { tab: string; pill: string; text?: string }) =>
    apiClient.post<FeedbackSubmission>('/feedback', data).then(r => r.data),
  list: () =>
    apiClient.get<FeedbackSubmission[]>('/feedback').then(r => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch<FeedbackSubmission>(`/feedback/${id}/status`, { status }).then(r => r.data),
}
