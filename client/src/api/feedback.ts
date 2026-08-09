import { apiClient } from './client'

export interface FeedbackSubmission {
  id: string
  tab: string
  pill: string
  text: string | null
  status: string
  createdAt: string
}

export const feedbackApi = {
  submit: (data: { tab: string; pill: string; text?: string }) =>
    apiClient.post<FeedbackSubmission>('/feedback', data).then(r => r.data),
  list: () =>
    apiClient.get<FeedbackSubmission[]>('/feedback').then(r => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch<FeedbackSubmission>(`/feedback/${id}/status`, { status }).then(r => r.data),
}

/** One party's answer to "did this feel fair", on one ground. */
export interface OutcomeFeedback {
  id: string
  groundId: string
  participantId: string
  feltFair: boolean
  note: string | null
  createdAt: string
}

/**
 * THE ONLY THING THAT TELLS YOU WHETHER GROUNDWORK WORKED.
 *
 * Both verbs existed on the API and neither was ever called, so the product
 * has been running with no route by which a party could say the process felt
 * unfair. It also means `avgFairnessRate` in the outcome-learning summary has
 * been averaging an empty set.
 *
 * Asked only after a ground resolves - asking mid-ground would be asking
 * someone to rate a conversation they are still inside. Upserts, so a party can
 * change their answer rather than being locked into a first impression.
 */
export const outcomeFeedbackApi = {
  /** Null when this party has not answered yet (or is not a party). */
  mine: (groundId: string) =>
    apiClient
      .get<OutcomeFeedback | null>(`/grounds/${groundId}/outcome-feedback`, { skipNotFoundToast: true })
      .then(r => r.data),

  submit: (groundId: string, feltFair: boolean, note?: string) =>
    apiClient
      .post<OutcomeFeedback>(`/grounds/${groundId}/outcome-feedback`, { feltFair, note })
      .then(r => r.data),
}
