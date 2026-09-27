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
}

export type SuitesPage = SuitesForAnAdmin | SuitesForALead

export const suitesApi = {
  get: async (): Promise<SuitesPage> => (await apiClient.get('/suites')).data,
  switch: async (key: string, on: boolean, answers?: Answers): Promise<SuitesForAnAdmin> =>
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
