import { apiClient } from './client'
import type { Ground } from '@/types'

export interface Delivery {
  id: string
  text: string
  evidence: string | null
  objectiveId: string | null
  createdAt: string
  /** Set once a session has raised it. Until then it is still waiting to be asked about. */
  carriedIntoCheckInId: string | null
}


export type GroundScenario =
  | 'NEW_HIRE' | 'ROLE_HANDOVER' | 'NEW_COFOUNDER' | 'NEW_ADVISOR'
  | 'NEW_PROJECT' | 'NEW_MANAGER' | 'CONTRACT_RENEWAL'
  | 'RECOGNITION' | 'DRIFT' | 'CRISIS_ALIGNMENT'
  | 'OKR_ALIGNMENT' | 'WORKPLAN_BUDGET' | 'PULSE_CHECK'
  | 'REALIGN_TEAM' | 'PIP' | 'BOARD_STRATEGY' | 'COHORT_CHECK' | 'ACUTE_SHOCK'
  /** The honest default when a described situation matches no card. Mirrors the server enum. */
  | 'OPEN_READ'
  // One honest read from everybody, once. The only situation with no run and no board.
  | 'SNAPSHOT'

export type GroundMoment = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'
export type GroundCadence = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'SEQUENTIAL' | 'ONE_TIME'

export interface CreateGroundBody {
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  timelineDays?: number
  cadence?: GroundCadence
  cadenceAnchorDay?: number
  /** Rounds where every party has completed their check-in. W13-6. */
  roundsDone?: number
  startsAt?: string
  endsAt?: string
  resolutionState?: string
  brief?: string
}

export interface AddParticipantBody {
  email: string
  roleAsDescribed?: string
  note?: string
  /**
   * WHEN THIS PERSON STARTS, IF THEY HAVE NOT.
   *
   * A future date does two things on the server: nothing before it counts as a period they went quiet
   * in, and their invitation is held until the day. An email asking somebody to account for their work
   * can otherwise arrive before they have signed a contract, and it cannot be recalled once read.
   *
   * ISO date. Omit when the work is already underway, which is most people on most grounds.
   */
  startsAt?: string
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

  /**
   * `skipNotFoundToast`: THE PAGE ALREADY SAYS THIS. W8-66.
   *
   * A ground you cannot see now renders `GroundGone` - a heading, the reason, and a way
   * back. The client's axios layer ALSO raised a red "Not found / Ground not found" toast
   * for the same 404, so you got the explanation twice, and the toast outlived the
   * navigation: it sat over the grounds list's stat tiles on the page you landed on next,
   * describing something that had already been handled.
   *
   * One 404, one answer, in the place the person is looking.
   */
  get: (id: string) =>
    apiClient.get<Ground>(`/grounds/${id}`, { skipNotFoundToast: true } as any).then(r => r.data),

  /**
   * Whether the parties can see each other at all - who else is here, and how each is doing.
   * Separate from hiding email addresses. W14-4.
   *
   * The endpoint has existed since the peer rule was written and nothing called it, so the
   * default (hidden on evaluation and cohort grounds, shown elsewhere) was unreachable and
   * invisible: a lead could not see the rule, let alone change it.
   */
  setPeerVisibility: (id: string, visible: boolean) =>
    apiClient
      .patch<{ id: string; peersVisibleToEachOther: boolean }>(`/grounds/${id}/peer-visibility`, { visible })
      .then(r => r.data),

  // Initiator-only: whether participants can see each other's email. restrict=true hides.
  setExternalVisibility: (id: string, restrict: boolean) =>
    apiClient.patch<{ id: string; restrictExternalVisibility: boolean }>(`/grounds/${id}/external-visibility`, { restrict }).then(r => r.data),

  create: (body: CreateGroundBody) =>
    apiClient.post<Ground>('/grounds', body).then(r => r.data),

  createForLead: (body: CreateGroundForLeadBody) =>
    apiClient.post<Ground>('/grounds/for-lead', body).then(r => r.data),

  confirmLead: (groundId: string, edits?: { brief?: string; managingOnly?: boolean; remit?: string }) =>
    apiClient.post<{ groundId: string; checkInId: string | null }>(`/grounds/${groundId}/confirm-lead`, edits ?? {}).then(r => r.data),

  /**
   * `getOrgRoster` USED TO SIT HERE. W-UX-C.
   *
   * It fed `/org/roster`, an "All grounds" page that was retired when `grounds.list` was found to
   * return the same data to an admin already - one page at two addresses, with two levels of detail
   * rather than two audiences. The page went; its client method did not, and has called nothing
   * since. `GroundsListPage` carries a comment naming this exact history.
   *
   * The SERVER route stays, per the standing rule about not removing routes.
   */

  addParticipant: (groundId: string, body: AddParticipantBody) =>
    apiClient.post(`/grounds/${groundId}/participants`, body).then(r => r.data),

  /**
   * `audience` is WHO READS IT and nothing else. EVERYONE is the lead's framing of the situation,
   * read by the whole check-in and still never quotable - the same rule as a private note, with a
   * different readership. Omitted means LEAD_ONLY, which is what every note was before this existed.
   */
  addLeadContext: (groundId: string, body: { participantId?: string; text: string; audience?: 'LEAD_ONLY' | 'EVERYONE' }) =>
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

  update: (groundId: string, body: { label?: string; timelineDays?: number; cadence?: GroundCadence; contextNote?: string }) =>
    apiClient.patch<Ground>(`/grounds/${groundId}`, body).then(r => r.data),

