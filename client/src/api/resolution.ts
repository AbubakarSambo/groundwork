import { apiClient } from './client'

export interface ResolutionState {
  current: string | null
  validEndStates: string[]
  proposed?: { by: string; state: string } | null
}

export const resolutionApi = {
  get: (groundId: string) =>
    apiClient.get<ResolutionState>(`/grounds/${groundId}/resolution`).then(r => r.data),

  propose: (groundId: string, endState: string) =>
    apiClient.post(`/grounds/${groundId}/resolution`, { endState }).then(r => r.data),

  counter: (groundId: string, endState: string) =>
    apiClient.post(`/grounds/${groundId}/resolution/counter`, { proposedEndState: endState }).then(r => r.data),
}
