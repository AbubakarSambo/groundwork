import { apiClient } from './client'
import type { TheIdeaOfferInTheCheckIn, TheRequestOfferInTheCheckIn, TheRequestToOpen } from './anchorShapes'
import type { ConnectWhatsApp } from '@/types'

/**
 * What this check-in is about, so the person answering is not guessing.
 *
 * Only the shared facts: the subject and the stated objectives. Never another party's words.
 */
export interface CheckInBrief {
  subject: string | null
  /** The lead's own words about the situation. Null where nobody has written one. */
  says?: string | null
  objectives: { name: string; target: number | null }[]
  /*
   * Why the list of objectives is short, on a check-in that keeps numbers to their owner. The
   * server has sent this since 15 September and the two fields above were the only ones declared,
   * so the page could not read it without a cast. Somebody seeing two objectives on a check-in
   * with four people otherwise cannot tell whether the rest are missing, secret, or not yet set.
   */
  alsoSay?: string | null
}
/*
 * SUGGESTED ANSWERS (B3): two to four short answers the person might give, under each question, such
 * as "Sent it. They liked it but want to wait until after December." and "Not yet". They are the
 * engine's to write and arrive with its reply. Asked of the engine workspace in
 * docs/requests-to-engine.md, request 7; the screen draws nothing until they come.
 */
/** `mayCompleteAfter`: the turn floor the server holds this check-in to. The screen offers to finish at that count and not before, so the offer is never refused. */
export interface OpenCheckInResponse { reply: string; groundId?: string; brief?: CheckInBrief | null; mayCompleteAfter?: number; suggestedAnswers?: string[]; ideaOffer?: TheIdeaOfferInTheCheckIn | null; requestOffer?: TheRequestOfferInTheCheckIn | null; openTheRequest?: TheRequestToOpen | null }
/*
 * THE END CARD'S PARTS THAT ONLY THE ENGINE CAN WRITE (B3, check-in-end-card.txt), sent with the reply
 * that closes the conversation. Asked of the engine workspace in docs/requests-to-engine.md,
 * request 7; the card shows only what is there.
 *
 *   inYourRecord   "Green Mart has a quote" / "From the photo you added", with its mark
 *   next           "If Green Mart sends a written order, add a photo of it. Then the sale counts as proven."
 */
export interface TheEndCard {
  inYourRecord?: { says: string; how?: string | null; mark?: string | null }[]
  next?: string[]
}
/*
 * PIECE 21: THE YES IN THE PERSON'S CHECK-IN (plan section 5 row 21; decision 96, item 10;
 * docs/answers-from-engine.md, "Request 149, missing (1)", `TheIdeaOfferInTheCheckIn`). Attached to
 * the reply that offers it, to the person alone, in their own check-in. Shape only - not served
 * yet, so this is `undefined` on every reply until the engine's own idea record (piece 19) exists.
 */
