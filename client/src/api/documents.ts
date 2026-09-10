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

  /**
   * `consentConfirmed` is still sent when the caller has it and is no longer read by the server. A
   * record of a conversation is taken on the uploader's word and the assumption is said back in the
   * response as `assumed` (product-owner decision, 11 September 2026). Kept so nothing breaks.
   */
  upload: (groundId: string, file: File, consentConfirmed = false, uploaderNote?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (consentConfirmed) form.append('consentConfirmed', 'true')
    /* What they want looked for in it. Optional, and kept in their words. */
    if (uploaderNote?.trim()) form.append('uploaderNote', uploaderNote.trim())
    return apiClient.post<GroundDocument & { assumed?: string }>(`/grounds/${groundId}/documents`, form, {
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
  /* CLOSED is the lead's only and the server enforces that; the type is the full set the endpoint
     accepts, not the subset one caller offers. See api/src/modules/documents/documents.service.ts. */
  setVisibility: (groundId: string, docId: string, visibility: 'OPEN' | 'OWN' | 'CLOSED') =>
    apiClient.patch<GroundDocument>(`/grounds/${groundId}/documents/${docId}/visibility`, { visibility }).then(r => r.data),

  remove: (groundId: string, docId: string) =>
    apiClient.delete(`/grounds/${groundId}/documents/${docId}`).then(r => r.data),
}
