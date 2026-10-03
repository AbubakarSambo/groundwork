import { apiClient } from './client'

/**
 * THE SUITES PAGE (E, U.17). The server decides what each reader is given (GET /suites): an admin
 * reads every suite with its switch, its first questions and their own answers; a lead reads only
 * which suites are on, of those for leads; a member and a guest are refused. Only an admin may
 * switch one (PUT /suites/:key), and the server checks every answer.
 */
export type Question =
  | { id: string; kind: 'person'; ask: string }
  | { id: string; kind: 'number'; ask: string; min: number; max: number }
  | { id: string; kind: 'choice'; ask: string; options: string[] }
  | { id: string; kind: 'lines'; ask: string }

export type Answers = Record<string, string | number | string[]>

export interface AdminSuite { key: string; name: string; line: string; on: boolean; questions: Question[]; answers: Answers }

export interface SuitesForAnAdmin {
  reader: 'admin'
  groups: { name: 'People' | 'Money' | 'Work'; suites: AdminSuite[] }[]
  people: { id: string; name: string }[]
}

export interface SuitesForALead {
  reader: 'lead'
  suites: { key: string; name: string; line: string }[]
  /** Only for a lead who also holds the HR or finance duty: the suites they set up, as a duty holder reads them. */
  youSetUp?: AdminSuite[]
  people?: { id: string; name: string }[]
}

/** A member who holds the HR or finance duty: only the suites that duty sets up, with their questions and answers. */
export interface SuitesForADutyHolder {
  reader: 'duty'
  youSetUp: AdminSuite[]
  people: { id: string; name: string }[]
}

export type SuitesPage = SuitesForAnAdmin | SuitesForALead | SuitesForADutyHolder

export const suitesApi = {
  get: async (): Promise<SuitesPage> => (await apiClient.get('/suites')).data,
  switch: async (key: string, on: boolean, answers?: Answers): Promise<SuitesPage> =>
    (await apiClient.put(`/suites/${key}`, answers ? { on, answers } : { on })).data,
}

/** One new person on the onboarding board (GET /suites/onboard/board). */
export interface NewPerson {
  id: string
  name: string
  firstName: string
  startedAt: string | null
  done: number
  of: number
  steps: { name: string; description: string | null; optional: boolean; state: 'to do' | 'done' | 'not needed'; doneAt: string | null }[]
}

export const onboardingBoardApi = {
  get: async (): Promise<{ people: NewPerson[] }> => (await apiClient.get('/suites/onboard/board')).data,
}

/** The leave board (GET /suites/leave/board): what is waiting, and who is off in the next two weeks. */
export interface LeaveWaiting {
  id: string
  name: string
  startsOn: string
  endsOn: string
  days: number
  daysLeft: number | null
  team: string | null
  alsoOff: string[]
  standIn: string | null
  mayDecide: boolean
}
export interface LeaveOff { id: string; name: string; startsOn: string; endsOn: string; kind: 'annual' }
export interface LeaveBoard { waiting: LeaveWaiting[]; off: LeaveOff[] }

export const leaveBoardApi = {
  get: async (): Promise<LeaveBoard> => (await apiClient.get('/suites/leave/board')).data,
  decide: async (id: string, outcome: 'approve' | 'decline'): Promise<LeaveBoard> =>
    (await apiClient.post(`/suites/leave/requests/${id}/${outcome}`)).data,
}

/** Time sheets (GET /suites/time/board). For billing only. */
export interface TimeWeek {
  weekOf: string
  clients: string[]
  people: { personId: string; name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean }[]
}
export interface TimeAgreement { client: string; work: string; hours: number; span: 'whole' | 'month'; usedMinutes: number }
export interface TimeBoard { thisWeek: string; weeks: TimeWeek[]; agreements: TimeAgreement[] | null }

export const timeSheetsApi = {
  get: async (): Promise<TimeBoard> => (await apiClient.get('/suites/time/board')).data,
  approve: async (weekOf: string, personId: string): Promise<TimeBoard> =>
    (await apiClient.post(`/suites/time/weeks/${weekOf}/people/${personId}/approve`)).data,
}

