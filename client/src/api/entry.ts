import { apiClient } from './client';

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export interface EntryReport {
  whatGroundworkSaw: string
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear'
  alignmentBasis: string
  areasRequiringAlignment: { title: string; observation: string; whyItMatters: string; recommendedMove: string }[]
  alignmentReached: { title: string; note: string }[]
  honestClose: { aligned: string; open: string; revisit: string; risk: string }
}

export const entryApi = {
  opener: (scenario?: string) =>
    apiClient.post<{ reply: string }>('/entry/opener', { scenario }).then(r => r.data),

  chat: (messages: ChatTurn[], scenario?: string, groundLabel?: string) =>
    apiClient.post<{ reply: string }>('/entry/chat', { messages, scenario, groundLabel }).then(r => r.data),

  report: (messages: ChatTurn[], scenario?: string, groundLabel?: string) =>
    apiClient.post<{ report: EntryReport | null }>('/entry/report', { messages, scenario, groundLabel }).then(r => r.data),
};