export interface SendMessageResponse { reply: string; sessionComplete?: boolean; suggestedAnswers?: string[]; endCard?: TheEndCard | null; ideaOffer?: TheIdeaOfferInTheCheckIn | null; requestOffer?: TheRequestOfferInTheCheckIn | null; openTheRequest?: TheRequestToOpen | null }
export interface TranscriptTurn { id: string; role: 'AI' | 'PERSON'; content: string; suggestedAnswers?: string[]; ideaOffer?: TheIdeaOfferInTheCheckIn | null; requestOffer?: TheRequestOfferInTheCheckIn | null; openTheRequest?: TheRequestToOpen | null }
export interface PriorRecordEntrySession { sessionNumber: number; entries: { type: string; text: string }[] }
export interface TranscriptResponse { checkIn: { status: string; sessionNumber: number; groundId?: string }; turns: TranscriptTurn[]; priorTurns?: TranscriptTurn[]; priorSessionNumber?: number | null; priorRecordEntries?: PriorRecordEntrySession[]; /** What the check-in is about. On every load, not only the one that opens it. */ brief?: CheckInBrief | null; mayCompleteAfter?: number; /** The end card's parts, once the conversation has closed. See TheEndCard. */ endCard?: TheEndCard | null; /** "Connect WhatsApp" for the person reading their own check-in, or null (decision 106). Owner-only read. */ connectWhatsApp?: ConnectWhatsApp | null }

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
  /**
   * B-201: A STRANGER HOLDING A LINK TO SOMEBODY ELSE'S CHECK-IN MUST NOT BE ABLE TO TELL A REAL
   * ONE (403, not theirs) FROM A MADE-UP ONE (404) FROM THE TOASTS ALONE.
   *
   * ChatPage already renders the same GroundGone screen for both (see its own B-201 comment), but
   * this call still raised the client's two generic toasts on top of it - "That one is not yours
   * to open" for the 403, "That is not here any more" for the 404 - each one naming which of the
   * two it was. `skipForbiddenToast`/`skipNotFoundToast` stop the global handler, leaving only the
   * one screen underneath, the same for either reason.
   */
  /*
   * `skipServerErrorToast` too, for the same reason as the two above: a 503 when the conversation
   * cannot be reached (the model down, or not configured) is shown by ChatPage's own permanent
   * banner with the server's own sentence and a "Try again" button - the client's generic "That
   * did not go through" toast on top of that was a second, contradicting message for one failure.
   */
  open: (checkInId: string) =>
    apiClient.post<OpenCheckInResponse>(`/check-ins/${checkInId}/open`, undefined, { skipForbiddenToast: true, skipNotFoundToast: true, skipServerErrorToast: true } as any).then(r => r.data),

  send: (checkInId: string, message: string) =>
    apiClient.post<SendMessageResponse>(`/check-ins/${checkInId}/messages`, { message }).then(r => r.data),

  complete: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/complete`).then(r => r.data),

  decline: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/decline`).then(r => r.data),

  /** B-201: same reason as `open`, above - a stranger's transcript read for a real check-in that is
      not theirs (403) must read exactly like one for a made-up id (404), with neither of the two
      toasts the global handler would otherwise raise on top of the shared GroundGone screen. */
  transcript: (checkInId: string) =>
    apiClient.get<TranscriptResponse>(`/check-ins/${checkInId}/transcript`, { skipForbiddenToast: true, skipNotFoundToast: true } as any).then(r => r.data),
  /** The end card, waited for on the server for as long as it is being built (up to about a minute). Null when no card stands. */
  endCard: (checkInId: string) =>
    apiClient.get<{ endCard: TheEndCard | null }>(`/check-ins/${checkInId}/end-card`, { timeout: 70_000 }).then(r => r.data?.endCard ?? null),

  artifact: (checkInId: string) =>
    apiClient.get(`/check-ins/${checkInId}/artifact`, { skipNotFoundToast: true }).then(r => r.data),

  /**
   * The report this session ended on, as it was read. Not the same object as `artifact`, which is
   * the two-line summary a background job writes afterwards.
   *
   * `skipForbiddenToast`: a session report is only ever readable by the person who wrote it
   * (`SessionReportPage.tsx`'s own isError branch already says so, in its own sentence). Without
   * it, opening somebody else's session also raised the client's generic "That one is not yours to
   * open" toast on top of that sentence - group 3's review, request batch A, fault 4.
   */
  sessionReport: (checkInId: string) =>
    apiClient.get(`/check-ins/${checkInId}/session-report`, { skipNotFoundToast: true, skipForbiddenToast: true } as any)
      .then(r => r.data as { report: import('./entry').EntryReport | null; finishedAt: string | null; sessionNumber: number | null; groundId: string | null; isInitiator: boolean }),

  documentReceived: (checkInId: string) =>
    apiClient.post<{ reply: string }>(`/check-ins/${checkInId}/document-received`).then(r => r.data),

  remind: (checkInId: string) =>
    apiClient.post(`/check-ins/${checkInId}/remind`).then(r => r.data),

  /**
   * Download your own contribution record as a text file.
   *
   * The endpoint has always existed and nothing called it, so "this record is
   * yours, it is portable and permanent" - which the report page says in those
   * words - was true of the data and not of anything a person could do.
   *
   * Not apiClient: the response is a file with a Content-Disposition header
   * rather than JSON, and the request still needs the bearer token, so it
   * follows the same fetch-with-header shape as streamMessage above. Owner
   * only, enforced server-side.
   */
  download: async (checkInId: string): Promise<void> => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}/check-ins/${checkInId}/download`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)

    const blob = await res.blob()
    // Prefer the filename the server chose; fall back to the same shape it uses.
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const named = /filename="([^"]+)"/.exec(disposition)?.[1]
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = named ?? `groundwork-record-${checkInId.slice(0, 8)}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Without this the blob is held for the life of the document.
    URL.revokeObjectURL(url)
  },

  /** "This is not what I said." Owner-scoped. Nothing is deleted; the row stops counting. */
  disputeEntry: (checkInId: string, entryId: string) =>
    apiClient.post<{ id: string; disputedAt: string }>(`/check-ins/${checkInId}/entries/${entryId}/dispute`).then(r => r.data),
}
