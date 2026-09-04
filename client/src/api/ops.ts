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

export interface OpsOpportunity {
  id: string
  stage: string
  estimatedValue: string | null
  nextAction: string | null
  nextActionDueAt: string | null
  lastActivityAt: string | null
  lostReason: string | null
  company: { name: string }
  campaign: { title: string } | null
}

export interface OpsDeployment {
  id: string
  stage: string
  startDate: string
  targetLiveDate: string | null
  blockerType: string | null
  blockerSummary: string | null
  nextAction: string | null
  firstUseAt: string | null
  company: { name: string }
}

export interface OpsRoadmapItem {
  id: string
  title: string
  itemType: string
  priority: number
  status: string
  approvalRequired: boolean
  targetDate: string | null
  rationale: string | null
}

export interface OpsUseCase {
  id: string
  title: string
  productReadiness: string
  productGap: string | null
  uxGap: string | null
  technicalGap: string | null
  nextAction: string | null
  company: { name: string }
}

export interface OpsWorkItem {
  id: string
  title: string
  severity: string
  status: string
  itemType?: string
  affectedFlow?: string | null
  blockerReason?: string | null
  targetDate?: string | null
}

export interface OpsObjective {
  id: string
  title: string
  workstream: string | null
  status: string
  keyResults: Array<{
    id: string
    title: string
    target: number
    unit: string
    current: number
    progress: number | null
    typedByHand: boolean
    says: string
    problem?: string
    dueDate: string
  }>
}

export interface OpsCommitment {
  id: string
  title: string
  status: string
  blocked: boolean
  blockerReason: string | null
  dueDate: string
  target: number | null
  unit: string | null
  current: number
  typedByHand: boolean
  says: string
  actualResult: string | null
}

export interface OpsExpense {
  id: string
  date: string
  description: string
  category: string
  amount: string
  status: string
  rejectedReason: string | null
}

export interface OpsBalance {
  earned: number
  paid: number
  approvedNotPaid: number
  awaitingDecision: number
  remaining: number
  says: string
  nobodyCanApprove: Array<{ id: string; description: string; amount: number; why: string }>
}

export interface OpsFundraise {
  opportunities: Array<{
    id: string
    funderName: string
    fundingType: string
    stage: string
    askAmount: string | null
    committedAmount: string | null
    closedAmount: string | null
    nextAction: string | null
    nextActionDueAt: string | null
    applicationDeadline: string | null
  }>
  totals: { active: number; askedFor: number; committed: number; closed: number; overdue: number }
}

export interface OpsStrategic {
  id: string
  personOrNetwork: string
  organization: string | null
  opportunityType: string
  status: string
  nextStep: string | null
  nextStepDueAt: string | null
  convertedToType: string | null
}

export interface OpsCampaign {
  id: string
  title: string
  activityType: string
  channel: string | null
  status: string
  startDate: string
  opportunities: Array<{ company: { name: string }; stage: string }>
}

export interface OpsIntegrationStatus {
  configured: boolean
  enabled: boolean
  baseUrl?: string | null
  clientId?: string | null
  secretSet?: boolean
  lastSyncAt?: string | null
  lastSyncOk?: boolean | null
  lastSyncSummary?: string | null
  says: string
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

  pipeline: () => apiClient.get<OpsOpportunity[]>('/ops/pipeline').then((r) => r.data),
  deployments: () => apiClient.get<OpsDeployment[]>('/ops/deployments').then((r) => r.data),
  campaigns: () => apiClient.get<OpsCampaign[]>('/ops/campaigns').then((r) => r.data),
  roadmap: () => apiClient.get<OpsRoadmapItem[]>('/ops/roadmap').then((r) => r.data),
  useCases: () => apiClient.get<OpsUseCase[]>('/ops/use-cases').then((r) => r.data),
  tech: () => apiClient.get<OpsWorkItem[]>('/ops/tech').then((r) => r.data),
  ux: () => apiClient.get<OpsWorkItem[]>('/ops/ux').then((r) => r.data),
  objectives: (periodKey: string) =>
    apiClient.get<OpsObjective[]>(`/ops/objectives/${periodKey}`).then((r) => r.data),
  commitments: (personKey: string, periodKey: string) =>
    apiClient.get<OpsCommitment[]>(`/ops/commitments/${personKey}/${periodKey}`).then((r) => r.data),
  spend: () => apiClient.get<OpsExpense[]>('/ops/spend').then((r) => r.data),
  balance: () => apiClient.get<OpsBalance>('/ops/balance').then((r) => r.data),
  fundraise: () => apiClient.get<OpsFundraise>('/ops/fundraise').then((r) => r.data),
  strategy: () => apiClient.get<OpsStrategic[]>('/ops/strategy').then((r) => r.data),
  integration: () => apiClient.get<OpsIntegrationStatus>('/ops/integration').then((r) => r.data),
  pushToGroundwork: (period: string) =>
    apiClient.post('/ops/integration/push', null, { params: { period } }).then((r) => r.data),
}
