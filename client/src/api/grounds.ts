import { apiClient } from './client'
import type { Ground } from '@/types'

export type GroundScenario =
  | 'NEW_HIRE' | 'NEW_COFOUNDER' | 'NEW_ADVISOR'
  | 'NEW_PROJECT' | 'NEW_MANAGER' | 'CONTRACT_RENEWAL'
  | 'RECOGNITION' | 'DRIFT' | 'CRISIS_ALIGNMENT'
  | 'OKR_ALIGNMENT' | 'WORKPLAN_BUDGET' | 'PULSE_CHECK'
  | 'REALIGN_TEAM' | 'PIP' | 'BOARD_STRATEGY' | 'COHORT_CHECK'

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

  create: (body: CreateGroundBody) =>
    apiClient.post<Ground>('/grounds', body).then(r => r.data),

  createForLead: (body: CreateGroundForLeadBody) =>
    apiClient.post<Ground>('/grounds/for-lead', body).then(r => r.data),

  confirmLead: (groundId: string, edits?: { brief?: string }) =>
    apiClient.post<{ groundId: string; checkInId: string }>(`/grounds/${groundId}/confirm-lead`, edits ?? {}).then(r => r.data),

  getOrgRoster: () =>
    apiClient.get<OrgRosterEntry[]>('/grounds/org-roster').then(r => r.data),

  addParticipant: (groundId: string, body: AddParticipantBody) =>
    apiClient.post(`/grounds/${groundId}/participants`, body).then(r => r.data),

  addLeadContext: (groundId: string, body: { participantId?: string; text: string }) =>
    apiClient.post(`/grounds/${groundId}/lead-context`, body).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<Ground>(`/grounds/${groundId}/activate`).then(r => r.data),

  resendParticipantInvite: (groundId: string, participantId: string) =>
    apiClient.post(`/grounds/${groundId}/participants/${participantId}/resend-invite`).then(r => r.data),

  getMediatorBrief: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/mediator-brief`).then(r => r.data),

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
}
