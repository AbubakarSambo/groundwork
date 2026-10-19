export interface UserOrganization {
  id: string
  name: string
  slug: string
  careFeeStatus: string
  email: string | null
  companyStage: string | null
  subscriptionPlan: string | null
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  /** LEAD opens check-ins without admin powers; GUEST is somebody from another organisation
   *  who was added to one of your check-ins. The type said 'ADMIN' | 'MEMBER' and both of the
   *  others were already reachable. */
  role: 'ADMIN' | 'LEAD' | 'MEMBER' | 'GUEST'
  organizationId: string
  organizationName?: string
  /** Server-decided: does this person still have to set their organisation up. See App.tsx. */
  mustSetUpOrganisation?: boolean
  organization?: UserOrganization
  jobTitle?: string
  isPlatformAdmin?: boolean
  /**
   * Whether this person may open a check-in here, decided server side by the one rule that decides
   * it. A convenience for the screen, never a permission: the API asks again on every create.
   */
  mayOpenCheckIns?: boolean
  emailNotifications?: boolean
  /** True when they stopped these emails from the link in one of our mails. The switch turns it back on. */
  emailsStoppedFromAMail?: boolean
  phoneNumber?: string | null
  /**
   * "Connect WhatsApp" (decision 106, 5 October, night): a one-tap link that opens WhatsApp with
   * "Hi" already typed to Groundwork's number. An optional convenience, never something a person
   * must do to get their check-ins - the engine serves it only while it would actually work, and
   * null once there is nothing to offer. See `ConnectWhatsApp`.
   */
  connectWhatsApp?: ConnectWhatsApp | null
}

/**
 * "Connect WhatsApp" (decision 106): `says` is the button's own label, `link` opens WhatsApp with
 * "Hi" already typed to Groundwork's number, and `number` is there to show if wanted. Served on
 * `GET /auth/me` and on the person's own `GET /check-ins/:id/transcript`, nowhere else.
 */
export interface ConnectWhatsApp {
  link: string
  number: string
  says: string
}

export type GroundScenario =
  | 'ROLE_HANDOVER'
  | 'TEAM_UPDATES'
  | 'DISCOVERY'
  | 'CONTRACT_REVIEW'
  | 'IMPLEMENTATION_TRACKING'
  | 'NEW_HIRE'
  | 'NEW_COFOUNDER'
  | 'NEW_ADVISOR'
  | 'NEW_PROJECT'
  | 'NEW_MANAGER'
  | 'CONTRACT_RENEWAL'
  | 'RECOGNITION'
  | 'DRIFT'
  | 'CRISIS_ALIGNMENT'
  | 'OKR_ALIGNMENT'
  | 'WORKPLAN_BUDGET'
  | 'PULSE_CHECK'
  | 'REALIGN_TEAM'
  | 'PIP'
  | 'BOARD_STRATEGY'
  | 'COHORT_CHECK'
  | 'ACUTE_SHOCK'
  | 'OPEN_READ'
  /** Collect what's owed (Release 2): offered only where the organisation's Release 2 switch is on. */
  | 'COLLECTIONS'

export type GroundMoment = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'

export type GroundStatus =
  | 'AWAITING_LEAD'
  | 'OPEN'
  | 'AWAITING_PARTIES'
  | 'REPORT_READY'
  | 'ACTIVE'
  | 'RESOLVED'
  | 'STALLED'
  | 'PAUSED'
  | 'CLOSED'

export type PartyType = 'INITIATOR' | 'PARTICIPANT'

export type CheckInStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED'

