import { apiClient } from './client'
import type { GroundStatus, PartyType } from '@/types'

export interface Resolution {
  id: string
  groundId: string
  endState: string
  closedAt: string | null
}

export interface ResolutionConfirmation {
  participantId: string
  label: string
  partyType: PartyType
  endState: string | null
  confirmed: boolean
}

export interface ResolutionState {
  resolution: Resolution | null
  confirmations: ResolutionConfirmation[]
  confirmedCount: number
  totalActive: number
  options: { value: string; label: string }[]
  groundStatus: GroundStatus
}

export const resolutionApi = {
  get: (groundId: string) =>
    apiClient.get<ResolutionState>(`/grounds/${groundId}/resolution`).then((r) => r.data),
  propose: (groundId: string, endState: string) =>
    apiClient.post<ResolutionState>(`/grounds/${groundId}/resolution`, { endState }).then((r) => r.data),
}