  getMySpecificity: (groundId: string) =>
    apiClient.get<{
      scores: number[]
      label: string
      trend: 'rising' | 'steady' | 'falling' | 'new'
      whatWouldHelp: string | null
      strongest: string | null
    }>(`/grounds/${groundId}/my-specificity`).then(r => r.data),

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
   * The other half of it. `getParticipantInviteUrl` refuses the moment somebody accepts, and from
   * that point the only thing that could produce the address of their check-in was a scheduled
   * email. If that email was missed, nobody could recover it.
   */
  getParticipantCheckInUrl: (groundId: string, participantId: string) =>
    apiClient
      .get<{ checkInUrl: string }>(`/grounds/${groundId}/participants/${participantId}/check-in-url`)
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
  /**
   * WHAT DOING WELL LOOKS LIKE, AND WHAT IT RESTS ON. `GroundBaseline`, which had no caller at all.
   *
   * Stating it again is a new VERSION, never an edit - the schema's own note: "half the findings this
   * product makes are the distance between what people believed at the start and what turned out to be
   * true. Corrected, a baseline becomes a second description of the present and the arc disappears."
   */
  stateBaseline: (groundId: string, body: { successLooksLike?: string; conditions?: string[]; changeReason?: string }) =>
    apiClient.post<{ version: number; successLooksLike: string | null; conditions: string[]; changeReason: string | null; effectiveFrom: string }>(
      `/grounds/${groundId}/baseline`, body,
    ).then(r => r.data),

  baselineHistory: (groundId: string) =>
    apiClient.get<{ version: number; successLooksLike: string | null; conditions: string[]; changeReason: string | null; effectiveFrom: string }[]>(
      `/grounds/${groundId}/baseline`,
    ).then(r => r.data),

  /**
   * GW-EXP-2. Marks THIS viewer's own expectation as seen, and only their own.
   *
   * A dedicated call because the first version flipped `seenBySubject` on the ground read, which
   * happens from every tab - so it marked an expectation seen for somebody who never opened the view
   * that shows it. Being measured against something you have never laid eyes on is the failure this
   * flag exists to prevent, so the flag has to mean what it says.
   */
  markMyExpectationShown: (groundId: string) =>
    apiClient.post<{ ok: true }>(`/grounds/${groundId}/my-expectation/shown`).then(r => r.data),

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

  /**
   * Somebody looked at the ticket behind a REFERENCE expectation. The one write that keeps a
   * pointer honest: what it says and when that was true, together, stamped by the server.
   */
  markExpectationLookedAt: (groundId: string, objectiveId: string, lastSeenState: string) =>
    apiClient
      .patch<{ ok: true }>(`/grounds/${groundId}/expectations/${objectiveId}/looked`, { lastSeenState })
      .then(r => r.data),

  myDeliveries: (groundId: string) =>
    apiClient
      .get<Delivery[]>(`/grounds/${groundId}/my-deliveries`, {
        skipForbiddenToast: true,
        skipNotFoundToast: true,
      })
      .then(r => r.data),

  /**
   * What you say you delivered. It reaches your next session as something to be ASKED about -
   * `carriedIntoCheckInId` is how the page can say so honestly once that has happened.
   */
  addDelivery: (groundId: string, body: { text: string; evidence?: string; objectiveId?: string }) =>
    apiClient.post<Delivery>(`/grounds/${groundId}/my-deliveries`, body).then(r => r.data),

  deleteMyDelivery: (groundId: string, deliveryId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/grounds/${groundId}/my-deliveries/${deliveryId}`).then(r => r.data),

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

  /**
   * The lead's setup conversation. Stateless: the client holds the history and sends
   * it back, and nothing said here is stored - it is about the ground's setup, not
   * anybody's account of anything.
   */
  /**
   * The confirmation. The chat proposes; this is the lead saying yes. It sends back their own words
   * rather than a value, because the server re-derives the change from them - an endpoint that takes
   * `timelineDays` from the client is an edit endpoint wearing a confirmation's name.
   */
  confirmContext: (groundId: string, said: string) =>
    apiClient
      .post<{ changed: string; say: string }>(`/grounds/${groundId}/context-chat/confirm`, { said })
      .then(r => r.data),



  /**
   * WHERE THIS STOOD ON DAY ONE. `GroundBaselineEntry`, append-only.
   *
   * The candidates are the lead's own session-one entries: they choose which of the things they
   * already said describe the starting point. There is no update and no delete, because a corrected
   * baseline stops being a record of what people believed at the start.
   */
  baselineEntryCandidates: (groundId: string) =>
    apiClient.get<{
      candidates: { text: string; type: string }[]
      alreadyRecorded: { text: string; capturedAtSession: number; createdAt: string }[]
    }>(`/grounds/${groundId}/baseline-entries/candidates`).then(r => r.data),

  recordBaselineEntries: (groundId: string, texts: string[]) =>
    apiClient.post<{ text: string; capturedAtSession: number; createdAt: string }[]>(
      `/grounds/${groundId}/baseline-entries`, { texts },
    ).then(r => r.data),

  baselineEntries: (groundId: string) =>
    apiClient.get<{
      entries: { text: string; capturedAtSession: number; createdAt: string }[]
      completedSessions: number
      canShowMovement: boolean
      frozenReason: string
    }>(`/grounds/${groundId}/baseline-entries`).then(r => r.data),

  contextChat: (groundId: string, history: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient
      .post<{
        reply: string
        gaps: string[]
        done: boolean
        /** Something concrete the lead can confirm. Null when there is nothing to write. */
        proposal: { gap: string; say: string } | null
      }>(`/grounds/${groundId}/context-chat`, { history })
      .then(r => r.data),
}