export interface GroundParticipant {
  id: string
  // null when contact-hiding is on and the viewer is a peer (not self, not the initiator)
  email: string | null
  partyType: PartyType
  userId: string | null
  roleAsDescribed?: string | null
  /** The name they typed at the end of an open-link check-in; they have no sign-in to carry one. */
  nameGiven?: string | null
  /** Whether they asked for the report. Null where nobody asked them. */
  wantsTheReport?: boolean | null
  // display name of the linked user (null for a not-yet-accepted invite)
  user?: { firstName: string | null; lastName: string | null } | null
  // "my account is accurate" confirmation - the deadline for corrections, in
  // place of a timer. Null until the participant signs off.
  signedOffAt?: string | null
  /**
   * WHAT THIS PERSON IS WORKING TOWARDS, with its authorship attached. `PersonObjective`.
   *
   * `described` and `mayBeReadAgainst` come from the server so the caveat cannot be dropped in
   * transit: "your objective is X" and "your manager has suggested X and you have not replied" are
   * different statements, and the second must never be read against anybody.
   */
  objective?: {
    text: string | null
    authoredBy: 'lead' | 'self' | null
    seenBySubject: boolean
    state: 'none' | 'proposed' | 'accepted' | 'their own'
    described: string
    mayBeReadAgainst: boolean
    updatedAt?: string | null
    /**
     * THE PRIMITIVE. What SHAPE of thing this is, how anybody would know it happened, and by when.
     *
     * An expectation used to be one untyped sentence, so a session could not press on a to-do
     * differently from a standing role expectation. `check` is the axis that matters most:
     * NOT_CHECKABLE is a real value, and the page says so plainly rather than letting an
     * unmeasurable sentence sit there looking like a target somebody failed.
     */
    kind?: 'TODO' | 'COMMITMENT' | 'TARGET' | 'GOAL' | 'SUCCESS_DEFINITION' | 'ROLE_EXPECTATION' | 'REFERENCE' | null
    check?: 'DONE_OR_NOT' | 'A_NUMBER' | 'A_JUDGEMENT' | 'NOT_CHECKABLE' | null
    dueKind?: 'A_DATE' | 'A_CYCLE' | 'STANDING' | 'NOT_SAID' | null
    /** Their own words for the deadline. Never a parsed date. */
    dueSaid?: string | null
    /** COMMITMENT only: who is waiting on it. */
    owedToParticipantId?: string | null
  } | null
}

export interface CheckInSummary {
  id: string
  participantId: string
  sessionNumber: number
  status: CheckInStatus
  completedAt?: string | null
  availableFrom?: string | null
}

export interface GroundSignal {
  id: string
  groundId: string
  sessionNum: number
  type: 'Convergence' | 'Divergence' | 'Pattern'
  /** Deprecated - use observationText */
  text?: string
  code?: string
  observationText?: string
  lastPeriodNumber?: number | null
  lastSeenAt?: string | null
  confidenceDelta: string | null
  createdAt: string
}

export interface LeadContextNote {
  id: string
  participantId: string | null
  text: string
  createdAt: string
}

export interface Ground {
  id: string
  initiatorId: string
  /**
   * WHO THE VIEWER IS TO THIS CHECK-IN, from the side that enforces it. The client rebuilt these
   * from initiatorId and role in three places and disagreed with the server at the edges (A12).
   * Optional only because a list row does not carry them; the ground read always does.
   */
  viewerIsInitiator?: boolean
  viewerRunsThisGround?: boolean
  label: string
  /**
   * WHEN THIS ONE STARTED, so two check-ins that share one label can be told apart (walkthrough
   * pass 2, item 1: "Help a new hire get started, from 27 September" listed three times in the
   * sidebar with nothing to tell them apart). The server has always sent both on every list row
   * (Prisma's default scalar selection); only the client's own type left them out.
   */
  startsAt?: string | null
  createdAt?: string
  scenario: GroundScenario
  moment: GroundMoment
  status: GroundStatus
  timelineDays: number
  cadence: string
  /**
   * The days a check-in may open on. 0 is Sunday. Empty means nobody said, which is not the same as
   * every day: the date stays where the cadence put it and the form says so, rather than assuming a
   * Monday-to-Friday office week that field teams and much of the region do not keep.
   */
  workingDays?: number[]
  /**
   * What the report actually holds: areas agreed, areas still open. Null when
   * there is no read yet. Replaced `confidence?: number`, which was a count of
   * completed check-ins rendered as "5/5 Aligned".
   */
  alignment?: { agreed: number; open: number } | null
  resolutionState?: string | null
  brief?: string | null
  // initiator toggle: when true (default) participants cannot see each other's email
  restrictExternalVisibility?: boolean
  /**
   * Whether the parties actually see each other's work. Null means nobody has
   * said, and the scenario supplies the default. Decides whether the board's
   * fairness reads have anything to stand on.
   */
  peopleWorkTogether?: boolean | null
  daysLeft?: number | null
  /** The day this ends, from the start on record and how long it runs; null where it has no fixed length. */
  endsOn?: string | null
  /**
   * REQUEST 206: whether this check-in's lead has left the organisation, and whether this viewer
   * may change its setup - the same rule `GET /grounds/:id` already serves as `mayChangeSetup`,
   * now on every row of the list too, worked out for the viewer who asked for it
   * (`who-may-rename-a-check-in.ts`).
   */
  leadHasLeft?: boolean
  mayChangeSetup?: boolean
  checkInsToday?: number
  overdue?: number
  contextNotes?: string[]
  participants: GroundParticipant[]
  /**
   * The lead's first name alone, sent to anyone in the check-in - even a participant on a check-in
   * that hides everyone else. Her own row is filtered out of `participants` then, which used to
   * mean the only three sentences naming her ("Rukia knows who is here", "Rukia also answers a
   * check-in") fell back to "Your lead" (U.8 fourth review). Null when there is no lead account yet.
   */
  leadFirstName?: string | null
  /** Whether the lead is a party who answers a check-in herself, not only someone who manages it. */
  leadAnswersToo?: boolean
  /**
   * Whether more than one party answers this check-in - a plain yes/no, never a count, so a check-in
   * that hides peers from each other does not learn its own size from this field (U.8 fifth review).
   * Read from the raw participants, unaffected by that filter, unlike the old `howManyAnswer(ground) > 1`.
   */
  aTeamReportComes?: boolean
  /**
   * Whether this round already has two people counted in it - a plain yes/no, from the same raw
   * participants as `aTeamReportComes`, unaffected by the peer-hiding filter (U.8 fifth review).
   */
  atLeastTwoInThisRound?: boolean
  leadContextNotes?: LeadContextNote[]
  /**
   * WHAT PEOPLE ARE DOWN AS DOING. `participantId` null means nobody owns it, which is most of what
   * comes out of a paste and is left as it is rather than put on the nearest person. `status` is
   * UNKNOWN until a person says otherwise - nothing here is the product's judgement.
   */
  /** `settledAt`: when the commitment was marked DONE/NOT_DONE/DROPPED - null while open. Review
      round 3, item 5: added so "promises kept this month" can count by when it was settled. */
  commitments?: { id: string; participantId: string | null; text: string; whenSaid: string | null; explicit: boolean; status: string; settledAt?: string | null }[]
  checkIns?: CheckInSummary[]
  signals?: GroundSignal[]
  /**
   * THE CHECK-IN'S OWN CLOCK (B-112, night note item 5). The same count the board already uses
   * (request 101 f): `currentSession`/`plannedSessions` are the open round, capped at the plan;
   * `says` is the prototype's own header sentence ("Session 2 of 12."); `whileOpen` is a second,
   * true sentence for when a later session has started for some people while an earlier one is
   * still open for others ("Session 3 has started for some people, while session 2 is still
   * open."), and null otherwise. Both are kept as two sentences on purpose - draw them together.
   */
  sessionClock?: {
    currentSession: number
    plannedSessions: number | null
    says: string
    whileOpen: string | null
  }
  report?: { id: string; releasedAt: string | null; releasedSessions?: number[] | null; createdAt?: string } | null
  sessionProgress?: {
    sessionNumber: number
    total: number
    completed: number
    missingParticipantIds: string[]
    requestingUserIsMissing: boolean
  } | null
  sessionsBalance?: number
  isFreeGround?: boolean
  joinToken?: string | null
  createdByUserId?: string | null
  org?: {
    subscriptionPlan: string | null
    subscriptionStatus: string | null
    freeExtensionUsed: boolean
  } | null
}

