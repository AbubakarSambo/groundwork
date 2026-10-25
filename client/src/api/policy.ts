import { apiClient } from './client'

/** RELEASE 9: the policy board, and setting up from documents (api modules/policy). */
export interface ThePolicyBoard {
  title: string
  intro: string
  areas: { area: string; heading: string; rules: { id: string; says: string; facts: string }[] }[]
  undecided: { title: string; says: string }[]
  empty: string | null
}
export interface ADisagreement { measure: string; area: string; title: string; says: string; choices: { ruleId: string; value: string; label: string }[] }
export interface TheSetup {
  title: string
  intro: string
  added: string | null
  decideFirst: ADisagreement[]
  areas: { area: string; heading: string; says: string; from: string; approved: boolean; waitsOn: string | null }[]
  noDocuments: string
  /** Rules that name somebody who holds no role yet, so approving cannot make them a setting. */
  cannotBeSetYet?: string[]
}
const data = <T,>(r: any) => ((r.data as any)?.data ?? r.data) as T

export const policyApi = {
  board: () => apiClient.get('/policy').then((r) => data<{ on: boolean; mayChange?: boolean; board?: ThePolicyBoard }>(r)),
  setup: () => apiClient.get('/policy/setup').then((r) => data<{ on: boolean; setup: TheSetup }>(r)),
  addDocument: (body: { name: string; text: string }) => apiClient.post('/policy/documents', body).then((r) => data<{ on: boolean; setup: TheSetup }>(r)),
  decide: (ruleId: string) => apiClient.post('/policy/decide', { ruleId }).then((r) => data<{ on: boolean; setup: TheSetup }>(r)),
  approve: (area: string) => apiClient.post('/policy/approve', { area }).then((r) => data<{ on: boolean; setup: TheSetup }>(r)),
}
