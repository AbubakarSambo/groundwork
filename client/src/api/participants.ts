import { apiClient } from './client'
import type { User, GroundScenario } from '@/types'

export interface InvitePreview {
  groundLabel: string
  scenario: GroundScenario
  initiatorName: string
  roleAsDescribed: string | null
  email: string
  alreadyAccepted: boolean
  /** They answered through an open link and have no sign-in yet; a report link should go straight through. */
  hasAnswered?: boolean
  nameGiven?: string | null
  /** U.3: the organisation, the lead's first name, the end date and how often it asks. */
  organisationName?: string | null
  leadFirstName?: string | null
  endsAt?: string | null
  schedule?: string
  /** An expired invitation carries only this and the lead's first name. */
  expired?: false
}

/** What an expired invitation's preview is: nothing but the lead's first name. */
export interface ExpiredInvitePreview { expired: true; leadFirstName: string | null }
/** A guest held for a seat (U.4 third review): the refusal, and nothing else. */
export interface HeldInvitePreview { heldForASeat: true; saying: string; expired?: undefined }

export interface AcceptInviteResponse {
  accessToken: string
  user: User
  groundId: string
  checkInId: string | null
  /** Signed in, and not yet let in: an admin has to approve them. `saying` is the server's sentence. */
  queuedForApproval?: boolean
  saying?: string
}

export const participantsApi = {
  preview: (token: string) =>
    apiClient.get<InvitePreview | ExpiredInvitePreview | HeldInvitePreview>('/participants/invite', { params: { token } }).then((r) => r.data),
  /** "Send me a fresh link" (U.3). Always the same reply, whoever asks. */
  freshLink: (token: string, email: string) =>
    apiClient.post<{ says: string }>('/participants/fresh-link', { token, email }).then((r) => r.data),
  accept: (token: string, names?: { firstName?: string; lastName?: string }) =>
    apiClient.post<AcceptInviteResponse>('/participants/accept', { token, ...names }).then((r) => r.data),
  // Fix a bounced/wrong address and resend the invite. Server-guarded:
  // initiator only, and rejected once the participant has accepted.
  updateEmail: (participantId: string, email: string) =>
    apiClient.patch<{ id: string; email: string }>(`/participants/${participantId}/email`, { email }).then(r => r.data),

  /** My own row on this check-in: where my report goes. Any signed-in participant, for themselves. */
  updateMyEmail: (groundId: string, email: string) =>
    apiClient.patch<{ email: string; changed: boolean; signInMoved?: boolean }>('/participants/mine/email', { groundId, email }).then(r => r.data),

  updateRole: (participantId: string, roleAsDescribed: string) =>
    apiClient.patch<{ id: string; roleAsDescribed: string }>(`/participants/${participantId}`, { roleAsDescribed }).then((r) => r.data),
}
