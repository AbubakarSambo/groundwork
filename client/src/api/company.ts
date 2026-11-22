import { apiClient } from './client'

/**
 * THE DESK (S7, the company page renamed, D2, U.15). The server builds it from what you may already
 * read and decides what each reader is given (GET /company): everybody in the organisation reads the
 * documents with their kept summaries, the directory, the priorities and who owns them; what success
 * looks like is served to admins only; a check-in is named only to somebody who may open it. Somebody
 * who does not work here is served one plain sentence (`outsider`) and nothing else. The server
 * writes the sentences.
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
  whatWeKeep?: { items: { id: string; kind: string; says: string; source: string }[] }
  /** THE DESK'S SHARED CONTEXT (S7): the documents with their kept summaries, the directory, and whether you may add a document. */
  desk?: TheDesk
}

export interface DeskDocument {
  key: string
  title: string
  /** Two or three sentences, written by the model when it was added and kept. Null where none was kept. */
  summary: string | null
  /** "Grace Wanjiru added this on 19 November 2026.", or null. */
  added: string | null
}

export interface DirectoryEntry {
  id: string
  name: string
  jobTitle: string | null
  team: string | null
  reportsTo: string | null
  phone: string | null
}

export interface TheDesk {
  documents: DeskDocument[]
  directory: DirectoryEntry[]
  mayAdd: boolean
}

/** What somebody who does not work here is served instead of the Desk. */
export interface NotYourDesk {
  name: string
  outsider: string
}

export const companyApi = {
  get: async (): Promise<CompanyPage | NotYourDesk> => (await apiClient.get('/company')).data,
  /** One document in full. */
  document: async (key: string): Promise<{ key: string; title: string; summary: string | null; text: string }> =>
    (await apiClient.get(`/company/documents/${encodeURIComponent(key)}`)).data,
  /** An admin or a lead adds a document, as a file or pasted text. The server reads it, summarises it and keeps it. */
  addDocument: async (input: { file?: File | null; title?: string; text?: string }): Promise<{ key: string; title: string; summary: string | null }> => {
    const form = new FormData()
    if (input.file) form.append('file', input.file)
    if (input.title?.trim()) form.append('title', input.title.trim())
    if (input.text?.trim()) form.append('text', input.text)
    return (await apiClient.post('/company/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  /** The goals this reader may change, and the check-ins they may tie to one (GET /company/goals). The server decides who may. */
  goals: async (): Promise<TheGoalsYouMayChange> => (await apiClient.get('/company/goals', { skipForbiddenToast: true } as any)).data,
  /** An admin or a lead adds a goal, tied to the check-ins chosen. */
  addGoal: async (goal: AGoalAsGiven): Promise<TheGoalsYouMayChange> => (await apiClient.post('/company/goals', goal)).data,
  /** An admin, or the lead who owns it, changes a goal and which check-ins feed it. */
  changeGoal: async (id: string, goal: AGoalAsGiven): Promise<TheGoalsYouMayChange> => (await apiClient.put(`/company/goals/${encodeURIComponent(id)}`, goal)).data,
}

/** One goal on the Desk this reader may change (api/src/modules/grounds/the-goals-on-the-desk.service.ts). */
export interface AGoalYouMayChange {
  id: string
  title: string
  owner: string | null
  ownerId: string | null
  /** Admins only. */
  measure?: string | null
  target?: string | null
  /** False for a goal from the organisation's own system: its words are changed there. */
  wordsChangedHere: boolean
  checkIns: { id: string; label: string }[]
  fedBy: string
}
export interface TheGoalsYouMayChange {
  mayChange: boolean
  mayChooseOwner?: boolean
  goals?: AGoalYouMayChange[]
  checkIns?: { id: string; label: string; feeds: string | null }[]
  people?: { id: string; name: string }[]
}
export interface AGoalAsGiven {
  title?: string
  measure?: string | null
  target?: string | null
  ownerId?: string | null
  checkInIds?: string[]
}
