import { apiClient } from './client'

export type EntryMode = 'something_new' | 'look_back' | 'look_forward' | 'both'

export interface EntryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface EntryChatResponse {
  reply: string
  sessionComplete: boolean
}

export const entryApi = {
  chat: (mode: EntryMode, messages: EntryMessage[]) =>
    apiClient.post<EntryChatResponse>('/entry/chat', { mode, messages }).then(r => r.data),
  faq: (question: string) =>
    apiClient.post<EntryChatResponse>('/entry/chat', { mode: 'faq', messages: [{ role: 'user', content: question }] }).then(r => r.data),
}

export const participantApi = {
  chat: (token: string, messages: EntryMessage[]) =>
    apiClient.post<EntryChatResponse>('/entry/participant-chat', { token, messages }).then(r => r.data),

  uploadDocument: (token: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ id: string; name: string; mimeType: string; uploadedAt: string }>(
      `/entry/participant-document?token=${encodeURIComponent(token)}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data)
  },
}

const STORAGE_KEY = 'gw-entry-session'

export interface EntrySession {
  mode: EntryMode
  messages: EntryMessage[]
  completed: boolean
  firstMessage: string
  participantEmail?: string
  inviteToken?: string
  inviteNote?: string
}

export const entryStorage = {
  save: (session: EntrySession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  },
  load: (): EntrySession | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
  },
}

const PARTICIPANT_STORAGE_KEY = 'gw-participant-session'

export interface ParticipantSession {
  inviteToken: string
  groundLabel: string
  initiatorName: string
  messages: EntryMessage[]
  completed: boolean
}

export const participantStorage = {
  save: (session: ParticipantSession) => {
    localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(session))
  },
  load: (): ParticipantSession | null => {
    try {
      const raw = localStorage.getItem(PARTICIPANT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  clear: () => {
    localStorage.removeItem(PARTICIPANT_STORAGE_KEY)
  },
}
