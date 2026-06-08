import { apiClient } from './client'

export interface GroundDoc {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
}

export const documentsApi = {
  upload: (groundId: string, file: File): Promise<GroundDoc> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post(`/grounds/${groundId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  list: (groundId: string): Promise<GroundDoc[]> =>
    apiClient.get(`/grounds/${groundId}/documents`).then((r) => r.data),

  remove: (groundId: string, docId: string): Promise<void> =>
    apiClient.delete(`/grounds/${groundId}/documents/${docId}`).then((r) => r.data),
}