/** Performance reviews (GET /suites/reviews/board and /suites/reviews/:id). */
export interface NextReview {
  dueId: string
  name: string
  writtenWith: string | null
  dueOn: string
  /** 'not-yet' while a check-in that decides something about the person is still open. */
  stands: 'ready' | 'started' | 'decided' | 'not-yet'
  /** Where it stands, in a full sentence for this reader: "Ready to start. 6 months of check-ins to draw on." */
  standsSays: string
  reviewId: string | null
  mayStart: boolean
  /** Said when Groundwork proposed the review itself, so the reader knows why it is here and that nothing reaches the person until they say yes. */
  proposal: string | null
}
/** One of the person's own reviews, once somebody has started it (GET /suites/reviews/mine). */
export interface YourReview {
  id: string
  dueOn: string
  writtenWithFirstName: string | null
  stands: 'started' | 'decided'
  says: string
}
export interface ReviewsBoard { every: string | null; next: NextReview[] }
export interface Noticed { says: string; mark: 'proven' | 'said' }
/** What Groundwork understands from the record, as one reader is served it: each part, each line, and the person's correction beside it. */
export interface TheRecord {
  intro: string
  /** For the person: who reads their corrections and what stays with them. Null for anybody else. */
  whoReads: string | null
  parts: { part: string; heading: string; lines: { key: string; says: string; correction: { said: string; whatIsTrue: string } | null }[] }[]
  /** Only the person corrects a line. */
  mayCorrect: boolean
}
/** "Groundwork suggests recognising Aisha’s work", for the person who writes the review only. */
export interface RecogniseForTheWriter { headline: string; why: string; whatWouldChangeIt: string; yourDecision: string }
/** What the person reads about that suggestion: their own count, the line, and who decides. */
export interface RecogniseForThePerson { facts: string; whoDecides: string }
/** The writer's briefing: evidence and patterns, never a verdict. */
export interface ABriefing {
  heading: string
  counts: string | null
  patterns: { heading: string; whatHappened: string | null; howOften: string; checkIn: string; theirAnswer: string }[]
  patternsNote: string | null
  changedAfterEarlierConversations: string[]
  corrections: { line: string; said: string; whatIsTrue: string }[]
  whoDecides: string
}
export interface ReviewForTheWriter {
  reader: 'writer' | 'lead' | 'admin'
  id: string
  name: string
  firstName: string
  writtenWith: string | null
  writtenWithFirstName: string | null
  dueOn: string
  noticed: Noticed[]
  managersWords: string | null
  theirView: string | null
  decision: { says: string; reasons: string } | null
  mayWrite: boolean
  /** Null for a review started before the record was read. */
  record?: TheRecord | null
  recognise?: RecogniseForTheWriter | null
  briefing?: ABriefing
}
export interface ReviewForThePerson {
  reader: 'person'
  id: string
  firstName: string
  writtenWithFirstName: string | null
  dueOn: string
  noticed: Noticed[]
  theirView: string | null
  decision: { says: string; reasons: string } | null
  record?: TheRecord | null
  recognise?: RecogniseForThePerson
}
export type AReview = ReviewForTheWriter | ReviewForThePerson

export const reviewsApi = {
  board: async (): Promise<ReviewsBoard> => (await apiClient.get('/suites/reviews/board')).data,
  mine: async (): Promise<YourReview[]> => (await apiClient.get('/suites/reviews/mine')).data,
  start: async (dueId: string): Promise<{ id: string }> => (await apiClient.post(`/suites/reviews/due/${dueId}/start`)).data,
  one: async (id: string): Promise<AReview> => (await apiClient.get(`/suites/reviews/${id}`)).data,
  words: async (id: string, text: string): Promise<AReview> => (await apiClient.put(`/suites/reviews/${id}/words`, { text })).data,
  view: async (id: string, text: string): Promise<AReview> => (await apiClient.put(`/suites/reviews/${id}/view`, { text })).data,
  correct: async (id: string, lineKey: string, text: string): Promise<AReview> =>
    (await apiClient.post(`/suites/reviews/${id}/lines/${encodeURIComponent(lineKey)}/correction`, { text })).data,
  decide: async (id: string, decision: string, reasons: string): Promise<AReview> =>
    (await apiClient.post(`/suites/reviews/${id}/decision`, { decision, reasons })).data,
}

/** When someone leaves (GET /suites/leaving/board). Admins only. */
export type LeavingStepKey = 'handover' | 'equipment' | 'access' | 'pay'
export interface LeavingList {
  id: string
  name: string
  firstName: string
  lastDay: string
  done: number
  of: number
  steps: { step: LeavingStepKey; ownerId: string | null; ownerName: string | null; done: boolean }[]
  handover: { to: string; on: string } | null
}
export interface LeavingBoard {
  lists: LeavingList[]
  departures: { personId: string; name: string; departedOn: string }[]
  people: { id: string; name: string }[]
  owners: { id: string; name: string }[]
  strain: { team: string; says: string }[]
}

export const leavingApi = {
  get: async (): Promise<LeavingBoard> => (await apiClient.get('/suites/leaving/board')).data,
  start: async (personId: string, lastDay: string): Promise<LeavingBoard> =>
    (await apiClient.post('/suites/leaving/lists', { personId, lastDay })).data,
  step: async (id: string, step: LeavingStepKey, change: { ownerUserId?: string | null; done?: boolean }): Promise<LeavingBoard> =>
    (await apiClient.put(`/suites/leaving/lists/${id}/steps/${step}`, change)).data,
}