export interface ConversationTurn {
  id: string
  role: 'AI' | 'PERSON'
  content: string
  createdAt: string
}

export interface Report {
  id: string
  groundId: string
  // Legacy flat fields
  sharedPicture: string
  agreements: string[]
  divergences: { topic: string; positions: { participantLabel: string; view: string }[]; evidence?: string[] }[]
  centralQuestion: string
  engagement?: {
    coverage: 'thin' | 'moderate' | 'strong'
    documentBacked: boolean
    note: string
    parties: { label: string; sessions: number; recordEntries: number; documentsAttached: number; contributed: boolean }[]
    hiddenContributors?: { label: string; evidence: string }[]
    concernFlags?: { label: string; observation: string }[]
    specificityCauses?: { label: string; cause: 'behavioral' | 'misunderstanding' | 'adversarial' | 'unclear' | 'declined_by_choice'; note: string }[]
  } | null
  // Spec payload fields (cross-ref / resolution report)
  pattern?: string
  status?: { band: string; basis: string; level: number }
  reached?: { title: string; note: string }[]
  areas?: { title: string; observation: string; why?: string; recommendation?: string }[]
  agreed?: string[]
  close?: { aligned?: string; open?: string; revisit?: string; risk?: string }
  docline?: string
  permanence?: string
  // Cross-reference report fields (EntryReport shape)
  alignmentReached?: { title: string; note: string }[]
  areasRequiringAlignment?: { title: string; observation: string; whyItMatters?: string; recommendedMove?: string }[]
  soloArtifact?: { summary: string; whatToCarry?: string } | null
  // Participant report fields
  assumptions?: string[]
  clarity?: string[]
  questions?: string[]
  privacy?: string
  inferences?: ReportInference[] | null
  releasedAt: string | null
  createdAt: string
}

export interface ReportInference {
  id: string
  text: string
  participantLabel: string
  reason: string
  dismissed?: boolean // client-side only: user said "this is right"
}
