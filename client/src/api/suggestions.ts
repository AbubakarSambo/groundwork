import { apiClient } from './client'

/**
 * GROUNDWORK'S SUGGESTIONS FROM A VERDICT, AND APPEALS (C3, U.13; decisions rule 6).
 *
 * The server decides what each reader is served (api/src/modules/suggestions/
 * a-suggestion-told-like-a-signal.ts): the lead reads the suggestion and decides with reasons; the
 * person it is about reads the facts and the decision with its reasons, and can add their side or
 * appeal; an admin reads a suggestion only once it is appealed, and decides the appeal. The verdict
 * is never sent to anybody, so no screen can show it.
 */
export interface TheDecision { says: string; reasons: string; at: string | null }
export interface TheAppealDecision { outcome: 'stands' | 'changed'; says: string; reasons: string; by: string; at: string | null }
export interface AnAppeal { says: string; at: string | null }

export interface SuggestionForTheLead {
  id: string
  checkIn: { id: string; label: string }
  aboutName: string
  headline: string
  why: string
  whatWouldChangeIt: string | null
  theirOwnAnswer: string | null
  ifYouAgree: string | null
  otherChoices: string[]
  aboutTheEnding: boolean
  decision: TheDecision | null
  theirSide: string | null
  appeal: AnAppeal | null
  appealDecision: TheAppealDecision | null
  mayChangeTheDecision: boolean
}

export interface SuggestionForThePerson {
  id: string
  checkIn: { id: string; label: string }
  leadName: string
  facts: string
  whatWouldChangeIt: string | null
  decision: TheDecision | null
  yourSide: string | null
  yourAppeal: AnAppeal | null
  appealDecision: TheAppealDecision | null
  mayAppeal: boolean
}

export interface AppealForAnAdmin {
  id: string
  checkIn: { id: string; label: string }
  aboutName: string
  leadName: string
  headline: string
  why: string
  whatWouldChangeIt: string | null
  theirOwnAnswer: string | null
  decision: TheDecision | null
  theirSide: string | null
  appeal: AnAppeal
  appealDecision: TheAppealDecision | null
  mayDecide: boolean
}

/** One check-in's suggestions, in the shape this reader may read. */
export type ASuggestionOnACheckIn = SuggestionForTheLead | SuggestionForThePerson | AppealForAnAdmin

export function isForTheLead(s: ASuggestionOnACheckIn): s is SuggestionForTheLead {
  return 'mayChangeTheDecision' in s
}

export const suggestionsApi = {
  onCheckIn: (groundId: string): Promise<{ suggestions: ASuggestionOnACheckIn[] }> =>
    apiClient.get(`/grounds/${groundId}/suggestions`).then(r => r.data),
  appealsToDecide: (): Promise<{ appeals: AppealForAnAdmin[] }> =>
    apiClient.get('/suggestions/appeals').then(r => r.data),
  decide: (id: string, body: { decision: string; reasons: string }) =>
    apiClient.post(`/suggestions/${id}/decision`, body).then(r => r.data),
  addSide: (id: string, side: string): Promise<SuggestionForThePerson> =>
    apiClient.post(`/suggestions/${id}/side`, { side }).then(r => r.data),
  appeal: (id: string, why: string): Promise<SuggestionForThePerson> =>
    apiClient.post(`/suggestions/${id}/appeal`, { why }).then(r => r.data),
  decideAppeal: (id: string, body: { outcome: 'stands' | 'changed'; reasons: string }) =>
    apiClient.post(`/suggestions/${id}/appeal/decision`, body).then(r => r.data),
}
