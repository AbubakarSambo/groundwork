export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MEMBER'
  organizationId: string
  organizationName?: string
  jobTitle?: string
  isPlatformAdmin?: boolean
  emailNotifications?: boolean
  phoneNumber?: string | null
}

export type GroundScenario =
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
  email: string
  partyType: PartyType
  userId: string | null
  roleAsDescribed?: string | null
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

export interface Ground {
  id: string
  initiatorId: string
  label: string
  scenario: GroundScenario
  moment: GroundMoment
  status: GroundStatus
  timelineDays: number
  cadence: string
  confidence?: number
  resolutionState?: string | null
  brief?: string | null
  daysLeft?: number | null
  checkInsToday?: number
  overdue?: number
  contextNotes?: string[]
  participants: GroundParticipant[]
  checkIns?: CheckInSummary[]
  signals?: GroundSignal[]
  report?: { id: string; releasedAt: string | null; createdAt?: string } | null
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
