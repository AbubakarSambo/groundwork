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
  /**
   * Who can read it. Absent on deployments with CONTEXT_ENABLED off, where every
   * document is private to its uploader and there is nothing to choose.
   */
  visibility?: 'OPEN' | 'CLOSED' | 'OWN'
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

  /**
   * Move your OWN document between open and private. (G38)
   *
   * Only the uploader can, and CLOSED is not offered - a participant switching to
   * CLOSED would be handing their document to the lead while believing they had
   * made it more private.
   */
  setVisibility: (groundId: string, docId: string, visibility: 'OPEN' | 'OWN') =>
    apiClient.patch<GroundDocument>(`/grounds/${groundId}/documents/${docId}/visibility`, { visibility }).then(r => r.data),

  remove: (groundId: string, docId: string) =>
    apiClient.delete(`/grounds/${groundId}/documents/${docId}`).then(r => r.data),
}
