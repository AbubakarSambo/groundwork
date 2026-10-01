import { apiClient } from './client'
import type { ServedPattern } from './patterns'

export type BoardSection =
  | 'phaseSpine' | 'quickRead' | 'objectives' | 'startingState' | 'divergence'
  | 'whatTheRoomIsAbout' | 'whoOwnsWhat' | 'dependencies' | 'checkInGrid' | 'contribution' | 'coverage'
  | 'cascade' | 'hiddenContributors' | 'patterns' | 'decisions' | 'poll'

export type BoardFamily = 'DELIVERY' | 'COHORT' | 'ONBOARDING' | 'EVALUATION' | 'SENSING' | 'AGREEMENT' | 'RECURRING' | 'SNAPSHOT' | 'UPDATE'
export type CoverageVariant = 'text' | 'bar'

/** A private-mode or sensing-family ground has no board, and says why. */
export type BoardAbsent = {
  groundId: string
  renders: false
  mode: 'PRIVATE' | 'SHARED'
  family: BoardFamily
  reason: string
}

/**
 * THE BOARD IS THERE AND IT IS NOT YOURS TO READ YET, which is a third answer and had no shape.
 *
 * The server sends `renders: true` together with `withheldUntilYouCheckIn` when the viewer owes
 * their own check-in. The board exists, it is held back until they have said their piece, so
 * `renders: false` would be untrue - that means this check-in has no board at all. But nothing
 * else comes with it, no sections and no title, and the page read `sections.includes(...)` the
 * moment `renders` was true.
 *
 * So the whole Boards page died on "Cannot read properties of undefined (reading 'includes')".
 * Hit on a real account with three stalled check-ins, which is exactly who this reply is for.
 */
export type BoardWithheld = {
  groundId: string
  renders: true
  withheldUntilYouCheckIn: true
  mode: 'PRIVATE' | 'SHARED'
  family: BoardFamily
  /** Why it is held back, in the server's own words. */
  saying: string
}

