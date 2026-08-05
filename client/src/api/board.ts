import { apiClient } from './client'

export type BoardSection =
  | 'phaseSpine' | 'quickRead' | 'objectives' | 'startingState' | 'divergence'
  | 'whoOwnsWhat' | 'dependencies' | 'checkInGrid' | 'contribution' | 'coverage'
  | 'patterns' | 'decisions' | 'poll'

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
  /**
   * Whether the people here see each other's work. Set by the lead; the kind of
   * ground is only the fallback. Decides whether anyone is in a position to
   * confirm anyone else's account.
   */
  peopleWorkTogether?: boolean
  /** Which participant row is the caller, so only their own poll chip is clickable. */
  myParticipantId: string | null
  /** Whether the caller may set targets and the poll question (initiator only). */
  canEditFrame: boolean
  readOnlyNote: string
  participants: { id: string; name: string | null; role: string | null; managingOnly: boolean; signedOffAt: string | null }[]

  phaseSpine?: { startsAt: string | null; endsAt: string | null; currentSession: number; sessions: { n: number; state: string; date: string | null }[] }
  quickRead?: { label: string; value: string; sub: string; tone: string }[]
  objectives?: {
    id: string; name: string; count: number; prevCount: number; target: number | null; delta: number; isNew: boolean
    askedOf: { participantId: string; name: string | null; asked: boolean }[] | null
    /** What the record suggests, when it disagrees with the lead's number. Never applied automatically. */
    suggestedCount: number | null
  }[]
  /** Shown to the lead when no targets exist, because nothing else prompts for them. */
  objectivesPrompt?: string
  divergence?: { items: any[]; agreements: any[]; centralQuestion: string | null; pointer: string }
  whoOwnsWhat?: { participantId: string; name: string | null; role: string | null; items: { id: string; type: string; text: string; sessionNumber: number | null }[] }[]
  dependencies?: { id: string; from: string | null; what: string; on: string | null; status: 'BLOCKING' | 'WAITING' | 'CLEARED'; then: string | null }[]
  checkInGrid?: { sessions: number[]; rows: { participantId: string; name: string | null; role: string | null; managingOnly: boolean; cells: Record<string, string> }[] }
  contribution?: {
    participantId: string; name: string | null; remit: string | null; remitDefined: boolean
    /** Always null. There is deliberately no on-track/below-track label - see board.service.ts. */
    position: null; positionLabel?: string | null; reason: string | null
    fnLabel?: string | null; fnConfident?: boolean; isBlocked?: boolean; ownVoice?: string | null
    note?: string; guard?: string
    /**
     * How much this read rests on, and whether it clears the floor to be shown
     * at all. A confident sentence about a person built on two data points is
     * the one a manager remembers, so a thin read is withheld rather than hedged.
     */
    confidence?: number; evidenceCount?: number; shown?: boolean; basis?: string
  }[]
  coverage?: {
    scope: string
    reads: {
      participantId: string; name: string | null; scope: string; pct: number
      kind: 'LEAKING' | 'ABSORBING' | 'STABLE'; trend: string; what: string
      reason: string; reasonText: string; ownVoice: string | null
      coupledToBlocker: boolean; remitDefined: boolean
      confidence?: number; evidenceCount?: number; shown?: boolean; basis?: string
    }[]
  }
  managerAlignment?: {
    managerParticipantId: string; managerName: string | null
    /** One of the MANAGEMENT role map's failure patterns. */
    pattern: string
    /** CONTROL and ABDICATION need opposite responses, so the pole is shown. */
    pole: 'CONTROL' | 'ABDICATION' | 'NEITHER'
    label: string; gap: string; note: string
    /** How many periods it was visible across. One is never a pattern. */
    periods: number
  }[]
  /** label is null for a code this build does not recognise - show nothing rather than a raw key. */
  patterns?: { code: string; label: string | null; text: string; periods: number }[]
  decisions?: { question: string; why: string; owner: string; source: 'blocker' | 'divergence' }[]
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

  /** Initiator only: the lead's frame. A target, never an assessment of a person. */
  createObjective: (groundId: string, dto: { name: string; target?: number | null }) =>
    apiClient.post(`/grounds/${groundId}/board/objectives`, dto).then((r) => r.data),

  updateObjective: (groundId: string, objectiveId: string, dto: { name?: string; target?: number | null; count?: number }) =>
    apiClient.patch(`/grounds/${groundId}/board/objectives/${objectiveId}`, dto).then((r) => r.data),

  deleteObjective: (groundId: string, objectiveId: string) =>
    apiClient.delete(`/grounds/${groundId}/board/objectives/${objectiveId}`).then((r) => r.data),

  /** Initiator only: set the availability question and the times. */
  upsertPoll: (groundId: string, dto: { question: string; options: string[] }) =>
    apiClient.post(`/grounds/${groundId}/board/poll`, dto).then((r) => r.data),

  /** Availability is logistics, so every party can set their own. */
  togglePoll: (groundId: string, optionId: string) =>
    apiClient
      .post<{ optionId: string; available: boolean; count: number }>(`/grounds/${groundId}/board/poll/${optionId}/toggle`)
      .then((r) => r.data),
}
