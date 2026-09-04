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
  phoneNumber?: string | null
}

export type GroundScenario =
  | 'ROLE_HANDOVER'
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
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  status: GroundStatus
  timelineDays: number
  cadence: string
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
  checkInsToday?: number
  overdue?: number
  contextNotes?: string[]
  participants: GroundParticipant[]
  leadContextNotes?: LeadContextNote[]
  checkIns?: CheckInSummary[]
  signals?: GroundSignal[]
  report?: { id: string; releasedAt: string | null; createdAt?: string } | null
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
