import { apiClient } from './client'
import type { GroundStatus } from '@/types'

export interface Resolution {
  id: string
  groundId: string
  endState: string
  confirmedByInitiator: boolean
  confirmedByParticipant: boolean
  closedAt: string | null
}

export interface ResolutionState {
  resolution: Resolution | null
  options: { value: string; label: string }[]
  groundStatus: GroundStatus
}

export const resolutionApi = {
  get: (groundId: string) =>
    apiClient.get<ResolutionState>(`/grounds/${groundId}/resolution`).then((r) => r.data),
  propose: (groundId: string, endState: string) =>
    apiClient.post<Resolution>(`/grounds/${groundId}/resolution`, { endState }).then((r) => r.data),
}