export type BoardPresent = {
  groundId: string
  renders: true
  withheldUntilYouCheckIn?: false
  mode: 'SHARED'
  family: BoardFamily
  sections: BoardSection[]
  title: string
  scenario: string
  coverageVariant: CoverageVariant
  /**
   * Whether the people here see each other's work. Set by the lead; the kind of
   * ground is only the fallback. Decides whether anyone is in a position to
   * confirm anyone else's account.
   */
  peopleWorkTogether?: boolean
  /** Which participant row is the caller, so only their own poll chip is clickable. */
  myParticipantId: string | null
  /** Whether the caller may set targets and the poll question (initiator only). */
  canEditFrame: boolean
  /** "You can read this check-in’s board and reports. Wairimu Kamau runs it.", for an admin who only reads. Null for everybody else. */
  readOnlyNote: string | null
  /** The newest thing in the record the board is built from. Opening the board does not move it. */
  lastChangedAt?: string | null
  /**
   * Somebody named in an account as doing work here who has no account of their own. Guarded on
   * the server: nothing that quotes anybody, names a party, or was inferred reaches this.
   */
  hiddenContributors?: { rows: { label: string; evidence: string }[]; why: string } | null
  /**
   * What this ground's objectives sit under, where anything sits above them. Present only on
   * boards whose family opted in, and only where the record named something above - or where the
   * situation said there should be one and nothing was named, which is the case worth showing.
   */
  cascade?: {
    isCascade: boolean
    basis: ('DECLARED' | 'A_PARENT_IS_RECORDED' | 'SAID_IN_THE_CHAT' | 'SEVERAL_TEAMS_NAMED')[]
    parentNamed: string | null
    teamsNamed: string[]
    why: string
  } | null
  participants: { id: string; name: string | null; role: string | null; managingOnly: boolean; signedOffAt: string | null }[]

  phaseSpine?: { startsAt: string | null; endsAt: string | null; currentSession: number; sessions: { n: number; state: string; date: string | null; /** The day it opens, for a session not yet done. */ opensOn?: string | null }[] }
  /** The ground's pre-agreed intent, set at creation. Null when none was set. */
  startingState?: string | null
  quickRead?: { label: string; value: string; sub: string; tone: string }[]
  objectives?: {
    /** What the target assumes, the lead's lines (U.7). */
    assumes?: string[]
    /**
     * Where it started, where it is, and what was said. The direction is derived from those three
     * rather than set anywhere: a ceiling like "under four hours" reads as distance covered coming
     * down, not as a bar filling backwards.
     */
    journey?: {
      direction: 'up' | 'down' | 'unknown'
      start: number | null
      now: number
      target: number | null
      say: string
      covered: number | null
    }
    id: string; name: string; count: number; prevCount: number; target: number | null; delta: number; isNew: boolean
    /** The lead's own line about what is not settled here - a number nobody has defined is not agreed. */
    notSettled?: string | null
    /** Whose number it is. Null is the whole check-in's. `owner` is the name this reader may see. */
    ownerParticipantId?: string | null
    owner?: string | null
    askedOf: { participantId: string; name: string | null; asked: boolean }[] | null
    /** What the record suggests, when it disagrees with the lead's number. Never applied automatically. */
    suggestedCount: number | null
    /* The line it was read from, so a lead sees what they are accepting rather than a bare number. */
    suggestedSaid?: string | null
  }[]
  /** Shown to the lead when no targets exist, because nothing else prompts for them. */
  objectivesPrompt?: string
  /**
   * The judgement over every answer: the gap, what the counts say, what to do, what this cannot
   * tell you, and what we failed to ask. Whoever runs the check-in, and everybody once the report
   * is released. See TheJudgement and the-judgement-over-the-answers on the server.
   */
  theJudgement?: {
    theGap?: string
    whatTheNumbersSay?: { fieldId?: string; says: string; soWhat?: string }[]
    whatToDo?: { move: string; because: string; startWith?: string }[]
    whatThisCannotTellYou?: { about: string; why?: string; toKnow?: string }[]
    whatWeFailedToAsk?: { about: string; howManyMissedIt?: number }[]
  } | null
  /** The counts it was written from. Lead only: it is the working, not the finding. */
  theTable?: string | null
  /** `whyNothingYet`: why there is nothing to compare, from the counts - see why-nothing-is-cross-referenced.ts. */
  divergence?: { items: any[]; agreements: any[]; centralQuestion: string | null; pointer: string; whyNothingYet?: string }
  /** The aims, the places and the things, added up across everybody. Null until a round has closed. */
  whatTheRoomIsAbout?: {
    aims: { aim: string; held: string[] }[]
    places: { name: string; named: string[] }[]
    things: { name: string; named: string[] }[]
    readAtSession: number | null
  } | null
  whatTheRoomIsAboutNote?: string
  whoOwnsWhat?: { participantId: string; name: string | null; role: string | null; items: { id: string; type: string; text: string; sessionNumber: number | null }[] }[]
  dependencies?: { id: string; from: string | null; fromParticipantId?: string | null; what: string; on: string | null; onParticipantId?: string | null; status: 'BLOCKING' | 'WAITING' | 'CLEARED'; then: string | null }[]
  checkInGrid?: { sessions: number[]; rows: { participantId: string; name: string | null; role: string | null; managingOnly: boolean; cells: Record<string, string> }[] }

  /**
   * WHERE EACH PERSON IS AGAINST THEIR OWN NUMBER, ordered by what needs attention.
   *
   * Lead-only, and absent for everybody else rather than empty: a read that names what to ask
   * somebody to do is a manager's read of their own team, not something a colleague may hold about
   * a colleague. The order ranks situations and never people - see the server module.
   */
  /** Lead-only: where per-person targets exist but some have no owner, so everybody can see them. */
  targetsNobodyOwns?: string | null

  /**
   * Lead-only: things a check-in asked for and did not get, after it stopped asking.
   *
   * Never a mark against anybody - half the time nobody could have answered it. What it tells a
   * lead is which questions their check-ins are not managing to answer, which is as often a fact
   * about the setup as about a person.
   */
  stillUnanswered?: { who: string; what: string; sinceRound: number; certain: boolean }[]

  eachPerson?: {
    participantId: string
    who: string
    /** True where `who` is their role standing in for a name nobody has given. */
    nameIsTheirRole: boolean
    target: number | null
    count: number
    reason: 'has not answered' | 'stuck and not chasing' | 'behind the pace' | 'nothing checkable' | 'nothing to do' | 'not let in'
    /** What happened and what would change it, in a full sentence from the server. Shown under the pill in place of a fixed phrase. */
    says: string
    ask: string | null
    /** REQUEST 85: an admin did not let this person in. `notLetInBy` is the decider's name, for whoever runs the check-in or an admin only. */
    notLetIn?: boolean
    notLetInBy?: string | null
    notLetInAt?: string | null
  }[]
  /**
   * EACH PERSON'S OWN LINE, AND WHAT KEEPS COMING UP ABOUT THEIR WORK (board-as-lead.txt, "The team
   * today"). The same rows as `eachPerson`, for whoever runs the check-in only, with the one-line
   * summary the record already gives that row and, where a pattern has come up about that person,
   * one plain sentence naming it. Left off a row with nothing to add.
   */
  eachPersonToday?: {
    participantId: string
    who: string
    line: string
    keepsComingUp?: string
  }[]
  contribution?: {
    participantId: string; name: string | null; remit: string | null; remitDefined: boolean
    /** Always null. There is deliberately no on-track/below-track label - see board.service.ts. */
    position: null; positionLabel?: string | null; reason: string | null
    fnLabel?: string | null; fnConfident?: boolean; isBlocked?: boolean; ownVoice?: string | null
    note?: string; guard?: string
    /**
     * How much this read rests on, and whether it clears the floor to be shown
     * at all. A confident sentence about a person built on two data points is
     * the one a manager remembers, so a thin read is withheld rather than hedged.
     */
    confidence?: number; evidenceCount?: number; shown?: boolean; basis?: string
  }[]
  coverage?: {
    scope: string
    reads: {
      participantId: string; name: string | null; scope: string; pct: number
      kind: 'LEAKING' | 'ABSORBING' | 'STABLE'; trend: string; what: string
      reason: string; reasonText: string; ownVoice: string | null
      coupledToBlocker: boolean; remitDefined: boolean
      confidence?: number; evidenceCount?: number; shown?: boolean; basis?: string
    }[]
  }
  managerAlignment?: {
    managerParticipantId: string; managerName: string | null
    /** One of the MANAGEMENT role map's failure patterns. */
    pattern: string
    /** CONTROL and ABDICATION need opposite responses, so the pole is shown. */
    pole: 'CONTROL' | 'ABDICATION' | 'NEITHER'
    label: string; gap: string; note: string
    /** How many periods it was visible across. One is never a pattern. */
    periods: number
  }[]
  /**
   * PATTERNS ABOUT THE WORK (board-as-lead.txt, "What keeps coming up"). Each pattern's own
   * participantId is here so the page can place it under that person's line; there is no `label`
   * joining a pattern to a name. The server already serves only what this reader may read (see
   * api/src/modules/patterns/who-reads-a-pattern.ts) - whoever runs the check-in reads everybody's,
   * after each person's own turn, and a colleague reads only their own. `BoardPage.tsx` filters on
   * `.yours` for a reader who does not run the check-in as well, so a colleague's page never draws
   * another person's pattern even if a future change to this file made the server send one.
   */
  patterns?: ServedPattern[]
  decisions?: { question: string; why: string; owner: string; source: 'blocker' | 'divergence' }[]
  poll?: { id: string; question: string; options: { id: string; label: string; who: (string | null)[]; whoIds: string[]; count: number }[] } | null

  /**
   * THE KIND OF WORK THIS CHECK-IN IS ABOUT (request 76). One of the eleven names in
   * `KIND_OF_WORK_OPTIONS` below, exactly as the server writes it, or `null` when nobody has said.
   * Read from the lead's own words at setup; the lead, or an admin of the organisation, can change
   * it with `groundsApi.setKindOfWork`. A later read never overwrites the lead's own choice.
   */
  kindOfWork?: KindOfWork | null
  /**
   * THE RECORDS THE KIND OF WORK KEEPS: deals and their stages, releases, tickets, a matter's
   * deadlines and parties, and so on - one section per name in the switchboard (`section`, e.g.
   * "Deal grid"). Each section says what it holds, in plain words, and whether it is filled, has
   * none yet, or is not something Groundwork keeps for this kind ("not-known", with `why`). Only
   * the lead can add, change or remove a row, with `boardApi.addWorkItem` / `updateWorkItem` /
   * `deleteWorkItem`. Who sees which rows is already decided by the server.
   */
  workRecords?: AServedWorkSection[]
}

