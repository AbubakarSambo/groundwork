import { apiClient } from './client'
import type { Ground } from '@/types'

export type GroundScenario =
  | 'NEW_HIRE' | 'NEW_COFOUNDER' | 'NEW_ADVISOR'
  | 'NEW_PROJECT' | 'NEW_MANAGER' | 'CONTRACT_RENEWAL'
  | 'RECOGNITION' | 'DRIFT' | 'CRISIS_ALIGNMENT'
  | 'OKR_ALIGNMENT' | 'WORKPLAN_BUDGET' | 'PULSE_CHECK'
  | 'REALIGN_TEAM' | 'PIP' | 'BOARD_STRATEGY' | 'COHORT_CHECK' | 'ACUTE_SHOCK'

export type GroundMoment = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'
export type GroundCadence = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL'

export interface CreateGroundBody {
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  timelineDays?: number
  cadence?: GroundCadence
  cadenceAnchorDay?: number
  startsAt?: string
  endsAt?: string
  resolutionState?: string
  brief?: string
}

export interface AddParticipantBody {
  email: string
  roleAsDescribed?: string
  note?: string
}

export interface CreateGroundForLeadBody {
  leadEmail: string
  /** What the lead is responsible for. Without it the lead is the one person the board cannot read. */
  leadRemit?: string
  leadName?: string
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  timelineDays?: number
  cadence?: GroundCadence
  cadenceAnchorDay?: number
  brief?: string
  participants?: { email: string; roleAsDescribed?: string }[]
}

export interface OrgRosterEntry {
  id: string
  label: string
  scenario: GroundScenario
  status: string
  cadence: string
  createdByAdmin: boolean
  lead: { id: string; firstName: string; lastName: string; email: string }
  memberCount: number
  members: { email: string; partyType: 'INITIATOR' | 'PARTICIPANT'; roleAsDescribed: string | null; accepted: boolean; latestSpecificity: string | null }[]
  contributedParties: number
  report: { agreements: string[]; divergences: unknown[]; releasedAt: string | null } | null
  lastActivity: string | null
}

