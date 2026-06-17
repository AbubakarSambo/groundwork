export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MEMBER'
  organizationId: string
  organizationName?: string
  isPlatformAdmin?: boolean
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

export type GroundMoment = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'

export type GroundStatus =
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
  specificityLevel?: string | null
  recallConfidence?: string | null
  specificityDimensions?: Record<string, string> | null
}

export interface GroundSignal {
  id: string
  groundId: string
  sessionNum: number
  type: 'Convergence' | 'Divergence' | 'Pattern'
  text: string
  confidenceDelta: string | null
  createdAt: string
}

export interface Ground {
  id: string
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
  sharedPicture: string
  agreements: string[]
  divergences: { topic: string; positions: { participantLabel: string; view: string }[]; evidence?: string[] }[]
  centralQuestion: string
  engagement?: Record<string, any> | null
  soloArtifact?: { summary: string; whatToCarry?: string } | null
  releasedAt: string | null
  createdAt: string
}
