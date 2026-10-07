import { apiClient } from './client'
import type { AxiosRequestConfig } from 'axios'

/**
 * Every back-office call opts out of the generic error toasts.
 *
 * The refusals ARE the product here. "That company is already here at LINED_UP",
 * "still has a product gap recorded, clear it or say it is not one", "this needs
 * sales:write" — each is specific, actionable, and rendered next to the thing it
 * refers to.
 *
 * Without this, a 403 also raised "Access denied · You do not have permission to
 * perform this action" in the corner. Two messages, and the louder one was
 * wrong: James DOES have the capability, and what actually stopped him was a
 * gap he had written down himself. Seen on screen, not in the code.
 */
const QUIET: AxiosRequestConfig = {
  skipForbiddenToast: true,
  skipNotFoundToast: true,
  skipServerErrorToast: true,
}

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
  /** The clock the boards date themselves by; set into the date formatter once known (B10). */
  displayTimezone?: string
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
    isTargetListExpectation: boolean
    countedSoFar: number
  }>
  counted: Array<{ company: string; qualifyingStatus: string; introducedAt: string }>
  notYetCounting: Array<{ company: string; qualifyingStatus: string }>
}

export interface OpsTargetCompaniesBoard {
  period: { key: string; name: string; startsOn: string; endsOn: string; goal: string | null }
  companies: Array<{
    id: string
    key: string
    name: string
    stage: string
    storedStage: string
    summaryIsStale: boolean
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

export interface OpsDeployment {
  id: string
  stage: string
  startDate: string
  targetLiveDate: string | null
  blockerType: string | null
  blockerSummary: string | null
  nextAction: string | null
  firstUseAt: string | null
  company: { key: string; name: string }
}

export interface OpsRoadmapItem {
  /** A standing item is not a proposal — it is the frame the proposals sit in. */
  standing: boolean
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
  company: { key: string; name: string }
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
    justification: string | null
    approach: string | null
    says: string
    problem?: string
    dueDate: string
    /* The rows behind the figure. Always sent, and until now dropped on the
       floor by the page — so "3 of 10 qualified" could not be checked against
       the three. */
    rows: Array<Record<string, unknown>>
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
  /** Whose claim it is. Everybody sees everybody's, so every row needs a name. */
  requesterName: string
  requesterKey: string | null
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
  objectiveId: string | null
  objective: string | null
  linkedObjective: { id: string; title: string; serves: string | null } | null
  /** What this campaign is serving, said rather than scored. Null when nothing needs saying. */
  alignment: string | null
}

export interface OpsWorkplan {
  today: { running: string[]; next: string | null; says: string }
  phases: Array<{
    key: string
    name: string
    intent: string
    startsOn: string
    endsOn: string
    running: boolean
    exitCondition: string
    exitMetric: string | null
    exitTarget: number | null
    permitsOperability: boolean
    /** False when the exit is a sentence rather than a number, which is recorded, not hidden. */
    checkable: boolean
    says: string
  }>
}

export interface OpsResourceCheck {
  claim: string
  kind: 'IS' | 'IS_NOT'
  verdict: 'CLEAR' | 'SAYS_WHAT_WE_ARE_NOT' | 'NEEDS_A_LOOK'
  says: string
}

export interface OpsResource {
  id: string
  title: string
  category: string
  categoryDetail: string | null
  url: string | null
  risks: string[]
  addedAt: string
  checks: OpsResourceCheck[] | null
  checkSays: string | null
  checkedAt: string | null
  /** A count out of a count, never a percentage, and every claim opens. */
  standing: { clear: number; checked: number; flagged: string[]; says: string }
  /** Set when the words it was checked against have since changed. */
  stale: string | null
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

export interface OpsCompanyDetail {
  company: {
    id: string
    key: string
    name: string
    stage: string
    owner: string | null
    source: string | null
    primaryContactName: string | null
    primaryContactEmail: string | null
    nextAction: string | null
    nextActionDueAt: string | null
    blockerSummary: string | null
    liveAt: string | null
    notes: string | null
    createdAt: string
  }
  broughtBy: Array<{
    contributor: string
    /* Sent all along and unused: the display name cannot address the route that
       moves an introduction along, and the key can. */
    contributorKey: string
    sourceType: string
    sourceDetail: string | null
    introducedAt: string
    qualifyingStatus: string
  }>
  useCases: Array<{
    id: string
    title: string
    productReadiness: string
    productGap: string | null
    uxGap: string | null
    technicalGap: string | null
    expectedWorkflow: string | null
  }>
  opportunities: Array<{
    id: string
    stage: string
    estimatedValue: string | null
    nextAction: string | null
    lostReason: string | null
    campaign: { title: string } | null
  }>
  deployments: Array<{
    id: string
    stage: string
    blockerType: string | null
    blockerSummary: string | null
    targetLiveDate: string | null
    firstUseAt: string | null
    firstResultAt: string | null
  }>
  activity: Array<{
    id: string
    kind: string
    domain: string
    happenedAt: string
    note: string | null
    by: string | null
  }>
}

export interface OpsPerson {
  id: string
  key: string
  displayName: string
  email: string | null
  functionalRole: string
  active: boolean
  hasAnAccount: boolean
  capabilities: string[]
  holdsNothing: boolean
}

export interface OpsMoat {
  title: string
  building: string
  loop: string
  privacyFraming: string
  privacy: string
  privacyArchitecture: string
  acquirer: string
  components: Array<{
    key: string
    ordinal: number
    name: string
    statement: string
    built: number
    entries: Array<{
      id: string
      title: string
      description: string | null
      evidenceUrl: string | null
      builtAt: string
      by: string | null
    }>
  }>
  untouched: string[]
}

export interface OpsLedger {
  person: { key: string; displayName: string; functionalRole: string }
  note: string
  origination: {
    qualifiedOpportunities: number
    pipelineValue: number
    payingClients: number
    mrr: number
    arr: number
    cashCollected: number
    retained3Month: number
    retained6Month: number
    retained12Month: number
    creditsEarned: number
    creditsPossible: number
    clients: Array<{ company: string; opportunity: string; stage: string; cash: number; credit: string }>
  }
  positioning: {
    introductions: number
    qualifiedAccess: number
    qualifiedOpportunities: number
    payingClients: number
    revenue: number
    retained6Month: number
  }
  entitlement: {
    originatorShare: number
    eligibleCash: number
    percent: number | null
    months: number | null
    says: string
  }
  notCounting: Array<{ opportunity: string; company: string; why: string | null }>
}

export interface OpsShareOfRevenue {
  total: number
  unattributed: number
  says: string
  rows: Array<{ person: string; personKey: string; revenue: number; share: number | null; clients: number }>
}

export interface OpsCommercialOpportunity {
  id: string
  name: string
  stage: string
  originatorState: string
  positioningState: string
  opportunityOriginatorId: string | null
  positioningSourceId: string | null
  estimatedContractValue: string | null
  actualMrr: string | null
  firstPaymentAt: string | null
  nextAction: string | null
  nextActionDueAt: string | null
  company: { key: string; name: string }
  payments: Array<{ amount: string; paidAt: string }>
}

/** One person's row on the one board. Every count on it is their own. */
export interface OpsEverybodyRow {
  personId: string
  key: string
  displayName: string
  functionalRole: string
  objectives: {
    id: string
    title: string
    serves: string | null
    status: string
    unjustifiedKeyResults: number
  }[]
  commitments: { total: number; closed: number; missed: number; blocked: number; overdue: number }
  sales: { originated: number; positioned: number; newRevenueCents: number }
  product: { total: number; byServes: Record<string, number> }
  says: string[]
}

export interface OpsEverybody {
  period: { key: string; name: string; from: string; to: string }
  quarter: { people: number; withoutAnObjective: string[]; ready: boolean; says: string }
  people: OpsEverybodyRow[]
}

export interface OpsClaim {
  id: string
  claimant: string
  role: string
  company: string
  opportunity: string
  claimedBasis: string
  evidenceUrl: string | null
  recordCreatedAt: string
  claimedAt: string
}

export interface OpsPositioningRecord {
  id: string
  contributor: string | null
  personOrNetwork: string
  organization: string | null
  accessType: string
  stage: string
  openedAt: string
  evidenceUrl: string | null
}

export interface OpsCommercialOverview {
  separates: string
  questions: Array<{ n: number; question: string; from: string }>
  performance: {
    totalPipeline: number
    qualifiedPipeline: number
    newCustomers: number
    newMrr: number
    newArr: number
    cashCollected: number
    retained3Month: number
    retained6Month: number
    retained12Month: number
    conversion: number | null
    throughPositioning: number
  }
  functionHealth: {
    livePipeline: number
    pipelineValue: number
    overdueFollowUps: number
    withNothingPlanned: number
    attributionUnresolved: number
    says: string
  }
  share: OpsShareOfRevenue | null
  positioning: Array<{
    contributor: string | null
    personOrNetwork: string
    organization: string | null
    accessType: string
    stage: string
  }>
  /*
   * `Omit` rather than an intersection. The overview spreads the ledger and
   * overwrites `person` with a display name, so intersecting the two makes that
   * field `never` - which TypeScript accepts silently and which fails the first
   * time somebody renders it.
   */
  ledgers: Array<Omit<OpsLedger, 'person'> & { person: string; personKey: string; itIsTheirJob: boolean }>
  claimsWaiting: number | null
}

export const opsApi = {
  me: () => apiClient.get<OpsIdentity>('/ops/me', QUIET).then((r) => r.data),
  /* Walking in is the write: a read of the back office no longer puts a platform admin on the roster; this does (A15). */
  enter: () => apiClient.post<{ onTheRoster: boolean; as: string | null }>('/admin/ops/enter', undefined, QUIET).then((r) => r.data),
  boards: () => apiClient.get<OpsBoardListing>('/ops/boards', QUIET).then((r) => r.data),
  /** What Groundwork has told us: the webhooks that arrived, and the ones that did not verify. */
  groundworkEvents: () =>
    apiClient
      .get<{ events: { kind: string; verified: boolean; receivedAt: string; says: string | null }[]; says: string }>(
        '/ops/groundwork/events',
        QUIET,
      )
      .then((r) => r.data),
  board: (key: string, period: string) =>
    apiClient.get<OpsBoard>(`/ops/boards/${key}`, { ...QUIET, params: { period } }).then((r) => r.data),
  periods: () =>
    apiClient
      .get<Array<{ key: string; name: string; kind: string; startsOn: string; endsOn: string; goal: string | null; status: string }>>(
        '/ops/periods',
        QUIET,
      )
      .then((r) => r.data),
  /** Start a list over any stretch of time. Target lists only — a quarter is the calendar. */
  startATargetList: (body: { name: string; startsOn: string; endsOn: string; goal?: string }) =>
    apiClient.post('/ops/periods', body, QUIET).then((r) => r.data),
  /** Move its dates, rename it, open or close it. The key never moves. */
  resetATargetList: (
    key: string,
    body: { name?: string; startsOn?: string; endsOn?: string; goal?: string | null; status?: string },
  ) => apiClient.patch(`/ops/periods/${key}`, body, QUIET).then((r) => r.data),
  /** Every company, or only the ones on one target list. */
  allCompanies: (targetListKey?: string) =>
    apiClient
      .get<Array<{ key: string; name: string; stage: string; targetListId: string | null }>>('/ops/companies', {
        ...QUIET,
        params: targetListKey ? { list: targetListKey } : undefined,
      })
      .then((r) => r.data),
  /** Put a company on a target list, or pass null to take it off. */
  setCompanyTargetList: (key: string, targetListKey: string | null) =>
    apiClient.patch(`/ops/companies/${key}/target-list`, { targetListKey }, QUIET).then((r) => r.data),
  targetCompanies: (periodKey: string) =>
    apiClient.get<OpsTargetCompaniesBoard>(`/ops/target-companies/${periodKey}`, QUIET).then((r) => r.data),
  standing: (personKey: string) =>
    apiClient.get<OpsStanding>(`/ops/standing/${personKey}`, QUIET).then((r) => r.data),
  todos: (personKey: string) => apiClient.get<OpsTodo[]>(`/ops/todos/${personKey}`, QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  closeTodo: (id: string, status: 'DONE' | 'CANCELLED') =>
    apiClient.patch(`/ops/todos/${id}/status`, { status }, QUIET).then((r) => r.data),
  /**
   * Spend claims waiting on this person to decide.
   *
   * A claim went to REQUESTED and nothing told anybody: an approver learned of one by opening the
   * approvals page and looking. This puts it on the board they already open. Returns an empty list
   * for somebody who cannot decide spend, so the section simply is not there for them.
   */
  spendWaitingOnMe: () =>
    apiClient
      .get<{ claims: Array<{ id: string; date: string; description: string; category: string; amount: number; who: string; waitingDays: number }>; total: number }>('/ops/spend/waiting-on-me', QUIET)
      .then((r) => r.data),
  approvals: () =>
    apiClient
      .get<Array<{ id: string; approvalType: string; requestSummary: string; createdAt: string; relatedRecordType: string | null; relatedRecordId: string | null }>>('/ops/approvals')
      .then((r) => r.data),
  decide: (id: string, status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED', decisionNote?: string) =>
    apiClient.patch(`/ops/approvals/${id}`, { status, decisionNote }, QUIET).then((r) => r.data),

  company: (key: string) =>
    apiClient.get<OpsCompanyDetail>(`/ops/companies/${key}`, QUIET).then((r) => r.data),
  ledger: (personKey: string, from?: string, to?: string) =>
    apiClient
      .get<OpsLedger>(`/ops/commercial/ledger/${personKey}`, { ...QUIET, params: { from, to } })
      .then((r) => r.data),
  shareOfNewRevenue: (from?: string, to?: string) =>
    apiClient
      .get<OpsShareOfRevenue>('/ops/commercial/share-of-new-revenue', { ...QUIET, params: { from, to } })
      .then((r) => r.data),
  commercialOverview: (from?: string, to?: string) =>
    apiClient
      .get<OpsCommercialOverview>('/ops/commercial/overview', { ...QUIET, params: { from, to } })
      .then((r) => r.data),
  commercialPipeline: () =>
    apiClient.get<OpsCommercialOpportunity[]>('/ops/commercial/pipeline', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  openCommercial: (body: { companyKey: string; name: string; estimatedMrr?: number; estimatedContractValue?: number }) =>
    apiClient.post('/ops/commercial/pipeline', body, QUIET).then((r) => r.data),
  advanceCommercial: (id: string, stage: string) =>
    apiClient.patch(`/ops/commercial/pipeline/${id}/stage`, { stage }, QUIET).then((r) => r.data),
  recordCommercialPayment: (id: string, body: { amount: number; paidAt: string; reference?: string }) =>
    apiClient.post(`/ops/commercial/pipeline/${id}/payments`, body, QUIET).then((r) => r.data),
  claimContribution: (id: string, body: { role: string; claimedBasis: string; evidenceUrl?: string }) =>
    apiClient.post(`/ops/commercial/pipeline/${id}/claims`, body, QUIET).then((r) => r.data),
  claims: () => apiClient.get<OpsClaim[]>('/ops/commercial/claims', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  decideClaim: (id: string, body: { state: string; note?: string; insteadPersonId?: string }) =>
    apiClient.patch(`/ops/commercial/claims/${id}`, body, QUIET).then((r) => r.data),
  positioningRecords: () =>
    apiClient.get<OpsPositioningRecord[]>('/ops/commercial/positioning', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  openPositioning: (body: { personOrNetwork: string; organization?: string; accessType: string; evidenceUrl?: string }) =>
    apiClient.post('/ops/commercial/positioning', body, QUIET).then((r) => r.data),
  advancePositioning: (id: string, stage: string) =>
    apiClient.patch(`/ops/commercial/positioning/${id}/stage`, { stage }, QUIET).then((r) => r.data),
  deployments: () => apiClient.get<OpsDeployment[]>('/ops/deployments', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  campaigns: () => apiClient.get<OpsCampaign[]>('/ops/campaigns', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  moat: () => apiClient.get<OpsMoat>('/ops/moat', QUIET).then((r) => r.data),
  recordMoat: (body: { componentKey: string; title: string; description?: string; evidenceUrl?: string }) =>
    apiClient.post('/ops/moat', body, QUIET).then((r) => r.data),
  roadmap: () => apiClient.get<OpsRoadmapItem[]>('/ops/roadmap', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  useCases: () => apiClient.get<OpsUseCase[]>('/ops/use-cases', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  tech: () => apiClient.get<OpsWorkItem[]>('/ops/tech', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  ux: () => apiClient.get<OpsWorkItem[]>('/ops/ux', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  /** Whether a period can open yet, and who it is waiting on. */
  canOpenPeriod: (key: string) =>
    apiClient
      .get<{ ready: boolean; says: string; waitingOn: string[] }>(`/ops/periods/${key}/can-open`, QUIET)
      .then((r) => r.data),

  /** Open a period. Refused while somebody active has no objective in it. */
  openPeriod: (key: string) =>
    apiClient.post(`/ops/periods/${key}/open`, {}, QUIET).then((r) => r.data),

  /** The one board: everybody's quarter side by side. Never summed, never sorted by contribution. */
  everybody: (periodKey: string) =>
    apiClient.get<OpsEverybody>(`/ops/everybody/${periodKey}`, QUIET).then((r) => r.data),

  objectives: (periodKey: string) =>
    apiClient.get<OpsObjective[]>(`/ops/objectives/${periodKey}`, QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  commitments: (personKey: string, periodKey: string) =>
    apiClient.get<OpsCommitment[]>(`/ops/commitments/${personKey}/${periodKey}`, QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  spend: () => apiClient.get<OpsExpense[]>('/ops/spend', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  balance: () => apiClient.get<OpsBalance>('/ops/balance', QUIET).then((r) => r.data),
  /*
   * THE ENDPOINTS THAT EXISTED AND NOTHING CALLED.
   *
   * Twenty-three route paths were built on the server and reachable from no
   * screen — including creating an objective, asking for something you cannot
   * deliver without, recording money in, and changing any of the decisions the
   * whole system runs on. `wired-endpoints.spec.ts` has caught this shape in
   * the product twice; the ops system had never been checked for it.
   */

  /** Whether the product is solid, counted rather than claimed. */
  howSolid: () =>
    apiClient
      .get<{
        bugsOpen: number
        useCasesNotWorking: number
        bottlenecks: number
        solid: boolean
        says: string
        bugs: Array<{ title: string; severity: string }>
        useCases: Array<{ company: string; title: string; readiness: string }>
        blocked: Array<{ name: string; why: string }>
      }>('/ops/solidity', QUIET)
      .then((r) => r.data),

  /** Whether the product is frozen, and why. Everybody proposing work needs to know. */
  freezeNow: () =>
    apiClient
      .get<{ isOn: boolean; because: string | null; until: string | null; overdue: boolean; says: string }>(
        '/ops/freeze',
        QUIET,
      )
      .then((r) => r.data),
  decideTheFreeze: (body: { isOn: boolean; because: string; until?: string }) =>
    apiClient.post('/ops/freeze', body, QUIET).then((r) => r.data),
  freezeHistory: () =>
    apiClient
      .get<Array<{ id: string; isOn: boolean; because: string; until: string | null; decidedAt: string; decidedById: string }>>(
        '/ops/freeze/history',
        QUIET,
      )
      .then((r) => r.data),

  /** The four things a piece of work can serve, and what each has to point at. */
  whatWorkCanServe: () =>
    apiClient
      .get<Array<{ serves: string; label: string; points: string | null; needsApproval: boolean }>>(
        '/ops/what-work-can-serve',
        QUIET,
      )
      .then((r) => r.data),
  sayWhatItServes: (body: {
    recordType: string
    recordId: string
    serves: string
    servesRecordId?: string
    justification: string
    dependsOn?: string
    dependsOnOwnedBy?: string
  }) =>
    apiClient
      .post<{ says: string; needsAnException: string | null }>('/ops/what-it-serves', body, QUIET)
      .then((r) => r.data),
  /** Open work that has named nothing. The first threat, as a query. */
  whatServesNothing: () =>
    apiClient
      .get<{ value: number; says: string; rows: Array<{ recordType: string; id: string; title: string }> }>(
        '/ops/what-serves-nothing',
        QUIET,
      )
      .then((r) => r.data),
  /** Every dependency declared against a piece of work, and who owns it. */
  whatWeDependOn: () =>
    apiClient
      .get<Array<{ id: string; recordType: string; recordId: string; dependsOn: string | null; dependsOnOwnedBy: string | null; justification: string }>>(
        '/ops/what-we-depend-on',
        QUIET,
      )
      .then((r) => r.data),

  /** What we say this product is. The document every deck and campaign is measured against. */
  whatWeAre: () =>
    apiClient
      .get<{
        version: number
        headline: string
        saidOutLoud: string
        isIt: string[]
        isNotIt: string[]
        writtenAt: string | null
        writtenBy: string | null
        because: string | null
        seeded: boolean
      }>('/ops/what-we-are', QUIET)
      .then((r) => r.data),
  whatWeUsedToSay: () =>
    apiClient
      .get<Array<{ version: number; headline: string; because: string | null; writtenAt: string; writtenBy: string | null }>>(
        '/ops/what-we-are/history',
        QUIET,
      )
      .then((r) => r.data),
  sayItDifferently: (body: { headline: string; saidOutLoud: string; isIt: string[]; isNotIt: string[]; because?: string }) =>
    apiClient.post('/ops/what-we-are', body, QUIET).then((r) => r.data),

  /** The ways a company reaches us. One list, so a network can be counted. */
  attributionSources: () =>
    apiClient
      .get<Array<{ key: string; label: string }>>('/ops/attribution-sources', QUIET)
      .then((r) => r.data),

  /** The standing areas of the company. Needed to say which one an objective belongs to. */
  workstreams: () =>
    apiClient
      .get<Array<{ key: string; name: string; ownerPersonId: string; areas: string[] }>>('/ops/workstreams', QUIET)
      .then((r) => r.data),

  createObjective: (body: {
    periodKey: string
    workstreamKey: string
    title: string
    ownerKey: string
    serves: string
    justification: string
    instead: string
    description?: string
    companiesExpected?: number
    valuePerCompanyCents?: number
  }) => apiClient.post('/ops/objectives', body, QUIET).then((r) => r.data),
  /** How much of a period is aimed at scale, and where a claim outruns the pipeline. */
  howTheQuarterIsAimed: (periodKey: string) =>
    apiClient
      .get<{
        atScale: number
        somethingElse: number
        saidNothing: number
        of: number
        says: string
        disagreements: Array<{ objective: string; says: string }>
      }>(`/ops/objectives/${periodKey}/aim`, QUIET)
      .then((r) => r.data),
  addKeyResult: (
    objectiveId: string,
    body: { title: string; metricType: string; targetValue: number; unit: string; startValue?: number; measurementSource: string; ownerKey: string; justification: string; approach: string; dueDate: string },
  ) => apiClient.post(`/ops/objectives/${objectiveId}/key-results`, body, QUIET).then((r) => r.data),
  setObjectiveStatus: (id: string, status: string) =>
    apiClient.patch(`/ops/objectives/${id}/status`, { status }, QUIET).then((r) => r.data),

  /** Every number this system can compute, so a key result can name its source. */
  metricKeys: () =>
    apiClient
      .get<Array<{ key: string; label: string; counts: string }>>('/ops/metrics', QUIET)
      .then((r) => r.data),
  /*
   * `GET /ops/metrics/:key` HAS NO CLIENT FUNCTION, DELIBERATELY.
   *
   * Every number in this system already ships with the rows that made it —
   * boards do, and so does a key result. Adding a second way to fetch the same
   * evidence would give two answers to one question and eventually two
   * different answers. The route stays for anything reading this system from
   * outside; nothing in here needs it.
   */

  askForSomething: (body: { supportNeeded: string; reason: string; urgency: string; requestedByDate?: string }) =>
    apiClient.post('/ops/resourcing', body, QUIET).then((r) => r.data),
  requests: () =>
    apiClient
      .get<Array<{ id: string; requesterId: string; supportNeeded: string; reason: string; urgency: string; status: string; requestedByDate: string | null; createdAt: string }>>(
        '/ops/resourcing',
        QUIET,
      )
      .then((r) => r.data),
  closeRequest: (id: string) =>
    apiClient.patch(`/ops/resourcing/${id}/closed`, {}, QUIET).then((r) => r.data),

  recordEarnings: (body: { date: string; amount: number; source: string; note?: string }) =>
    apiClient.post('/ops/earnings', body, QUIET).then((r) => r.data),

  /** The decisions this system runs on. Data, not constants. */
  settings: () =>
    apiClient
      .get<Array<{ key: string; value: string; note: string | null; updatedAt: string; updatedBy: string | null }>>(
        '/ops/settings',
        QUIET,
      )
      .then((r) => r.data),
  changeSetting: (key: string, value: string) =>
    apiClient.patch(`/ops/settings/${key}`, { value }, QUIET).then((r) => r.data),

  markCommitmentBlocked: (id: string, blocked: boolean, blockerReason?: string) =>
    apiClient.patch(`/ops/commitments/${id}/blocked`, { blocked, blockerReason }, QUIET).then((r) => r.data),
  linkCommitment: (id: string, body: { recordType: string; recordId: string }) =>
    apiClient.post(`/ops/commitments/${id}/links`, body, QUIET).then((r) => r.data),

  /** Omit ownerKey and it is yours. Naming somebody else needs todos:assign. */
  addTodo: (body: { title: string; ownerKey?: string; dueDate?: string; notes?: string }) =>
    apiClient.post('/ops/todos', body, QUIET).then((r) => r.data),

  moveIntroductionAlong: (companyKey: string, contributorKey: string, status: string) =>
    apiClient.patch(`/ops/attributions/${companyKey}/${contributorKey}`, { status }, QUIET).then((r) => r.data),

  recordFundraiseFollowUp: (id: string, nextFollowUpAt: string) =>
    apiClient.patch(`/ops/fundraise/${id}/follow-up`, { nextFollowUpAt }, QUIET).then((r) => r.data),
  recordConversion: (id: string, body: { convertedToType: string; convertedToId?: string }) =>
    apiClient.patch(`/ops/strategy/${id}/converted`, body, QUIET).then((r) => r.data),

  setCommercialNextAction: (id: string, body: { nextAction: string; nextActionDueAt?: string }) =>
    apiClient.patch(`/ops/commercial/pipeline/${id}/next-action`, body, QUIET).then((r) => r.data),
  /** How the sales function itself is doing, separately from what it produced. */
  functionHealth: () =>
    apiClient
      .get<{
        livePipeline: number
        pipelineValue: number
        overdueFollowUps: number
        withNothingPlanned: number
        attributionUnresolved: number
        says: string
      }>('/ops/commercial/function-health', QUIET)
      .then((r) => r.data),
  /** The company's commercial performance over a window. */
  commercialPerformance: (from?: string, to?: string) =>
    apiClient
      .get<{
        totalPipeline: number
        qualifiedPipeline: number
        newCustomers: number
        newMrr: number
        newArr: number
        contractValue: number
        cashCollected: number
        retained3Month: number
        retained6Month: number
        retained12Month: number
      }>('/ops/commercial/performance', { ...QUIET, params: { from, to } })
      .then((r) => r.data),
  /** Every decision ever made about one record. */
  decisionsAbout: (recordType: string, recordId: string) =>
    apiClient
      .get<Array<{ id: string; status: string; decisionNote: string | null; createdAt: string; decidedAt: string | null; requestSummary: string }>>(
        `/ops/approvals/${recordType}/${recordId}`,
        QUIET,
      )
      .then((r) => r.data),
  /** Point a use case at the item holding it up. */
  linkUseCase: (id: string, body: { targetType: string; targetId: string }) =>
    apiClient.post(`/ops/use-cases/${id}/links`, body, QUIET).then((r) => r.data),

  attributionHistory: (id: string) =>
    apiClient
      .get<Array<{ id: string; kind: string; occurredAt: string; note: string | null; actor: string | null }>>(
        `/ops/commercial/pipeline/${id}/attribution-history`,
        QUIET,
      )
      .then((r) => r.data),

  fundraise: () => apiClient.get<OpsFundraise>('/ops/fundraise', QUIET).then((r) => r.data),
  strategy: () => apiClient.get<OpsStrategic[]>('/ops/strategy', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  integration: () => apiClient.get<OpsIntegrationStatus>('/ops/integration', QUIET).then((r) => r.data),
  /**
   * A short-lived identity token for the assistant panel, and where to take it.
   *
   * Our own server mints it, the way a customer's server does. The shared
   * signing key never reaches the browser — a browser holding it could mint a
   * token for anybody.
   */
  assistantPanel: () =>
    apiClient
      .get<{ ready: true; baseUrl: string; token: string } | { ready: false; why: string }>(
        '/ops/assistant/panel',
        QUIET,
      )
      .then((r) => r.data),
  people: () => apiClient.get<OpsPerson[]>('/ops/people', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  /** The roles, from the same list the grants are keyed on. Never a copy here. */
  roles: () =>
    apiClient
      .get<Array<{ role: string; label: string; comesWith: string[] }>>('/ops/roles', QUIET)
      .then((r) => r.data),
  /** Change what somebody does. Adds that role's capabilities, removes none. */
  changeRole: (key: string, functionalRole: string) =>
    apiClient
      .patch<{ says: string }>(`/ops/people/${key}/role`, { functionalRole }, QUIET)
      .then((r) => r.data),
  agreement: (key: string) =>
    apiClient
      .get<{ originatorSharePercent: string | null; originatorShareMonths: number | null; agreementNote: string | null } | null>(
        `/ops/people/${key}/agreement`,
        QUIET,
      )
      .then((r) => r.data),
  setAgreement: (key: string, body: { originatorSharePercent?: number | null; originatorShareMonths?: number | null; agreementNote?: string }) =>
    apiClient.patch(`/ops/people/${key}/agreement`, body, QUIET).then((r) => r.data),
  capabilities: () => apiClient.get<string[]>('/ops/capabilities', QUIET).then((r) => (Array.isArray(r.data) ? r.data : [])),
  addPerson: (body: { key: string; displayName: string; email?: string; functionalRole: string }) =>
    apiClient.post('/ops/people', body, QUIET).then((r) => r.data),
  grant: (key: string, capability: string) =>
    apiClient.post(`/ops/people/${key}/grants`, { capability }, QUIET).then((r) => r.data),
  revoke: (key: string, capability: string) =>
    apiClient.delete(`/ops/people/${key}/grants/${capability}`, QUIET).then((r) => r.data),
  setActive: (key: string, active: boolean) =>
    apiClient.patch(`/ops/people/${key}/active`, { active }, QUIET).then((r) => r.data),

  // --- Writes ---------------------------------------------------------------
  addCompany: (body: { name: string; targetListKey?: string; source?: string; primaryContactName?: string; primaryContactEmail?: string }) =>
    apiClient.post('/ops/companies', body, QUIET).then((r) => r.data),
  setCompanyStage: (key: string, stage: string) =>
    apiClient.patch(`/ops/companies/${key}/stage`, { stage }, QUIET).then((r) => r.data),
  setCompanyNextAction: (key: string, nextAction: string, dueAt?: string) =>
    apiClient.patch(`/ops/companies/${key}/next-action`, { nextAction, dueAt }, QUIET).then((r) => r.data),
  setCompanyBlocker: (key: string, summary: string | null) =>
    apiClient.patch(`/ops/companies/${key}/blocker`, { summary }, QUIET).then((r) => r.data),
  attribute: (body: { companyKey: string; sourceType: string; contributorKey?: string; sourceDetail?: string }) =>
    apiClient.post('/ops/attributions', body, QUIET).then((r) => r.data),


  startDeployment: (body: { companyKey: string; targetLiveDate?: string }) =>
    apiClient.post('/ops/deployments', body, QUIET).then((r) => r.data),
  advanceDeployment: (id: string, stage: string) =>
    apiClient.patch(`/ops/deployments/${id}/stage`, { stage }, QUIET).then((r) => r.data),
  setDeploymentBlocker: (id: string, type: string | null, summary: string | null) =>
    apiClient.patch(`/ops/deployments/${id}/blocker`, { type, summary }, QUIET).then((r) => r.data),

  workplan: () => apiClient.get<OpsWorkplan>('/ops/workplan', QUIET).then((r) => r.data),

  resources: () =>
    apiClient
      .get<{ checkedAgainst: { version: number; headline: string }; resources: OpsResource[] }>(
        '/ops/resources',
        QUIET,
      )
      .then((r) => r.data),

  addResource: (body: {
    title: string
    category: string
    categoryDetail?: string
    url?: string
    content: string
    risks: string[]
  }) => apiClient.post('/ops/resources', body, QUIET).then((r) => r.data),

  recheckResource: (id: string) =>
    apiClient.post(`/ops/resources/${id}/check`, {}, QUIET).then((r) => r.data),

  /** A campaign names the objective it is run for, and why it moves it. Refused without both. */
  addCampaign: (body: {
    title: string
    activityType: string
    channel?: string
    startDate: string
    objectiveId: string
    objective: string
  }) =>
    apiClient.post('/ops/campaigns', body, QUIET).then((r) => r.data),

  propose: (body: { title: string; description?: string; itemType: string; priority?: number; approvalRequired?: boolean }) =>
    apiClient.post('/ops/roadmap', body, QUIET).then((r) => r.data),
  setRoadmapStatus: (id: string, status: string) =>
    apiClient.patch(`/ops/roadmap/${id}/status`, { status }, QUIET).then((r) => r.data),

  addUseCase: (body: { companyKey: string; title: string; expectedWorkflow?: string }) =>
    apiClient.post('/ops/use-cases', body, QUIET).then((r) => r.data),
  setReadiness: (id: string, body: { readiness: string; productGap?: string | null; uxGap?: string | null; technicalGap?: string | null }) =>
    apiClient.patch(`/ops/use-cases/${id}/readiness`, body, QUIET).then((r) => r.data),

  addTech: (body: { title: string; itemType: string; severity: string; targetDate?: string }) =>
    apiClient.post('/ops/tech', body, QUIET).then((r) => r.data),
  setTechStatus: (id: string, status: string, blockerReason?: string) =>
    apiClient.patch(`/ops/tech/${id}/status`, { status, blockerReason }, QUIET).then((r) => r.data),
  addUX: (body: { title: string; affectedFlow?: string; severity: string; sourceNote?: string }) =>
    apiClient.post('/ops/ux', body, QUIET).then((r) => r.data),
  setUXStatus: (id: string, status: string) =>
    apiClient.patch(`/ops/ux/${id}/status`, { status }, QUIET).then((r) => r.data),

  makeCommitment: (body: { operatingPeriodKey: string; title: string; measureType: string; targetValue?: number; unit?: string; measurementSource: string; dueDate: string }) =>
    apiClient.post('/ops/commitments', body, QUIET).then((r) => r.data),
  closeCommitment: (id: string, body: { status: string; actualResult: string }) =>
    apiClient.patch(`/ops/commitments/${id}/close`, body, QUIET).then((r) => r.data),

  submitExpense: (body: { date: string; description: string; category: string; amount: number }) =>
    apiClient.post('/ops/spend', body, QUIET).then((r) => r.data),
  decideExpense: (id: string, status: string, rejectedReason?: string) =>
    apiClient.patch(`/ops/spend/${id}`, { status, rejectedReason }, QUIET).then((r) => r.data),

  addFunder: (body: { funderName: string; fundingType: string; askAmount?: number }) =>
    apiClient.post('/ops/fundraise', body, QUIET).then((r) => r.data),
  advanceFunding: (id: string, stage: string) =>
    apiClient.patch(`/ops/fundraise/${id}/stage`, { stage }, QUIET).then((r) => r.data),
  addStrategic: (body: { personOrNetwork: string; opportunityType: string; organization?: string }) =>
    apiClient.post('/ops/strategy', body, QUIET).then((r) => r.data),
  setStrategicStatus: (id: string, status: string) =>
    apiClient.patch(`/ops/strategy/${id}/status`, { status }, QUIET).then((r) => r.data),

  pushToGroundwork: (period: string) =>
    apiClient.post('/ops/integration/push', null, { ...QUIET, params: { period } }).then((r) => r.data),
}
