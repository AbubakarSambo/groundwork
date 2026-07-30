import { apiClient } from './client'

export type BoardSection =
  | 'phaseSpine' | 'quickRead' | 'objectives' | 'startingState' | 'divergence'
  | 'whoOwnsWhat' | 'dependencies' | 'checkInGrid' | 'contribution' | 'coverage'
  | 'patterns' | 'decisions' | 'meetings' | 'poll'

export type BoardFamily = 'DELIVERY' | 'COHORT' | 'ONBOARDING' | 'EVALUATION' | 'SENSING'
export type CoverageVariant = 'text' | 'bar'

/** A private-mode or sensing-family ground has no board, and says why. */
export type BoardAbsent = {
  groundId: string
  renders: false
  mode: 'PRIVATE' | 'SHARED'
  family: BoardFamily
  reason: string
}

export type BoardPresent = {
  groundId: string
  renders: true
  mode: 'SHARED'
  family: BoardFamily
  sections: BoardSection[]
  title: string
  scenario: string
  coverageVariant: CoverageVariant
  /** Which participant row is the caller, so only their own poll chip is clickable. */
  myParticipantId: string | null
  readOnlyNote: string
  participants: { id: string; name: string | null; role: string | null; managingOnly: boolean; signedOffAt: string | null }[]

  phaseSpine?: { startsAt: string | null; endsAt: string | null; currentSession: number; sessions: { n: number; state: string; date: string | null }[] }
  quickRead?: { label: string; value: string; sub: string; tone: string }[]
  objectives?: {
    id: string; name: string; count: number; prevCount: number; target: number | null; delta: number; isNew: boolean
    askedOf: { participantId: string; name: string | null; asked: boolean }[] | null
  }[]
  divergence?: { items: any[]; agreements: any[]; centralQuestion: string | null; pointer: string }
  whoOwnsWhat?: { participantId: string; name: string | null; role: string | null; items: { id: string; type: string; text: string; sessionNumber: number | null }[] }[]
  dependencies?: { id: string; from: string | null; what: string; on: string | null; status: 'BLOCKING' | 'WAITING' | 'CLEARED'; then: string | null }[]
  checkInGrid?: { sessions: number[]; rows: { participantId: string; name: string | null; role: string | null; managingOnly: boolean; cells: Record<string, string> }[] }
  contribution?: {
    participantId: string; name: string | null; remit: string | null; remitDefined: boolean
    position: 'beyond' | 'at' | 'below' | null; positionLabel?: string; reason: string | null
    fnLabel?: string | null; fnConfident?: boolean; isBlocked?: boolean; ownVoice?: string | null
    note?: string; guard?: string
  }[]
  coverage?: {
    scope: string
    reads: {
      participantId: string; name: string | null; scope: string; pct: number
      kind: 'LEAKING' | 'ABSORBING' | 'STABLE'; trend: string; what: string
      reason: string; reasonText: string; ownVoice: string | null
      coupledToBlocker: boolean; remitDefined: boolean
    }[]
  }
  patterns?: { code: string; text: string; periods: number }[]
  decisions?: { question: string; why: string; owner: string; source: 'blocker' | 'divergence' }[]
  meetings?: { id: string; happenedAt: string; present: (string | null)[]; missed: (string | null)[]; notes: string }[]
  poll?: { id: string; question: string; options: { id: string; label: string; who: (string | null)[]; whoIds: string[]; count: number }[] } | null
}

export type BoardResponse = BoardAbsent | BoardPresent

export const boardApi = {
  get: (groundId: string, coverage?: CoverageVariant) =>
    apiClient
      .get<BoardResponse>(`/grounds/${groundId}/board`, {
        params: coverage ? { coverage } : undefined,
        skipNotFoundToast: true,
      } as any)
      .then((r) => r.data),

  /** The only editable thing on the board. */
  togglePoll: (groundId: string, optionId: string) =>
    apiClient
      .post<{ optionId: string; available: boolean; count: number }>(`/grounds/${groundId}/board/poll/${optionId}/toggle`)
      .then((r) => r.data),
}
