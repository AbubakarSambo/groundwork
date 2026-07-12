import { apiClient } from './client'

export interface DocumentAssessment {
  suggests: string[]
  willDo: string[]
}

export interface GroundDocument {
  id: string
  name: string
  mimeType: string
  uploadedAt: string
  assessment: DocumentAssessment | null
}

export const documentsApi = {
  list: (groundId: string) =>
    apiClient.get<GroundDocument[]>(`/grounds/${groundId}/documents`).then(r => r.data),

  upload: (groundId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<GroundDocument>(`/grounds/${groundId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  correctAssessment: (groundId: string, docId: string, assessment: DocumentAssessment) =>
    apiClient.patch<GroundDocument>(`/grounds/${groundId}/documents/${docId}/assessment`, assessment).then(r => r.data),

  remove: (groundId: string, docId: string) =>
    apiClient.delete(`/grounds/${groundId}/documents/${docId}`).then(r => r.data),
}
