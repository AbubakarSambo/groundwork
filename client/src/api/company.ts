import { apiClient } from './client'

/**
 * THE COMPANY PAGE (D2, U.15). The server builds it from what you may already read and decides what
 * each reader is given (GET /company): everybody in the organisation reads the priorities and who
 * owns them; what success looks like is served to admins only; a check-in is named only to somebody
 * who may open it. A guest from another company is refused. The server writes the sentences.
 */
export interface CompanyPriority {
  id: string
  number: number
  title: string
  owner: string | null
  /** "Nobody owns it yet", or null. */
  tag: string | null
  /** "Fed by Sales team, Q3", "No team feeds it", or null. */
  fedBy: string | null
  staleSays: string | null
  /** Served to admins only. */
  measure?: string | null
  target?: string | null
  /**
   * THE ENGINE'S READ OF HOW THIS PRIORITY IS MOVING (docs/requests-to-engine.md, request 17), for
   * example "At risk" and "On time is 88% against 95%…". Not served yet; drawn only when it is.
   */
  reading?: { tag: string; says: string } | null
  /**
   * WHAT EACH LEVEL UNDERSTOOD, top down from the priority itself through each objective and project under
   * it. Empty for a reader who may not read the company-wide picture, and until it is written.
   */
  levels?: CompanyLevel[]
}

export interface CompanyLevel {
  id: string
  /** 0 for the priority itself, 1 for what hangs directly under it, and so on. */
  depth: number
  /** "Priority 1", "Objective" or "Project". */
  level: string
  title: string
  /** "The meaning changed here, from more farmers to more visits.", or null. */
  changedHere: string | null
  /** "Fed by Sales team, Q3" for the check-ins tied to exactly this level that the reader may open, or null. */
  fedBy: string | null
}

export interface CompanyPage {
  name: string
  line: string | null
  priorities: CompanyPriority[]
  readsTargets: boolean

  /*
   * THE ENGINE'S OWN PARTS OF THIS PAGE (request 17). None is served yet; each is drawn only when it
   * arrives, and nothing is drawn in its place.
   */
  /** "Where the strategy isn’t reaching the work": an observation, the question it raises, and for whom. */
  notReaching?: { id: string; observation: string; question: string; forWhom: string }[]
  /** "Named by more than one team": one thing, and what each team said about it, as counts. */
  namedByTeams?: { id: string; title: string; touches?: string | null; teams: { team: string; says: string }[] }[]
  /** "What you say, and where the time goes": what leadership said, next to what the check-ins show. */
  saidAndShown?: { id: string; area: string; youSaid: string; checkInsShow: string }[]
  /**
   * What a lead said in a setup conversation that is true of the whole company, kept on their yes
   * (week 20). Served to admins, leads and anyone who runs a check-in; absent for everyone else.
   * `readBy` is a sentence ready to show; `source` is "Picked up from your check-in on 22 September".
   */
  whatWeKeep?: { readBy: string; items: { id: string; kind: string; says: string; source: string }[] }
}

/** One piece of how the company does things (GET /org/how-we-do-it), readable by everybody in it. */
export interface CompanyCard { key: string; title: string; body: string; kind: string; effectiveFrom: string }

export const companyApi = {
  get: async (): Promise<CompanyPage> => (await apiClient.get('/company')).data,
  cards: async (): Promise<CompanyCard[]> => ((await apiClient.get('/org/how-we-do-it')).data?.cards ?? []) as CompanyCard[],
}
