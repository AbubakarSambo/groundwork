import { apiClient } from './client'

/**
 * These types drifted from the server and nothing caught it, because no page
 * ever called this file. The shapes below are what
 * `ResolutionService.buildState()` actually returns.
 */
export interface EndStateOption {
  value: string
  label: string
  description?: string
}

export interface ResolutionConfirmation {
  participantId: string
  label: string
  partyType: string
  /** The end state this party chose, or null if they have not chosen yet. */
  endState: string | null
  confirmed: boolean
}

export interface ResolutionState {
  resolution: { id: string; groundId: string; endState: string; closedAt: string | null } | null
  confirmations: ResolutionConfirmation[]
  confirmedCount: number
  totalActive: number
  options: EndStateOption[]
  groundStatus: string
}

export const resolutionApi = {
  get: (groundId: string) =>
    apiClient
      // A non-party (an admin who set the ground up but is not in it) gets a
      // 403 here, and that is a correct answer to "may I see this?", not an
      // error worth shouting about. The panel hides itself instead.
      .get<ResolutionState>(`/grounds/${groundId}/resolution`, { skipForbiddenToast: true })
      .then(r => r.data),

  /** Propose or confirm. The ground closes when every active party picks the same one. */
  propose: (groundId: string, endState: string) =>
    apiClient.post<ResolutionState>(`/grounds/${groundId}/resolution`, { endState }).then(r => r.data),

  counter: (groundId: string, proposedEndState: string, message?: string) =>
    apiClient
      .post<ResolutionState>(`/grounds/${groundId}/resolution/counter`, { proposedEndState, message })
      .then(r => r.data),
}
