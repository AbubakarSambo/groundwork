import { apiClient } from './client'

/**
 * THE YOU BOARD (C2, U.12): what is yours, across your check-ins. The server builds it from what you
 * may already read and serves it to you alone (GET /you); nobody else may ask for it. The server
 * writes the sentences; the screen only says the dates.
 */
export interface YourCheckIn { id: string; label: string; youRunIt: boolean; line: string; to: string }
export interface YourTurn { key: string; title: string; detail: string | null; action: { label: string; to: string } }
export interface YourGoal { id: string; says: string; checkIn: string }
export interface SomethingYouSaid {
  id: string
  text: string
  when: string | null
  checkIn: string
  state: 'open' | 'kept' | 'not_done'
  stateSays: string
}
export interface YourReport { checkIn: string; at: string | null; to: string }

export interface YourBoard {
  checkIns: YourCheckIn[]
  turns: YourTurn[]
  goals: YourGoal[]
  saidYoudDo: SomethingYouSaid[]
  todos: { id: string; text: string; when: string | null }[]
  coaching: { says: string; checkIn: string } | null
  ownReports: YourReport[]

  /*
   * THE ENGINE'S OWN TEXT FOR THIS PAGE (docs/requests-to-engine.md, request 14). None of it is
   * served yet; each part is drawn only when it arrives, and nothing is drawn in its place.
   */
  /** "Where you stand": the facts about your work, what would change them, and any decision. */
  whereYouStand?: { says: string; whatWouldChangeIt?: string | null; decision?: string | null }
  /** "Worth knowing now": a few plain sentences. */
  worthKnowing?: string[]
  /** "Something Groundwork noticed about your work", told to you first. */
  noticed?: { says: string; whoSees?: string | null }
  /** "Coaching, followed over time". */
  coachingOverTime?: string
  /** "What you contributed". */
  contributed?: string[]
  /** "Something that keeps coming up", about your part in the work. */
  keepsComingUp?: { title: string; says: string }[]
}

export const youApi = {
  get: (): Promise<YourBoard> => apiClient.get<YourBoard>('/you').then(r => r.data),
}