/** The role map (GET /suites/roles/board). Admins only. */
export interface RoleMap {
  roles: { name: string; owns: string | null; heldBy: string[] }[]
  nobody: { name: string; why: string | null }[]
}

export const roleMapApi = {
  get: async (): Promise<RoleMap> => (await apiClient.get('/suites/roles/board')).data,
}

/** Spending and budgets (GET /suites/spend/board): what waits for a yes or no, and each team's budget. */
export type SpendApprover = { kind: 'manager' } | { kind: 'person'; firstName: string } | { kind: 'admin' }
export interface SpendWaiting {
  id: string
  name: string
  firstName: string
  amount: number
  what: string
  team: string | null
  left: number | null
  over: boolean
  approver: SpendApprover
  mayDecide: boolean
}
export interface SpendBoard {
  reader?: 'admin' | 'lead' | 'approver'
  currency: string | null
  limit: number | null
  waiting: SpendWaiting[]
  budgets: { team: string; budget: number; spent: number; left: number }[]
  teams: string[]
}

export const spendApi = {
  get: async (): Promise<SpendBoard> => (await apiClient.get('/suites/spend/board')).data,
  decide: async (id: string, outcome: 'approve' | 'decline'): Promise<SpendBoard> =>
    (await apiClient.post(`/suites/spend/requests/${id}/${outcome}`)).data,
  setBudget: async (team: string, amount: number): Promise<SpendBoard> =>
    (await apiClient.put('/suites/spend/budgets', { team, amount })).data,
}

/** To-dos (GET /suites/todos/board): what each person said they will do in their check-ins. */
export interface TodoList {
  people: { name: string; firstName: string; todos: { id: string; text: string; source: 'check-in'; on: string; checkIn: string }[] }[]
}

export const todosApi = {
  get: async (): Promise<TodoList> => (await apiClient.get('/suites/todos/board')).data,
}

/** Customers and deals (GET /suites/customers/board). */
export interface CustomerList {
  customers: { id: string; name: string; standing: string | null; owner: string | null; lastContact: string | null }[]
}

export const customersApi = {
  get: async (): Promise<CustomerList> => (await apiClient.get('/suites/customers/board')).data,
}

/** Equipment (GET /suites/equipment/board). Admins only. */
export interface EquipmentBoard {
  items: { id: string; name: string; holderId: string | null; holder: string | null; condition: string | null }[]
  people: { id: string; name: string }[]
}

export const equipmentApi = {
  get: async (): Promise<EquipmentBoard> => (await apiClient.get('/suites/equipment/board')).data,
  add: async (item: { name: string; holderId: string | null; condition: string | null }): Promise<EquipmentBoard> =>
    (await apiClient.post('/suites/equipment/items', item)).data,
  change: async (id: string, change: { holderId: string | null; condition: string | null }): Promise<EquipmentBoard> =>
    (await apiClient.put(`/suites/equipment/items/${id}`, change)).data,
}

/** One approved request to spend, as finance reads it: only what is on the request itself (GET /suites/spend/finance). */
export interface FinanceRequest {
  id: string
  name: string
  team: string | null
  amount: number
  what: string
  category: string | null
  askedOn: string
  approvedBy: string[]
  approvedOn: string | null
  evidenceNeeded: string[]
  evidenceGiven: string[]
  checked: { by: string; on: string } | null
  code: string | null
  paidOn: string | null
  /** The request in full sentences, with "you" for the reader. */
  said: string[]
}
export interface FinanceView {
  reader: 'finance' | 'admin'
  currency: string | null
  toPay: FinanceRequest[]
  paid: FinanceRequest[]
  /** Budget lines finance may choose from. Finance may also write its own. */
  lines: string[]
}

export const financeApi = {
  get: async (): Promise<FinanceView> => (await apiClient.get('/suites/spend/finance')).data,
  check: async (id: string): Promise<FinanceView> => (await apiClient.post(`/suites/spend/requests/${id}/check`)).data,
  code: async (id: string, code: string): Promise<FinanceView> => (await apiClient.put(`/suites/spend/requests/${id}/code`, { code })).data,
  evidence: async (id: string, what: string): Promise<FinanceView> => (await apiClient.post(`/suites/spend/requests/${id}/evidence`, { what })).data,
  paid: async (id: string, on: string): Promise<FinanceView> => (await apiClient.post(`/suites/spend/requests/${id}/paid`, { on })).data,
  /** The approved requests not yet paid, as a file to take away. */
  file: async (format: 'csv' | 'xlsx'): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get('/suites/spend/finance/export', { params: { format }, responseType: 'blob' })
    const named = /filename="([^"]+)"/.exec(String(res.headers?.['content-disposition'] ?? ''))
    return { blob: res.data as Blob, fileName: named?.[1] ?? `requests-to-pay.${format}` }
  },
}
