import { apiClient } from './client'

/**
 * The back office the Groundwork team runs on.
 *
 * A separate system that happens to share a deployment, so it gets its own file
 * rather than being folded into `admin.ts` — the admin API is Groundwork
 * operating Groundwork; this is our company operating itself.
 */

export interface OpsIdentity {
  personId: string
  key: string
  displayName: string
  functionalRole: string
  capabilities: string[]
}

export interface OpsNumber {
  key: string
  label: string
  shape: 'count' | 'sum' | 'derived'
  counts: string
  value: number
  unit: string
  says: string
  rows: Array<Record<string, unknown>>
}

export interface OpsBoard {
  key: string
  name: string
  answers: string
  numbers: OpsNumber[]
  personalPanels: string[]
  hiddenFromYou: string[]
}

export interface OpsBoardListing {
  lands: string | null
  boards: Array<{
    key: string
    name: string
    answers: string
    yours: boolean
    numbersYouCanSee: number
    personalPanels: string[]
  }>
}

export interface OpsStanding {
  person: { key: string; displayName: string }
  qualifyingLine: string
  targets: Array<{
    period: string
    periodKey: string
    targetCount: number
    dueDate: string
    isSprintExpectation: boolean
    countedSoFar: number
  }>
  counted: Array<{ company: string; qualifyingStatus: string; introducedAt: string }>
  notYetCounting: Array<{ company: string; qualifyingStatus: string }>
}

export interface OpsSprintBoard {
  period: { key: string; name: string; startsOn: string; endsOn: string; goal: string | null }
  companies: Array<{
    id: string
    key: string
    name: string
    stage: string
    nextAction: string | null
    nextActionDueAt: string | null
    blockerSummary: string | null
    broughtBy: Array<{ contributor: string; qualifyingStatus: string }>
    useCaseReadiness: Array<{ title: string; readiness: string }>
    deploymentStage: string | null
    deploymentBlocker: string | null
  }>
  counts: {
    total: number
    byStage: Record<string, number>
    productReady: number
    notProductReady: Array<{ name: string; why: string[] }>
    blocked: string[]
    withoutANextAction: string[]
  }
}

export interface OpsTodo {
  id: string
  title: string
  status: 'OPEN' | 'DONE' | 'CANCELLED'
  dueDate: string | null
}

export const opsApi = {
  me: () => apiClient.get<OpsIdentity>('/ops/me').then((r) => r.data),
  boards: () => apiClient.get<OpsBoardListing>('/ops/boards').then((r) => r.data),
  board: (key: string, period: string) =>
    apiClient.get<OpsBoard>(`/ops/boards/${key}`, { params: { period } }).then((r) => r.data),
  periods: () => apiClient.get<Array<{ key: string; name: string; kind: string }>>('/ops/periods').then((r) => r.data),
  sprint: (periodKey: string) =>
    apiClient.get<OpsSprintBoard>(`/ops/sprint/${periodKey}`).then((r) => r.data),
  standing: (personKey: string) =>
    apiClient.get<OpsStanding>(`/ops/standing/${personKey}`).then((r) => r.data),
  todos: (personKey: string) => apiClient.get<OpsTodo[]>(`/ops/todos/${personKey}`).then((r) => r.data),
  closeTodo: (id: string, status: 'DONE' | 'CANCELLED') =>
    apiClient.patch<OpsTodo>(`/ops/todos/${id}/status`, { status }).then((r) => r.data),
  approvals: () =>
    apiClient
      .get<Array<{ id: string; approvalType: string; requestSummary: string; createdAt: string }>>('/ops/approvals')
      .then((r) => r.data),
  decide: (id: string, status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED', decisionNote?: string) =>
    apiClient.patch(`/ops/approvals/${id}`, { status, decisionNote }).then((r) => r.data),
}