export type BoardResponse = BoardAbsent | BoardWithheld | BoardPresent

/** The eleven kinds of work Groundwork's board can draw records for, exactly as the server writes them. */
export const KIND_OF_WORK_OPTIONS = [
  'sales org',
  'engineering release',
  'support desk',
  'distribution operations',
  'trader training programme',
  "founder's own check-in",
  'asset loans',
  'MarketView where next',
  'MarketView Q4',
  'a law firm matter',
  'a government programme',
] as const

export type KindOfWork = (typeof KIND_OF_WORK_OPTIONS)[number]

/** One row of a kind of work's record: a deal, a release, a ticket, a deadline, a party, and so on. */
export interface AServedWorkRow {
  id: string
  kind: string
  name: string
  stage: string | null
  owner: string | null
  ownerParticipantId: string | null
  due: string | null
  fields: Record<string, string>
  /** "said": read from somebody's check-in, with `said` holding their words exactly. "lead": added by the lead. */
  from: 'said' | 'lead'
  said?: string
  /**
   * REQUEST 89: WHO SAID THIS RECORD, as a first name ("Baraka"), or "a colleague" (lower case,
   * to sit inside "In ...'s words") where this reader may not be told who. Null for a record the
   * lead added, and null when `from` is "lead".
   */
  saidBy?: string | null
  /** The id behind `saidBy`, or null for "a colleague" and for a record the lead added. */
  saidByParticipantId?: string | null
}

