import { apiClient } from './client'
import type { User, GroundScenario } from '@/types'
import type { TheAnchorInvitation, TheInvitationWords } from './anchorShapes'

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
  /** One plain sentence: whether they go straight in when they join, or wait for an admin first (Hafsah, 12 October). */
  whatHappensWhenYouJoin?: string | null
  /** U.3: the organisation, the lead's first name, the end date and how often it asks. */
  organisationName?: string | null
  leadFirstName?: string | null
  endsAt?: string | null
  /** When their first check-in opens, only when that is later than now (U.6 review). */
  opensOn?: string | null
  schedule?: string
  /** "Your number" (U.20 ninth round): WHO would see this person's own share of a target, through
      the engine's own visibility rule (targetsFor, board/whose-number-is-whose-business.ts) - never
      the number itself. This is read with the link's token, before any sign-in, so the value can
      never be handed to whoever is holding the link. Null when they own no numeric target, or once
      they have already joined (the page no longer shows this block to them). */
  yourNumberIsSeenBy?: 'you-and-lead' | 'everybody' | null
  /** An expired invitation carries only this and the lead's first name. */
  expired?: false
  /**
   * ANCHOR PIECE 11, THE INVITATION (plan section 5 row 5; docs/answers-from-engine.md, "Request
   * 149 (3 of 6)", `TheAnchorInvitation`). Served now, on `GET /participants/preview`, only for a
   * check-in with `started_from` "anchor" and only while `release.anchorScenario` is on - absent
   * otherwise. `TheAnchorInvitation` is the copy of the engine's shape the screens workspace keeps
   * for itself (`anchorShapes.ts`) - never imported from `api/`, since the client builds alone on
   * staging.
   */
  anchorInvitation?: TheAnchorInvitation
  /**
   * THE SAME WORDS, FOR ANY SCENARIO THAT HAS ITS OWN (decision 114; docs/answers-from-engine.md,
   * "8 October (later): the anchor through the ordinary routes, route by route"). Present for a
   * scenario with its own invitation words - today only the anchor's, with the switch on - and
   * absent for the rest, drawn exactly like `anchorInvitation` above. `InvitePage.tsx` reads this
   * first and falls back to `anchorInvitation` only where the server has not moved a caller onto
   * it yet, so nothing already working stops working while the two exist side by side.
   */
  invitationWords?: TheInvitationWords
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
  /* `skipNotFoundToast`: the invite page already says this itself (LinkProblem, on InvitePage's
     own isError branch). Without it, a 404 here also raised "That is not here any more" with the
     server's own sentence for its description - a second, differently-worded message on top of
     the page's one, Hafsah's first review, U.20 sixth review. */
  preview: (token: string) =>
    apiClient.get<InvitePreview | ExpiredInvitePreview | HeldInvitePreview>('/participants/invite', { params: { token }, skipNotFoundToast: true } as any).then((r) => r.data),
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
