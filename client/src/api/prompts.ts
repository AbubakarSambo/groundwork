import { apiClient } from './client'

export interface PromptVersion {
  id: string
  key: string
  version: number
  summary: string | null
  isActive: boolean
  activatedAt: string | null
  createdAt: string
  content: string
}

export const promptsApi = {
  list: () => apiClient.get<PromptVersion[]>('/prompts').then((r) => r.data),
  create: (key: string, content: string, summary?: string) =>
    apiClient.post<PromptVersion>('/prompts', { key, content, summary }).then((r) => r.data),
  activate: (id: string) => apiClient.post<PromptVersion>(`/prompts/${id}/activate`).then((r) => r.data),
}
