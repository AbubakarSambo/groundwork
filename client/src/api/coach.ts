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
  teamSize: string
  intention: string
  triedAlready?: boolean
}

export interface CoachRequestRow {
  id: string
  name: string
  orgName: string
  email: string
  teamSize: string
  intention: string
  triedAlready: boolean | null
  status: string
  confirmationSentAt: string | null
  isFreeMail: boolean
  askedAgainAt: string | null
  createdAt: string
}

/** Kept in step with the DTO. The form advertises it, so it must be the number enforced. */
export const MIN_INTENTION_LENGTH = 40

/** What coaching costs, shown before the send button rather than after a reply is chased. */
export const COACHING_PRICE = {
  retained: '$5,000 a year for twelve sessions',
  hourly: '$500 an hour, no retainer',
  note: 'We usually suggest two sessions per issue, back to back: one to understand it, the next to work through it.',
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
