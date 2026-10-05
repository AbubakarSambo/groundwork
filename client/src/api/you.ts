import { apiClient } from './client'
import type { SuggestionForThePerson } from './suggestions'
import type { ServedPattern } from './patterns'

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
/** One open request on you, from a check-in you are in. `who` is null where the check-in does not let you see who. */
export interface SomethingAskedOfYou {
  id: string
  who: string | null
  checkIn: string
  what: string
  asked: string
  /** One plain sentence of where it stands, written from the record (api/src/modules/grounds/asked-of-you.ts). */
  standing: string
}

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

  /**
   * "SOMETHING THAT KEEPS COMING UP", ABOUT YOUR PART IN THE WORK (C2, you-board-miriam.txt).
   * Your own patterns, across every check-in you are in, and nobody else's - see
   * api/src/modules/patterns/who-reads-a-pattern.ts. Served only once a pattern has been seen in
   * three check-ins; nothing while patterns are switched off.
   */
  patterns?: ServedPattern[]

  /**
   * GROUNDWORK'S SUGGESTIONS ABOUT YOU (C3, U.13), served when there are any: the facts about your
   * work, what would change them, and the decision with its reasons. Never the verdict.
   */
  suggestionsAboutYou?: SuggestionForThePerson[]

  /**
   * EVERYTHING ASKED OF YOU (D3, U.16): your load across check-ins, served to you alone, and only
   * when something is asked of you. `says` is one sentence, such as "3 requests from 2 people across
   * 2 check-ins." Nobody else is ever served it; there is no sharing yet.
   */
  askedOfYou?: { items: SomethingAskedOfYou[]; says: string }
}

export const youApi = {
  get: (): Promise<YourBoard> => apiClient.get<YourBoard>('/you').then(r => r.data),
}
