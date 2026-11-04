import { apiClient } from './client'

/** RELEASE 6: the company's direction, each team's brief, and each person's recommitment (api modules/direction). */
export interface DirectionRead {
  on: boolean
  mayChange?: boolean
  direction?: null | {
    version: number
    setOn: string
    setBy: string | null
    now: { title: string; says: string }[]
    whatChanged: { n: number; label: string; says: string }[]
    teams: { groundId: string; title: string; says: string; tag: string; approved: boolean; youLeadIt?: boolean }[]
    realigned: { title: string; says: string }[]
    nextCheckOn: string
    revisions: { version: number; setOn: string; says: string }[]
  }
}
export interface TeamsBrief {
  team: string
  lead: string | null
  says: string
  items: { verb: string; says: string; tone: 'rec' | 'att' | 'con' }[]
  unclear: string | null
  approvedSays: string | null
  questionsNow: string[]
  mayChange: boolean
  raw?: { items: { verb: string; what: string; whoParticipantId?: string | null }[]; unclear?: string | null; questionsNow?: { asks: string; replaces?: string | null }[] } | null
}
const data = <T,>(r: any) => ((r.data as any)?.data ?? r.data) as T

export const directionApi = {
  read: () => apiClient.get('/direction').then((r) => data<DirectionRead>(r)),
  setNew: (body: { now: Record<string, string>; whatChanged: Record<string, string>; teams: { groundId: string; means: string }[] }) => apiClient.put('/direction', body).then((r) => data<DirectionRead>(r)),
  mine: () => apiClient.get('/direction/mine').then((r) => data<{ goals: { id: string; groundId: string; name: string; target: number | null; team: string | null; decided: string | null }[]; stopped: { name: string; outcome: string }[] }>(r)),
  recommit: (body: { objectiveId: string; outcome: 'continue' | 'change' | 'stop'; newName?: string; newTarget?: number | null }) => apiClient.post('/direction/recommit', body).then((r) => data<{ outcome: string; says: string }>(r)),
  brief: (groundId: string) => apiClient.get(`/direction/teams/${groundId}`).then((r) => data<TeamsBrief>(r)),
  setBrief: (groundId: string, body: { items: { verb: string; what: string; whoParticipantId?: string | null }[]; unclear?: string; questionsNow?: { asks: string; replaces?: string }[] }) => apiClient.put(`/direction/teams/${groundId}/brief`, body).then((r) => data<TeamsBrief>(r)),
  approve: (groundId: string, means?: string) => apiClient.post(`/direction/teams/${groundId}/approve`, means ? { means } : {}).then((r) => data<DirectionRead>(r)),
}