export type AServedWorkSection =
  | { section: string; holds: string; state: 'not-known'; why: string }
  | { section: string; holds: string; state: 'none-yet' | 'filled'; stages?: string[]; rows: AServedWorkRow[] }

/** What the lead sends to add or change a record of the kind of work. */
export interface WorkItemInput {
  kind?: string
  name?: string
  stage?: string | null
  ownerParticipantId?: string | null
  due?: string | null
  fields?: Record<string, string>
}

export const boardApi = {
  get: (groundId: string, coverage?: CoverageVariant) =>
    apiClient
      .get<BoardResponse>(`/grounds/${groundId}/board`, {
        params: coverage ? { coverage } : undefined,
        skipNotFoundToast: true,
      } as any)
      .then((r) => r.data),

  /**
   * PROPOSE A SPLIT OF ONE TOTAL ACROSS PEOPLE. Writes nothing.
   *
   * Either people typed in, or `rows` straight out of a CRM export - first row the header. What it
   * read comes back beside the numbers, so a wrong column is obvious rather than buried in a figure.
   */
  proposeObjectives: (groundId: string, dto: { total: number; people?: { key: string; lastPeriod: number; months?: number }[]; rows?: (string | number | null)[][] }) =>
    apiClient.post<{
      shares: { key: string; target: number; runRate: number; upliftPct: number; because: string; monthsKnown: boolean }[]
      saying: string
      readFromTheFile: { missing: string[]; skipped: number; people: number } | null
    }>(`/grounds/${groundId}/board/objectives/propose`, dto).then((r) => r.data),

  /** Initiator only: the lead's frame. A target, never an assessment of a person. */
  createObjective: (groundId: string, dto: { name: string; target?: number | null }) =>
    apiClient.post(`/grounds/${groundId}/board/objectives`, dto).then((r) => r.data),

  updateObjective: (groundId: string, objectiveId: string, dto: { name?: string; target?: number | null; count?: number; assumes?: string[] }) =>
    apiClient.patch(`/grounds/${groundId}/board/objectives/${objectiveId}`, dto).then((r) => r.data),

  deleteObjective: (groundId: string, objectiveId: string) =>
    apiClient.delete(`/grounds/${groundId}/board/objectives/${objectiveId}`).then((r) => r.data),

  /** Lead only: add a record of the kind of work (a deal, a release, a deadline). Every refusal is a plain sentence. */
  addWorkItem: (groundId: string, dto: WorkItemInput) =>
    apiClient.post<AServedWorkRow>(`/grounds/${groundId}/board/work-items`, dto).then((r) => r.data),

  /** Lead only: change a record, or move its stage on. */
  updateWorkItem: (groundId: string, itemId: string, dto: WorkItemInput) =>
    apiClient.patch<AServedWorkRow>(`/grounds/${groundId}/board/work-items/${itemId}`, dto).then((r) => r.data),

  /** Lead only: remove a record. */
  deleteWorkItem: (groundId: string, itemId: string) =>
    apiClient.delete<{ deleted: true }>(`/grounds/${groundId}/board/work-items/${itemId}`).then((r) => r.data),

  /** Initiator only: set the availability question and the times. */
  upsertPoll: (groundId: string, dto: { question: string; options: string[] }) =>
    apiClient.post(`/grounds/${groundId}/board/poll`, dto).then((r) => r.data),

  /** Availability is logistics, so every party can set their own. */
  togglePoll: (groundId: string, optionId: string) =>
    apiClient
      .post<{ optionId: string; available: boolean; count: number }>(`/grounds/${groundId}/board/poll/${optionId}/toggle`)
      .then((r) => r.data),
}
