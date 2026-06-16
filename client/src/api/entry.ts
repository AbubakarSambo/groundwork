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

const STORAGE_KEY = 'gw-entry-session'

export interface EntrySession {
  mode: EntryMode
  messages: EntryMessage[]
  completed: boolean
  firstMessage: string
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
