import { apiClient } from './client'
import type { Ground } from '@/types'
import type { ServedPattern } from './patterns'

export interface Delivery {
  id: string
  text: string
  evidence: string | null
  objectiveId: string | null
  createdAt: string
  /** Set once a session has raised it. Until then it is still waiting to be asked about. */
  carriedIntoCheckInId: string | null
}


/** One card the server read out of a plan, as it sends it. */
export interface PlanCard {
  id: string
  kind: string
  says: string
  heading: string
  landsIn: string
  from: string
  fromThePlan: string
  note?: string
  whichWay?: string
  directionSuggested?: string
  /** One of the targets read from the lead's own check-in: shown together, as one card (Hafsah, 18 October). */
  fromYourCheckIn?: boolean
  /** The day she said it, as YYYY-MM-DD. */
  saidOn?: string | null
  /** Groundwork's own suggestion, quoting nobody: no quotation and no Edit (the stall rule, standing decision 4). */
  suggested?: boolean
  fields?: { what?: string; number?: number; personName?: string; personOnTheCheckIn?: string; participantId?: string }
}

export type GroundScenario =
  | 'TEAM_UPDATES'
  | 'DISCOVERY'
  | 'NEW_HIRE' | 'ROLE_HANDOVER' | 'NEW_COFOUNDER' | 'NEW_ADVISOR'
  | 'CONTRACT_REVIEW' | 'IMPLEMENTATION_TRACKING'
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
  /** Their address, or leave it out and send `colleagueId` for somebody picked from the list (U.4). */
  email?: string
  colleagueId?: string
  roleAsDescribed?: string
  /** Optional, never inferred; blank means blank. */
  department?: string
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


export interface OrgRosterEntry {
  id: string
  label: string
  scenario: GroundScenario
  status: string
  cadence: string
  createdByAdmin: boolean
  lead: { id: string; firstName: string; lastName: string; email: string }
  memberCount: number
  members: { email: string; partyType: 'INITIATOR' | 'PARTICIPANT'; roleAsDescribed: string | null; accepted: boolean }[]
  contributedParties: number
  report: { agreementsCount: number; differencesCount: number; releasedAt: string | null } | null
  lastActivity: string | null
}

/** "Out of time" (U.3): where a check-in that ran past its end date stands, for a person taking part. */
export interface MoreTimeStanding {
  outOfTime: boolean
  checkInName: string
  leadFirstName: string | null
  ranUntil: string | null
  /** Set when they already asked today. */
  askedAt: string | null
  /** "All 38 of your check-ins" (item 11): check-ins (Grounds) this person has ever been part of,
      never sessions (CheckIn rounds) within them. */
  checkInsCount: number
}