export const groundsApi = {
  list: () =>
    apiClient.get<Ground[]>('/grounds').then(r => r.data),

  get: (id: string) =>
    apiClient.get<Ground>(`/grounds/${id}`).then(r => r.data),

  // Initiator-only: whether participants can see each other's email. restrict=true hides.
  setExternalVisibility: (id: string, restrict: boolean) =>
    apiClient.patch<{ id: string; restrictExternalVisibility: boolean }>(`/grounds/${id}/external-visibility`, { restrict }).then(r => r.data),

  create: (body: CreateGroundBody) =>
    apiClient.post<Ground>('/grounds', body).then(r => r.data),

  createForLead: (body: CreateGroundForLeadBody) =>
    apiClient.post<Ground>('/grounds/for-lead', body).then(r => r.data),

  confirmLead: (groundId: string, edits?: { brief?: string; managingOnly?: boolean; remit?: string }) =>
    apiClient.post<{ groundId: string; checkInId: string | null }>(`/grounds/${groundId}/confirm-lead`, edits ?? {}).then(r => r.data),

  getOrgRoster: () =>
    apiClient.get<OrgRosterEntry[]>('/grounds/org-roster').then(r => r.data),

  addParticipant: (groundId: string, body: AddParticipantBody) =>
    apiClient.post(`/grounds/${groundId}/participants`, body).then(r => r.data),

  addLeadContext: (groundId: string, body: { participantId?: string; text: string }) =>
    apiClient.post(`/grounds/${groundId}/lead-context`, body).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<Ground>(`/grounds/${groundId}/activate`).then(r => r.data),

  // Begin the closing round: every participant's next session is flagged
  // final (same conversation, closing framing, arc-aware final report).
  beginClosingRound: (groundId: string) =>
    apiClient.post<{ groundId: string; closingRound: boolean; participantsFlagged: number }>(`/grounds/${groundId}/closing-round`).then(r => r.data),

  resendParticipantInvite: (groundId: string, participantId: string) =>
    apiClient.post(`/grounds/${groundId}/participants/${participantId}/resend-invite`).then(r => r.data),

  getMediatorBrief: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/mediator-brief`).then(r => r.data),

  setPeopleWorkTogether: (groundId: string, together: boolean) =>
    apiClient.patch<{ id: string; peopleWorkTogether: boolean }>(`/grounds/${groundId}/people-work-together`, { together }).then(r => r.data),

  update: (groundId: string, body: { label?: string; timelineWeeks?: number; cadence?: GroundCadence; contextNote?: string }) =>
    apiClient.patch<Ground>(`/grounds/${groundId}`, body).then(r => r.data),

  getMySpecificity: (groundId: string) =>
    apiClient.get<{ scores: number[]; label: string }>(`/grounds/${groundId}/my-specificity`).then(r => r.data),

  getMyRecord: (groundId: string) =>
    apiClient.get<{
      sessions: { sessionNumber: number; completedAt: string | null; status: string }[]
      specificity: { scores: number[]; avg: number; label: string } | null
      confidence: { score: number; label: string; description: string } | null
      patterns: { observation: string; sessionNumber: number | null }[] | null
      insightsLocked: boolean
    }>(`/grounds/${groundId}/my-record`).then(r => r.data),

  getMySoloReport: (groundId: string) =>
    apiClient.get<{ report: Record<string, unknown> | null; shared: boolean }>(`/grounds/${groundId}/my-solo-report`).then(r => r.data),

  setMySoloReportShared: (groundId: string, shared: boolean) =>
    apiClient.patch<{ shared: boolean }>(`/grounds/${groundId}/my-solo-report/share`, { shared }).then(r => r.data),

  // Explicit "my account is accurate, I'm done" confirmation - the deadline
  // for corrections, in place of a timer. Does not block later corrections;
  // it just flags any that come after as "updated after sign-off" on the
  // shared report.
  signOff: (groundId: string) =>
    apiClient.post<{ signedOffAt: string }>(`/grounds/${groundId}/sign-off`).then(r => r.data),

  /**
   * The current invite link for someone who has not joined yet.
   *
   * This existed on the API with no caller, which made "I never got the email"
   * a support request instead of a click. Initiator only, and it returns the
   * live link rather than minting a new one - so reading it cannot invalidate
   * the link already sitting in someone's inbox.
   */
  getParticipantInviteUrl: (groundId: string, participantId: string) =>
    apiClient
      .get<{ inviteUrl: string }>(`/grounds/${groundId}/participants/${participantId}/invite-url`)
      .then(r => r.data),

  /**
   * Where THIS person stands on this ground - their own sessions and nothing
   * about anyone else. Safe by construction: the endpoint resolves the
   * participant from the caller's own user id, so it cannot be pointed at
   * another party.
   */
  getMyCheckinStatus: (groundId: string) =>
    apiClient
      .get<{
        participantId: string
        partyType: string
        checkIns: { id: string; sessionNumber: number; status: string; completedAt: string | null }[]
        latestStatus: string | null
        latestSessionNumber: number | null
      }>(`/grounds/${groundId}/my-checkin-status`, {
        // A ground you can view but are not a party to returns 403 here. That is
        // a normal state for this call, not a failure worth interrupting anyone
        // with, so it must not raise the global toast.
        skipForbiddenToast: true,
      })
      .then(r => r.data),

  /**
   * Every turn you have said in this ground, sessions oldest first.
   *
   * One request rather than one per check-in: this is what a ground opens to, so a
   * twelve-session ground firing twelve requests on load is not acceptable. The
   * server enforces that these are only ever your own turns.
   */
  myTranscript: (groundId: string) =>
    apiClient
      .get<{
        sessions: {
          checkInId: string
          sessionNumber: number
          status: string
          /** What the divider shows: finished-on for a complete session, opened-on otherwise. */
          date: string
          isSelfCorrection: boolean
          correctionOf: number | null
          turns: { id: string; role: 'AI' | 'PERSON'; content: string }[]
        }[]
      }>(`/grounds/${groundId}/my-transcript`, {
        // GroundChat renders its own "could not be loaded" line, so the global red
        // toast quoting the URL on top of it is the same failure said twice - once
        // in plain words and once in plumbing. W8-64.
        skipForbiddenToast: true,
        skipNotFoundToast: true,
      })
      .then(r => r.data),

  /** Your own between-session notes. Private: never in a report, never to the lead. */
  myNotes: (groundId: string) =>
    apiClient
      .get<{ id: string; text: string; createdAt: string; carriedIntoCheckInId: string | null }[]>(
        `/grounds/${groundId}/my-notes`,
        { skipForbiddenToast: true, skipNotFoundToast: true },
      )
      .then(r => r.data),

  addMyNote: (groundId: string, text: string) =>
    apiClient
      .post<{ id: string; text: string; createdAt: string; carriedIntoCheckInId: string | null }>(
        `/grounds/${groundId}/my-notes`,
        { text },
      )
      .then(r => r.data),

  deleteMyNote: (groundId: string, noteId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/grounds/${groundId}/my-notes/${noteId}`).then(r => r.data),

  /** Grounds a member set up that an admin has not accepted yet. Admin only. */
  awaitingApproval: () =>
    apiClient
      .get<{
        id: string; label: string; scenario: string; createdAt: string
        timelineDays: number | null; cadence: string | null; createdBy: string
      }[]>('/grounds/awaiting-approval', { skipForbiddenToast: true })
      .then(r => r.data),

  approve: (groundId: string) =>
    apiClient.post<{ id: string; status: string; alreadyDecided: boolean }>(`/grounds/${groundId}/approve`, {}).then(r => r.data),

  declineGround: (groundId: string, reason?: string) =>
    apiClient.post<{ id: string; status: string; alreadyDecided: boolean }>(`/grounds/${groundId}/decline`, { reason }).then(r => r.data),
}
