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
   * WHAT IT HOLDS: the numbers and dates read out of it at upload, and the product's own words for
   * them. The same sentence the chat says - see the API's what-a-document-holds.
   */
  holds?: {
    whatItIs?: string | null
    forOnePerson: { who: string; what: string; target: number; by?: string | null }[]
    forEverybody: { what: string; target: number; kind?: string | null; by?: string | null }[]
    dates: { what: string; when: string }[]
    unmatched: string[]
    /** The numbers still waiting on a yes before anything is written. Ask Groundwork's own upload
        step polls this (via `numbersWaiting` below) so it knows when to say "I've uploaded it." */
    waiting?: { name: string; target: number; ownerParticipantId: string | null }[]
  } | null
  /**
   * `holds.waiting.length`. Only the upload response carries this ready-made, and it is always `0`
   * there (the read has not landed yet) - see `documents.service.ts`, "AND THE TWO SLOW READS,
   * AFTER THE ANSWER". Reading the list again later, `holds.waiting` is what tells you the real
   * count; this field is absent there and `waiting.length` is read directly instead.
   */
  numbersWaiting?: number
  theContextWeHave?: string | null
  /**
   * Who can read it. Absent on deployments with CONTEXT_ENABLED off, where every
   * document is private to its uploader and there is nothing to choose.
   */
  visibility?: 'OPEN' | 'CLOSED' | 'OWN'
  /** Whether the reader uploaded it. Only the uploader may move or delete it. */
  mine?: boolean
  /** What the uploader said it is for. Sent to the uploader alone. */
  usedFor?: string | null
  /** True for a few minutes after upload, while the read has not landed yet. */
  stillReading?: boolean
  /**
   * WHAT THE READ TOOK AND LEFT OUT, item by item, with the page it is on. Asked of the engine
   * workspace (docs/requests-to-engine.md, request 6); absent until it is sent, and the Add a
   * document step shows only what is there.
   */
  read?: {
    pages?: number | null
    took?: { what: string; detail?: string | null; page?: number | null }[]
    leftOut?: { what: string; page?: number | null; why: string }[]
  } | null
}

export const documentsApi = {
  /* No "That one is not yours to open" toast: a refused list is said on the page, in the documents
     band, where the reader is looking (U.7 review). */
  list: (groundId: string) =>
    apiClient.get<GroundDocument[]>(`/grounds/${groundId}/documents`, { skipForbiddenToast: true } as any).then(r => (Array.isArray(r.data) ? r.data : [])),

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

  /** What your own document should be used for, said after it is read. Blank clears it. */
  setNote: (groundId: string, docId: string, note: string) =>
    apiClient.patch<GroundDocument>(`/grounds/${groundId}/documents/${docId}/note`, { note }).then(r => r.data),

  remove: (groundId: string, docId: string) =>
    apiClient.delete(`/grounds/${groundId}/documents/${docId}`).then(r => r.data),
}
