import { apiClient } from './client'

/**
 * ASKING FOR A COACH IS NOT OPENING A CHECK-IN.
 *
 * Deliberately its own client rather than a corner of grounds.ts: nothing here creates a ground,
 * invites anybody or opens a session. The request endpoint is public, because the person this exists
 * for is the one who has not signed up - somebody told to set this up, looking at twenty situations,
 * who does not know which one their problem is.
 */
export interface CoachRequestInput {
  name: string
  orgName: string
  email: string
  /** Not asked on the public request page. The coach card in setup still collects it. */
  teamSize?: string
  intention: string
  triedAlready?: boolean
  /** When they would like the first conversation, as an instant. A request, never a booking. */
  preferredAt?: string
}

export interface CoachRequestRow {
  id: string
  name: string
  orgName: string
  email: string
  teamSize: string
  intention: string
  triedAlready: boolean | null
  /**
   * When they asked to talk. Null when they left it empty, which is a real answer.
   *
   * On the ROW as well as the input, because a time nobody answering can see is a time that was
   * collected for nothing - and the person who typed it is expecting it to be known.
   */
  preferredAt: string | null
  status: string
  confirmationSentAt: string | null
  isFreeMail: boolean
  askedAgainAt: string | null
  createdAt: string
}

/** Kept in step with the DTO. The form advertises it, so it must be the number enforced. */
export const MIN_INTENTION_LENGTH = 40

/**
 * What coaching costs, shown before the send button rather than after a reply is chased.
 *
 * THESE WERE $5,000 AND $500 while the pricing page said $7,500 and $700, and the coach card in the
 * setup flow said a third thing. One number in three files is how a quote somebody may hold us to
 * ends up wrong in two of them. The guard that caught the card did not look here, and now does.
 */
export const COACHING_PRICE = {
  hourly: '$700 per month, no retainer',
  retained: '$7,500 a year for twelve check-ins',
  note: 'I usually suggest two check-ins per issue, back to back: one to understand it, the next to work through it.',
}

/**
 * EVERY CALL UNWRAPS `.data`, MATCHING THE REST OF THIS DIRECTORY.
 *
 * `apiClient` returns an AxiosResponse. Forgetting the unwrap does not fail loudly - it hands back an
 * object with the payload one level deeper, so a list renders as empty and a field reads as undefined.
 * That has already cost real time on this codebase, in a walkthrough where seventeen replies were
 * reported as blank because the reader looked at the response instead of its body.
 */
export const coachApi = {
  request: (body: CoachRequestInput) =>
    apiClient.post<{ received: boolean }>('/coach/request', body).then((r) => r.data),
  list: (status?: string) =>
    apiClient
      .get<CoachRequestRow[]>('/coach/requests', { params: status ? { status } : undefined })
      .then((r) => r.data),
  setStatus: (id: string, status: string) =>
    apiClient.patch<CoachRequestRow>(`/coach/requests/${id}`, { status }).then((r) => r.data),
}
