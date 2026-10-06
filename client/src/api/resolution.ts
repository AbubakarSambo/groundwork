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
  /**
   * `reason` is why the lead chose the outcome, in their own words (U.11, decisions rule 6). The
   * server sends it only once the check-in has ended, and only to the people in it and an admin.
   */
  resolution: { id: string; groundId: string; endState: string; closedAt: string | null; reason?: string | null } | null
  confirmations: ResolutionConfirmation[]
  confirmedCount: number
  totalActive: number
  options: EndStateOption[]
  groundStatus: string
  /**
   * WHO CLOSES THIS ONE, AND THE FIELD THAT WAS MISSING FROM EVERY TYPE. W-UX-R.
   *
   * The server has sent this since `LEAD_DECIDES` was introduced. It was declared in NO client type,
   * so `ResolutionPanel` reached it through `(data as any).leadDecides` - which works - and the report
   * page, which had written its OWN third copy of this interface, did not know the field existed at
   * all. So the report rendered the both-must-agree tally on every ground regardless.
   *
   * On a contract renewal that read "0 of 3 parties have confirmed an end state", with the contractor
   * listed "Not yet" against their own renewal, as though the org were waiting on their agreement.
   * The server closes that ground on the lead alone. The screen said otherwise, on the most-read page
   * in the product.
   *
   * True on the six scenarios in `LEAD_DECIDES`: the lead decides and the other parties see what is
   * coming without being asked to consent to it. False everywhere else, where nobody closes alone.
   */
  leadDecides: boolean
  /** Whether the reader runs the check-in. */
  viewerIsLead?: boolean
  /** Whether the reader is in the check-in. False for an admin who only reads it. */
  viewerIsParty?: boolean
}

export const resolutionApi = {
  get: (groundId: string) =>
    apiClient
      // A non-party (an admin who set the ground up but is not in it) gets a
      // 403 here, and that is a correct answer to "may I see this?", not an
      // error worth shouting about. The panel hides itself instead.
      .get<ResolutionState>(`/grounds/${groundId}/resolution`, { skipForbiddenToast: true })
      .then(r => r.data),

  /** The lead's outcome and why. The server refuses an ending without a reason. */
  propose: (groundId: string, endState: string, reason: string) =>
    apiClient.post<ResolutionState>(`/grounds/${groundId}/resolution`, { endState, reason }).then(r => r.data),

  counter: (groundId: string, proposedEndState: string, message?: string) =>
    apiClient
      .post<ResolutionState>(`/grounds/${groundId}/resolution/counter`, { proposedEndState, message })
      .then(r => r.data),
}