export const groundsApi = {
  /** "Check in yourself" (decision 133): opens, or reuses, the lead's own check-in, any time it is running. */
  checkInYourself: (id: string) =>
    apiClient.post<{ checkInId: string; sessionNumber: number; opened: boolean }>(`/grounds/${id}/check-in-yourself`).then(r => r.data),
  /** "Ask Wairimu for more time" (U.3). */
  moreTime: (id: string) =>
    apiClient.get<MoreTimeStanding>(`/grounds/${id}/more-time`).then(r => r.data),
  askForMoreTime: (id: string) =>
    apiClient.post<{ asked: true; askedAt: string }>(`/grounds/${id}/more-time`).then(r => r.data),

  list: () =>
    apiClient.get<Ground[]>('/grounds').then(r => (Array.isArray(r.data) ? r.data : [])),

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
  /* And `skipForbiddenToast` for the same reason. A 403 here stacked "Access denied" on top of
     the report page's own sentence — two different explanations of one event, one of them a toast
     that outlives the page. The page says which of the four situations this is now; see
     pages/report/why-you-cannot-see-this.ts. */
  get: (id: string) =>
    apiClient.get<Ground>(`/grounds/${id}`, { skipNotFoundToast: true, skipForbiddenToast: true } as any).then(r => r.data),

  /**
   * The one finding the shared picture names as still open, in a whole sentence, as this reader is served it (request 198). `finding` is null
   * until the picture is released to this reader, and the call is refused for somebody with no right to the check-in.
   */
  finding: (id: string) =>
    apiClient.get<{ groundId: string; label: string; sessionNumber: number | null; finding: string | null; moreStillOpen: number; conversationWorthHaving: string | null }>(
      `/grounds/${id}/report/finding`, { skipNotFoundToast: true, skipForbiddenToast: true } as any,
    ).then(r => r.data),

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

  /*
   * Whether people see each other's numbers, and whether a blocker comes with having tried. Both
   * columns were read in two places each and written by nothing, so their careful defaults
   * described a choice nobody in the product could make. See the service.
   */
  setWhoSeesTargets: (id: string, everybody: boolean) =>
    apiClient
      .patch<{ id: string; whoSeesTargets: 'THEIR_OWN' | 'EVERYBODY' }>(`/grounds/${id}/who-sees-targets`, { everybody })
      .then(r => r.data),

  /* Three states: true on WhatsApp, false in Groundwork, null whatever the organisation does. */
  setOverWhatsApp: (id: string, over: boolean | null) =>
    apiClient
      .patch<{ id: string; overWhatsApp: boolean | null }>(`/grounds/${id}/over-whatsapp`, { over })
      .then(r => r.data),

  /**
   * "USE SIMPLER WORDS" (6 October answer). `false` for every check-in that exists and for a new
   * one. Only the lead of the check-in, or an admin who runs it, may change it - the server refuses
   * anybody else.
   */
  setSimplerWords: (id: string, on: boolean) =>
    apiClient
      .patch<{ id: string; simplerWords: boolean }>(`/grounds/${id}/simpler-words`, { on })
      .then(r => r.data),

  /**
   * THE KIND OF WORK THIS CHECK-IN IS ABOUT (request 76), and its own stage names. Only the lead,
   * or an admin of the organisation, can change it. `kind: null` clears it back to none. A name
   * that is not one of the eleven kinds is refused with a plain sentence, shown as the server gives
   * it. A later read never overwrites the lead's own choice.
   */
  setKindOfWork: (id: string, body: { kind?: string | null; stages?: string[] | null }) =>
    apiClient
      .patch<{ id: string; kindOfWork: string | null; kindOfWorkSetBy: string | null; workStages: string[] | null }>(`/grounds/${id}/kind-of-work`, body)
      .then(r => r.data),

  setExpectThemToUnblock: (id: string, expect: boolean) =>
    apiClient
      .patch<{ id: string; expectThemToUnblock: boolean }>(`/grounds/${id}/expect-them-to-unblock`, { expect })
      .then(r => r.data),

  // Initiator-only: whether participants can see each other's email. restrict=true hides.
  setExternalVisibility: (id: string, restrict: boolean) =>
    apiClient.patch<{ id: string; restrictExternalVisibility: boolean }>(`/grounds/${id}/external-visibility`, { restrict }).then(r => r.data),

  /**
   * REMINDERS (People and setup, "How it runs"). `PATCH /grounds/:id/chasing` has existed since the
   * chasing cron read `chaseAfterDays`/`chasingStopped`/`tellTheLead`, and nothing on any screen ever
   * wrote to it - so whether this check-in reminds people, on which day, and whether the lead hears
   * who never started, could not be set from the product. Whoever set the check-in up only.
   */
  setChasing: (id: string, body: { days?: number[]; stopped?: boolean; tellTheLead?: boolean }) =>
    apiClient
      .patch<{ days: number[]; stopped: boolean; tellTheLead: boolean }>(`/grounds/${id}/chasing`, body)
      .then(r => r.data),

  /*
   * `create` USED TO SIT HERE, and it went with the flow that called it.
   *
   * `/grounds/new` was a form whose last screen posted to POST /grounds. It is a picker now, and it
   * hands the rest to the setup conversation - so the only thing that creates a check-in in this app
   * is POST /entry/commit, which the conversation's save calls. An uncalled client method is exactly
   * what every-endpoint-has-a-caller.spec.ts is for.
   *
   * THE SERVER ROUTE STAYS, and that is not an oversight: the public API opens check-ins through
   * `GroundsService.create`, and so does the entry commit that replaced this. What has gone is one
   * client's way of reaching it.
   */

  /*
   * `createForLead` USED TO SIT HERE, and it went with the answer that reached it.
   *
   * The set-up wizard's third answer - "Someone else sets the context" - posted to /grounds/for-lead
   * so a named lead could be invited to confirm a context somebody else had written. Her call
   * removed that answer, so nothing in this app creates a for-lead check-in any more and an
   * uncalled client method is exactly what every-endpoint-has-a-caller.spec.ts is for.
   *
   * THE SERVER ROUTE STAYS, and that is not an oversight: the public API still opens check-ins for
   * a named lead (grounds-by-api.service.ts). A customer's server naming somebody is a different
   * act from a person in the room handing their own situation away - there is no room.
   */

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

  /*
   * `addLeadContext` IS GONE FROM THE CLIENT, and the route is not.
   *
   * It served the three write boxes on the Context page, removed on 22 September 2026: "that section
   * needs to go since you can all do everything from the context chat." The conversation writes
   * context now, and one line of it is changed by `changeContextLine`. The server route stays for
   * the API and for the notes already written through it, which the page still reads.
   */

  /**
   * Share one private note with everybody on the check-in. One note, one deliberate act: what a
   * paste writes is the lead's own words, and "we sort of agreed" must not become the team's rules
   * by accident. The server refuses a note about one named person.
   */
  shareLeadContext: (groundId: string, noteId: string) =>
    apiClient.post(`/grounds/${groundId}/lead-context/${noteId}/share`).then(r => r.data),

  /**
   * One line of what a check-in knows: reworded, shared, made private, or retired. A line about a
   * person can never be shared - the server refuses that rather than trusting the screen.
   */
  /**
   * Add one line of what this check-in knows, typed in rather than said in the chat.
   *
   * The chat is still the way in - it asks the follow-up a form cannot. This is the door for a
   * check-in where the chat is off, which until now showed five empty buckets each pointing at a
   * conversation that was not there.
   */
  addContextLine: (groundId: string, line: { kind: string; text: string; audience?: 'LEAD_ONLY' | 'EVERYONE' }) =>
    apiClient.post(`/grounds/${groundId}/context`, line).then(r => r.data),

  changeContextLine: (groundId: string, itemId: string, change: { text?: string; audience?: 'LEAD_ONLY' | 'EVERYONE'; closed?: boolean }) =>
    apiClient.patch(`/grounds/${groundId}/context/${itemId}`, change).then(r => r.data),

  /**
   * A to-do's state, set by the person it belongs to. The lead cannot mark somebody else's work
   * done - that is the difference between a record and a manager's checklist.
   */
  setMyCommitment: (groundId: string, itemId: string, status: 'DONE' | 'NOT_DONE' | 'DROPPED') =>
    apiClient.patch(`/grounds/${groundId}/commitments/${itemId}`, { status }).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<Ground>(`/grounds/${groundId}/activate`).then(r => r.data),

  // Begin the closing session: every participant's next session is flagged
  // final (same conversation, closing framing, arc-aware final report).
  beginClosingSession: (groundId: string) =>
    apiClient.post<{ groundId: string; closingSession: boolean; participantsFlagged: number }>(`/grounds/${groundId}/closing-session`).then(r => r.data),

  resendParticipantInvite: (groundId: string, participantId: string) =>
    apiClient.post(`/grounds/${groundId}/participants/${participantId}/resend-invite`).then(r => r.data),

  /** D1 and D2 (13 October, evening): whoever runs the check-in adds somebody's WhatsApp number. */
  /** Each person's WhatsApp number and where they are on it (whoever runs the check-in, or an admin). */
  whereEachPersonIsOnWhatsApp: (groundId: string) =>
    apiClient.get<{ participantId: string; phone: string | null; whatsapp: 'no-number' | 'not-connected' | 'waiting' | 'connected'; says: string }[]>(`/grounds/${groundId}/participants/whatsapp`).then(r => (r.data as any)?.data ?? r.data),
  addTheirWhatsAppNumber: (groundId: string, participantId: string, phone: string) =>
    apiClient.patch<{ said: string }>(`/grounds/${groundId}/participants/${participantId}/whatsapp-number`, { phone }).then(r => r.data),

  /** Each person from their invitation to coming back on their own (whoever runs the check-in, or an admin). */
  whereEachPersonIsGettingStarted: (groundId: string) =>
    apiClient.get<{ stages: string[]; people: { participantId: string; name: string; team: string | null; reached: number; says: string; needsYou?: { what: 'the address'; email: string | null } }[] }>(`/grounds/${groundId}/participants/getting-started`).then(r => (r.data as any)?.data ?? r.data),
  /** People and setup as this reader may read it (Release 1B, pull request 1 of 3). `{ on: false }` while the switch is off. */
  peopleAndSetup: (groundId: string) =>
    apiClient.get<PeopleAndSetup>(`/grounds/${groundId}/people-and-setup`).then(r => (r.data as any)?.data ?? r.data),

  /** References and resources as this reader may read it (Release 1B, pull request 2 of 3). `{ on: false }` while the switch is off. */
  referencesAndResources: (groundId: string) =>
    apiClient.get<ReferencesAndResources>(`/grounds/${groundId}/references-and-resources`).then(r => (r.data as any)?.data ?? r.data),
  /** One page of the evidence this reader may read: 25 to a page, newest first, with search and filters. */
  referencesEvidence: (groundId: string, q: { page?: number; q?: string; group?: string; person?: string; when?: string }) =>
    apiClient.get<AnEvidencePage | { on: false }>(`/grounds/${groundId}/references-and-resources/evidence`, { params: q }).then(r => (r.data as any)?.data ?? r.data),
  /** The lead adds a line (the server refuses anybody else). */
  addAReference: (groundId: string, body: { kind: AReferenceKind; text: string; label?: string; aboutParticipantId?: string }) =>
    apiClient.post(`/grounds/${groundId}/references-and-resources/lines`, body).then(r => (r.data as any)?.data ?? r.data),
  /** The lead rewords or removes a line (the server refuses anybody else). */
  changeAReference: (groundId: string, lineId: string, body: { text?: string; label?: string; closed?: boolean }) =>
    apiClient.patch(`/grounds/${groundId}/references-and-resources/lines/${lineId}`, body).then(r => (r.data as any)?.data ?? r.data),

  /** My work: one person's page in this check-in, for that person or the lead (Release 1B, pull request 3 of 3). `{ on: false }` while the switch is off. */
  myWork: (groundId: string, person?: string | null) =>
    apiClient.get<MyWork>(`/grounds/${groundId}/my-work`, { params: person ? { person } : {} }).then(r => (r.data as any)?.data ?? r.data),

  getMediatorBrief: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/mediator-brief`).then(r => r.data),

  /** Whether the team's report shares itself at a time of day ("18:30"); null is off (Hafsah, 18 October 2026). */
  setReportSharesAt: (groundId: string, time: string | null) =>
    apiClient.patch<{ id: string; reportSharesAt: string | null }>(`/grounds/${groundId}/report-shares-at`, { time }).then(r => r.data),

  setPeopleWorkTogether: (groundId: string, together: boolean) =>
    apiClient.patch<{ id: string; peopleWorkTogether: boolean }>(`/grounds/${groundId}/people-work-together`, { together }).then(r => r.data),

  /*
   * The rail's rename says what did and did not survive, so the generic toasts are turned off for
   * it - otherwise one failed rename produced two notifications, the useful one and "Something
   * went wrong".
   */
  /** `startsAt` is an ISO date; the server refuses it once anybody has answered. */
  /** `brief` blank clears it; the server refuses both to anybody but the lead or an org admin. */
  /** `cadenceAnchorDay`: 0-6 (Sunday-Saturday) for a weekly or fortnightly rhythm, 1-31 for a
      monthly one, `null` to clear it (request 194). Applies from the next session that is made. */
  update: (groundId: string, body: { label?: string; timelineDays?: number; cadence?: GroundCadence; workingDays?: number[]; cadenceAnchorDay?: number | null; contextNote?: string; startsAt?: string; brief?: string; endsOn?: string }, opts?: { quiet?: boolean }) =>
    apiClient.patch<Ground>(`/grounds/${groundId}`, body, opts?.quiet
      ? ({ skipForbiddenToast: true, skipServerErrorToast: true } as any)
      : undefined).then(r => r.data),

  getMySpecificity: (groundId: string) =>
    apiClient.get<{
      scores: number[]
      label: string
      trend: 'rising' | 'steady' | 'falling' | 'new'
      whatWouldHelp: string | null
      /** Which of the five would move them most, so the row itself can carry the mark. */
      mostUseful: { dimension: string; says: string } | null
      strongest: string | null
    }>(`/grounds/${groundId}/my-specificity`).then(r => r.data),

  getMyRecord: (groundId: string) =>
    apiClient.get<{
      sessions: { sessionNumber: number; completedAt: string | null; status: string }[]
      specificity: { scores: number[]; avg: number; label: string } | null
      confidence: { score: number; label: string; description: string } | null
      /** Your own patterns, and nobody else's. See api/src/modules/patterns/who-reads-a-pattern.ts. */
      patterns: ServedPattern[] | null
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
  /* `signOff` removed with the control that called it. The confirmation step at the foot of My
     record was furniture on a page nobody had been asked to confirm anything on; the column and the
     server route stay, so a corrected-after-sign-off record still reads correctly. */
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
        checkIns: { id: string; sessionNumber: number; status: string; completedAt: string | null; availableFrom?: string | null }[]
        latestStatus: string | null
        latestSessionNumber: number | null
        /** The organisation's zone, and when the next one opens by the schedule before its row exists. */
        zone?: string | null
        nextOpensAt?: string | null
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
  /**
   * Deleting a check-in that was only ever a test. Its lead alone, and only while nobody else has
   * given an account - the server refuses with a sentence naming who, which the page shows.
   */
  remove: (groundId: string) =>
    apiClient.delete<{ deleted: boolean; label: string }>(`/grounds/${groundId}`).then(r => r.data),

  stateBaseline: (groundId: string, body: { successLooksLike?: string; conditions?: string[]; changeReason?: string }) =>
    apiClient.post<{ version: number; successLooksLike: string | null; conditions: string[]; changeReason: string | null; effectiveFrom: string }>(
      `/grounds/${groundId}/baseline`, body,
    ).then(r => r.data),

  baselineHistory: (groundId: string) =>
    apiClient.get<{ version: number; successLooksLike: string | null; conditions: string[]; changeReason: string | null; effectiveFrom: string }[]>(
      `/grounds/${groundId}/baseline`,
    ).then(r => (Array.isArray(r.data) ? r.data : [])),

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
        timelineDays: number | null; cadence: string | null; cadenceStated?: boolean; timelineStated?: boolean; createdBy: string
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
  /* The conversation goes with it so a pronoun can be resolved on the server - "give her 3,000
     units" names nobody on its own. Still only sentences: no id, no value. */
  confirmContext: (groundId: string, said: string, history?: { role: 'user' | 'assistant'; content: string }[]) =>
    apiClient
      .post<{ changed: string; say: string }>(`/grounds/${groundId}/context-chat/confirm`, { said, history })
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
    ).then(r => (Array.isArray(r.data) ? r.data : [])),

  baselineEntries: (groundId: string) =>
    apiClient.get<{
      entries: { text: string; capturedAtSession: number; createdAt: string }[]
      completedSessions: number
      canShowMovement: boolean
      frozenReason: string
    }>(`/grounds/${groundId}/baseline-entries`).then(r => r.data),

  /** A plan, pasted or already a document on the check-in, read into separate cards. Nothing is stored until a yes. */
  readAPlan: (groundId: string, input: { text?: string; documentId?: string }) =>
    apiClient.post<{ proposals: PlanCard[]; says: string }>(`/grounds/${groundId}/plan/proposals`, input).then(r => r.data),
  /** "Waiting for you to confirm": the cards still waiting. The lead's only. */
  planCardsWaiting: (groundId: string) =>
    apiClient.get<{ proposals: PlanCard[] }>(`/grounds/${groundId}/plan/proposals`).then(r => r.data),
  confirmPlanCard: (groundId: string, cardId: string, direction?: string | null) =>
    apiClient.post(`/grounds/${groundId}/plan/proposals/${cardId}/confirm`, direction ? { direction } : {}).then(r => r.data),
  planCardNotNow: (groundId: string, cardId: string) =>
    apiClient.post(`/grounds/${groundId}/plan/proposals/${cardId}/not-now`).then(r => r.data),
  editPlanCard: (groundId: string, cardId: string, says: string) =>
    apiClient.patch<PlanCard>(`/grounds/${groundId}/plan/proposals/${cardId}`, { says }).then(r => r.data),
  /** A target from the lead's own check-in, corrected: what it counts and its number, as she types them. */
  correctATargetCard: (groundId: string, cardId: string, fields: { what: string; number: number | null }) =>
    apiClient.patch<PlanCard>(`/grounds/${groundId}/plan/proposals/${cardId}`, { fields }).then(r => r.data),

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

/** People and setup, as the server serves it to this reader (api grounds/people-and-setup.ts). */
export type ASetupProblem = { participantId: string; says: string; fix: 'fix-the-address' | 'add-a-number' | 'add-their-role' | 'let-them-in' | 'view-plans' | null }
export type PeopleAndSetup =
  | { on: false }
  | { on: true; view: 'member'; howItRuns: string; yourRole: string; status: string; yourSessionsDone: number; sessionsPlanned: number | null; runsIt: string | null; whoSeesWhat: string }
  | { on: true; view: 'reader'; howItRuns: string; runsIt: string | null }
  | { on: true; view: 'lead' | 'admin'; howItRuns: string; problems: ASetupProblem[]; sessions: string; joinedWithTheLink: string; kindOfWork: string | null; kindsOffered: string[]; othersWithAccess: string; runsIt: string | null; organisationName: string; roleDescribed: Record<string, boolean> }

/** References and resources, as the server serves it to this reader (api grounds/references-and-resources.ts). */
export type AReferenceKind = 'RULE' | 'STAGE_NEEDS' | 'COACHING' | 'RISK' | 'KEY_FACT' | 'PERSON_NOTE' | 'HELP_WITH'
export type AReferenceLine = { id: string; text: string; fromTheTemplate?: boolean; onlyYou?: boolean }
export type APieceOfEvidence = { id: string; readAs: string; shows: string | null; belongsTo: string; addedBy: string; addedById: string | null; addedOn: string; on: string; countsAsProof: boolean; group: 'Orders and quotes' | 'Payments' | 'Photos' | 'Other documents' }
export type AnEvidencePage = { total: number; page: number; pageSize: number; items: APieceOfEvidence[]; people: { id: string; name: string }[] }
export type AReferenceDocument = { id: string; name: string; added: string; addedOn: string; summary: string | null; whoCanSee: string; kind: 'Photos' | 'Spreadsheets' | 'PDFs' | 'Documents' }
export type ReferencesAndResources =
  | { on: false }
  | {
      on: true
      view: 'lead' | 'member' | 'admin' | 'reader'
      checkInName: string
      leadName: string | null
      topLine: string
      mayAdd: boolean
      itemWord: string
      about: { purpose: string | null; whose: string | null; keyFacts: { id: string; label: string; fact: string }[]; alsoWorthKnowing: AReferenceLine[]; emptySays: string | null; yourOwnWords?: string }
      suggested?: { id: string; what: string; from: string; says: string; saidAs: string }[]
      howWeWork: { rules: AReferenceLine[]; stageNeeds: AReferenceLine[]; coaching: AReferenceLine[]; risks: AReferenceLine[]; startingSetSays: string | null }
      documents: { total: number; items: AReferenceDocument[]; notOpenToYou: boolean } | null
      evidence: AnEvidencePage | null
      evidenceSays: string
      questions: { total: number; items: { asked: string; answer: string; who: string }[]; emptySays: string }
      people?: { participantId: string; name: string; role: string | null; note: AReferenceLine | null; helpWith: AReferenceLine | null; earlier: string[] }[]
    }

/** My work, as the server serves it to this reader (api board/my-work.ts). */
export type ABehaviourRead = { key: string; name: string; verdict: 'Strength' | 'Needs work' | 'Not enough yet'; happened: string; means: string | null; toImprove: string | null; basedOn: string | null }
export type MyWork =
  | { on: false }
  | {
      on: true
      view: 'self' | 'lead'
      checkInName: string
      person: { participantId: string; name: string; firstName: string }
      people?: { participantId: string; name: string }[]
      heading: string
      topLine: string
      numbers: { value: string; label: string }[]
      focus: { line: string; why: string } | null
      focusEmpty: string
      toDo: {
        othersNeed: { id: string; text: string; when: string }[]
        own: { id: string; text: string; when: string | null; done: boolean; late: boolean; whose: string | null }[]
        emptySays: string
      }
      achieved: { items: { text: string; proof: string }[]; note: string; emptySays: string }
      performing: { note: string; behaviours: ABehaviourRead[]; libraryNote: string }
      coaching: { better: { text: string; from: string }[]; keep: string[]; betterEmpty: string; keepEmpty: string }
      checkIns: { heading: string; due: number; done: number; onTime: number; specific: number; emptySays: string | null }
      reports: { heading: string; items: { checkInId: string; when: string; line: string }[]; emptySays: string; private?: string }
      items: { heading: string; note: string; itemWord: string; rows: { id: string; name: string; stage: string | null; next: string; nextBooked: boolean; proof: string; proven: boolean }[]; emptySays: string }
    }
