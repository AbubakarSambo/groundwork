import { apiClient } from './client'

export interface OpenCheckInResponse { reply: string; groundId?: string }
export interface SendMessageResponse { reply: string; sessionComplete?: boolean }
export interface TranscriptTurn { id: string; role: 'AI' | 'PERSON'; content: string }
export interface PriorRecordEntrySession { sessionNumber: number; entries: { type: string; text: string }[] }
export interface TranscriptResponse { checkIn: { status: string; sessionNumber: number; groundId?: string }; turns: TranscriptTurn[]; priorTurns?: TranscriptTurn[]; priorSessionNumber?: number | null; priorRecordEntries?: PriorRecordEntrySession[] }

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1'

/**
 * Stream an AI reply over SSE. Calls onDelta for each answer chunk and onDone
 * with the final sanitized text + completion flag. Uses fetch (not EventSource)
 * so the Authorization header can be sent. Throws if the stream cannot start,
 * so callers can fall back to the non-streaming conversationApi.send.
 */
export async function streamMessage(
  checkInId: string,
  message: string,
  handlers: { onDelta: (text: string) => void; onDone: (r: SendMessageResponse) => void; onError?: (m: string) => void },
): Promise<void> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/check-ins/${checkInId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const line = block.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const evt = JSON.parse(data)
        if (evt.type === 'delta') handlers.onDelta(evt.text)
        else if (evt.type === 'done') handlers.onDone(evt)
        else if (evt.type === 'error') handlers.onError?.(evt.message)
      } catch { /* ignore malformed keepalive lines */ }
    }
  }
}

export const conversationApi = {
  open: (checkInId: string) =>
    apiClient.post<OpenCheckInResponse>(`/check-ins/${checkInId}/open`).then(r => r.data),

  send: (checkInId: string, message: string) =>
    apiClient.post<SendMessageResponse>(`/check-ins/${checkInId}/messages`, { message }).then(r => r.data),

  complete: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/complete`).then(r => r.data),

  decline: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/decline`).then(r => r.data),

  transcript: (checkInId: string) =>
    apiClient.get<TranscriptResponse>(`/check-ins/${checkInId}/transcript`).then(r => r.data),

  artifact: (checkInId: string) =>
    apiClient.get(`/check-ins/${checkInId}/artifact`, { skipNotFoundToast: true }).then(r => r.data),

  documentReceived: (checkInId: string) =>
    apiClient.post<{ reply: string }>(`/check-ins/${checkInId}/document-received`).then(r => r.data),

  remind: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/remind`).then(r => r.data),
}
