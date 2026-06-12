import { apiClient } from './client'
import type { Report } from '@/types'

export const reportsApi = {
  get: (groundId: string) =>
    apiClient.get<Report>(`/grounds/${groundId}/report`).then(r => r.data),

  release: (groundId: string) =>
    apiClient.post<Report>(`/grounds/${groundId}/report/release`).then(r => r.data),
}
