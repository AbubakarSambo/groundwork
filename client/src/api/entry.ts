import { apiClient } from './client';

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export type EntryMessage = ChatTurn
export type EntryMode = 'something_new' | 'look_back' | 'look_forward' | 'both'

export interface ParticipantSession {
  inviteToken: string
  groundLabel: string
  initiatorName: string
  messages: EntryMessage[]
  completed: boolean
}

export interface EntryReport {
  whatGroundworkSaw: string
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear'
  alignmentBasis: string
  areasRequiringAlignment: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[]
  alignmentReached: { title: string; note: string }[]
  honestClose: { aligned: string; open: string; revisit: string; risk: string }
}

// ── Entry session storage ─────────────────────────────────────────────────────

const ENTRY_KEY = 'gw-entry-session'

type EntrySession = {
  mode: EntryMode
  messages: EntryMessage[]
  completed?: boolean
  firstMessage?: string
  inviteToken?: string
  inviteNote?: string
  participantEmail?: string
}

export const entryStorage = {
  save: (data: EntrySession) => {
    try { localStorage.setItem(ENTRY_KEY, JSON.stringify(data)) } catch {}
  },
  load: (): EntrySession | null => {
    try { const r = localStorage.getItem(ENTRY_KEY); return r ? JSON.parse(r) : null } catch { return null }
  },
  clear: () => localStorage.removeItem(ENTRY_KEY),
}

// ── Participant session storage ────────────────────────────────────────────────

const PARTICIPANT_KEY = 'gw-participant-session'

export const participantStorage = {
  save: (data: ParticipantSession) => {
    try { localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(data)) } catch {}
  },
  load: (): ParticipantSession | null => {
    try { const r = localStorage.getItem(PARTICIPANT_KEY); return r ? JSON.parse(r) : null } catch { return null }
  },
  clear: () => localStorage.removeItem(PARTICIPANT_KEY),
}

// ── Entry API ─────────────────────────────────────────────────────────────────

export const entryApi = {
  opener: (scenario?: string) =>
    apiClient.post<{ reply: string }>('/entry/opener', { scenario }).then(r => r.data),

  // Supports two call forms:
  //   new: entryApi.chat(mode, messages)       → posts { mode, messages }
  //   old: entryApi.chat(messages, scenario?)  → posts { messages, scenario, groundLabel }
  chat: (
    modeOrMessages: EntryMode | ChatTurn[],
    messagesOrScenario?: ChatTurn[] | string,
    groundLabel?: string,
  ): Promise<{ reply: string; sessionComplete?: boolean }> =>
    typeof modeOrMessages === 'string'
      ? apiClient.post<{ reply: string; sessionComplete: boolean }>(
          '/entry/chat',
          { mode: modeOrMessages, messages: messagesOrScenario },
        ).then(r => r.data)
      : apiClient.post<{ reply: string }>(
          '/entry/chat',
          { messages: modeOrMessages, scenario: messagesOrScenario as string | undefined, groundLabel },
        ).then(r => r.data),

  faq: (question: string) =>
    apiClient.post<{ reply: string }>('/entry/faq', { question }).then(r => r.data),

  report: (messages: ChatTurn[], scenario?: string, groundLabel?: string) =>
    apiClient.post<{ report: EntryReport | null }>('/entry/report', { messages, scenario, groundLabel }).then(r => r.data),
}

// ── Participant API ───────────────────────────────────────────────────────────

export const participantApi = {
  uploadDocument: (token: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ id: string; name: string; mimeType: string; uploadedAt: string }>(
      '/documents/invite-upload',
      form,
      { params: { token }, headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data)
  },

  chat: (token: string, messages: EntryMessage[]) =>
    apiClient.post<{ reply: string; sessionComplete: boolean }>(
      '/entry/participant-chat',
      { token, messages },
    ).then(r => r.data),
}
