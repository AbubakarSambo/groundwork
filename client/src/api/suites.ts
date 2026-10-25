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
  /*
   * `skipForbiddenToast` (real-user walk, Kijani Foods, fault 7): SuitesPage already renders its
   * own refusal inline ("Only an admin or a lead can open the suites.", or the server's own
   * message). Without this, the generic interceptor's toast fired too, and it is written for a
   * check-in ("whoever runs this check-in can let you in") - wrong for a settings page nobody runs
   * a check-in to open. Esther, a member, opening /settings/suites read that check-in sentence
   * instead of a settings-shaped one.
   */
  get: async (): Promise<SuitesPage> => (await apiClient.get('/suites', { skipForbiddenToast: true } as any)).data,
  switch: async (key: string, on: boolean, answers?: Answers): Promise<SuitesPage> =>
    (await apiClient.put(`/suites/${key}`, answers ? { on, answers } : { on })).data,
  /**
   * WHICH OF YOUR SUITES ARE ON (GET /suites/mine, journey walk row 5). Open to everybody in the
   * organisation, and a suite that is off is a no here, never a 404. The screens read this once and
   * never ask `/suites/{leave,spend,time,reviews}/mine` for a suite that is off.
   */
  mine: async (): Promise<SuitesOnForYou> => (await apiClient.get('/suites/mine', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
}
export interface SuitesOnForYou { leave: boolean; spend: boolean; time: boolean; reviews: boolean; any: boolean; says: string }

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
  /* B-214: `skipNotFoundToast` too, not only `skipForbiddenToast` - a switched-off suite answers
     404, and OnboardingBoardPage.tsx already shows the server's own "not switched on" sentence
     (via SuiteOffMessage), so the generic "That is not here any more" toast on top of it was the
     same sentence said twice. */
  get: async (): Promise<{ people: NewPerson[] }> => (await apiClient.get('/suites/onboard/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
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
  /** The kind of leave ("Annual leave"), or null when the organisation has set no kinds. */
  leaveKind: string | null
  /** Each leave rule that applies, in full sentences with the person's name. */
  rules: string[]
  /** Where it is, in a full sentence for this reader: "Wairimu has approved it, and it is now waiting for you." */
  where: string
  /** What the person owns in those days, each a full sentence. */
  owns: string[]
  /** Each question asked about it, and the answer, in full sentences. */
  questions: string[]
  /** The whole request as this reader reads it: the days, the days left, who else is off, the stand-in, what the person owns, the questions. */
  said: string[]
  /**
   * Others in the same team already off on those days, by approved leave, with how many, who, and
   * the sentence (the same one the approver's queue says it). Null when the person has no team, or
   * nobody is off (request 162's new-for-the-screens: `clash` on each waiting leave request).
   */
  clash?: { count: number; names: string[]; says: string } | null
}
export interface LeaveOff { id: string; name: string; startsOn: string; endsOn: string; kind: string; kindName?: string | null }
/** A request whoever holds the HR duty is told of; served only to that person. */
export interface LeaveToldToHr { id: string; name: string; startsOn: string; endsOn: string; status: 'waiting' | 'approved'; kindName: string | null; said: string[] }
export interface LeaveBoard { reader?: 'admin' | 'lead' | 'approver' | 'hr'; waiting: LeaveWaiting[]; off: LeaveOff[]; toldToHr?: LeaveToldToHr[] }

export const leaveBoardApi = {
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     board already shows the server's own sentence, so the generic 404 toast repeated it. */
  get: async (): Promise<LeaveBoard> => (await apiClient.get('/suites/leave/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  /** `reason` is only ever sent with a decline (the controller's `DeclineDto`); the person is told it. */
  decide: async (id: string, outcome: 'approve' | 'decline', reason?: string): Promise<LeaveBoard> =>
    (await apiClient.post(`/suites/leave/requests/${id}/${outcome}`, outcome === 'decline' ? { reason } : undefined)).data,
  ask: async (id: string, question: string): Promise<LeaveBoard> =>
    (await apiClient.post(`/suites/leave/requests/${id}/question`, { question })).data,
}

/** Time sheets (GET /suites/time/board). For billing only. */
export interface TimeWeek {
  weekOf: string
  clients: string[]
  /** `where` is the server's own sentence for this row, for example "They are waiting for Daniel."
   *  or "Daniel approved these hours." - read only where the cell would otherwise say nothing
   *  (fault 2 of the live walk, 6 October): a reader who neither approves this row nor already sees
   *  it marked Approved used to read a blank last cell. */
  people: { personId: string; name: string; minutes: Record<string, number>; total: number; approved: boolean; mayApprove: boolean; where?: string }[]
}
export interface TimeAgreement { client: string; work: string; hours: number; span: 'whole' | 'month'; usedMinutes: number }
export interface TimeBoard { thisWeek: string; weeks: TimeWeek[]; agreements: TimeAgreement[] | null }

export const timeSheetsApi = {
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     board already shows the server's own sentence, so the generic 404 toast repeated it. */
  get: async (): Promise<TimeBoard> => (await apiClient.get('/suites/time/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  approve: async (weekOf: string, personId: string): Promise<TimeBoard> =>
    (await apiClient.post(`/suites/time/weeks/${weekOf}/people/${personId}/approve`)).data,
}

/** Performance reviews (GET /suites/reviews/board and /suites/reviews/:id). */
export interface NextReview {
  dueId: string
  name: string
  writtenWith: string | null
  /** What the Written with cell says, always a sentence-ready phrase: the name, or "Any admin" when nobody in particular writes it. */
  writtenWithSays?: string
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
  /**
   * THE APPEAL (decision 113), served here too and not yet drawn anywhere but the review itself
   * (engine workspace, 9 October: "the review appeal is drawn" - "Not drawn yet: ... the person's
   * card on Today (mayAppeal, appealSays)"). `mayAppeal`: the review is decided and not yet
   * appealed. `appealSays`: the server's own sentence for where an appeal already made stands.
   */
  mayAppeal?: boolean
  appealStands?: AppealStands | null
  appealSays?: string | null
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
/** An appeal of a decided review (decision 113), as the server serves it to each reader. */
export type AppealStands = 'with-an-admin' | 'needs-another-admin' | 'decided'
export interface YourAppeal {
  stands: AppealStands
  says: string
  appealedOn: string
  yourReasons: string
  additions: { said: string; on: string }[]
  outcome: 'stands' | 'changed' | null
  decidedByFirstName: string | null
  reasons: string | null
  decisionWas: { says: string; reasons: string } | null
}
/** For an admin who may decide the appeal, or the reviewer (who never reads `theirReasons` while it waits). */
export interface AppealForAnotherReader {
  reader: 'admin' | 'reviewer'
  stands: AppealStands
  says: string
  personFirstName: string
  appealedOn: string
  theirReasons?: string | null
  additions?: { said: string; on: string }[]
  mayDecide: boolean
  outcome: 'stands' | 'changed' | null
  decidedByFirstName: string | null
  reasons: string | null
  decisionWas: { says: string; reasons: string } | null
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
  /** Who wrote them, by sign-in, so the screen can tell the reader's own words from somebody else's even where two people share a first name (request 162, item 6). Null until they are written. */
  managersWordsById?: string | null
  theirView: string | null
  decision: { says: string; reasons: string } | null
  mayWrite: boolean
  /** Null for a review started before the record was read. */
  record?: TheRecord | null
  recognise?: RecogniseForTheWriter | null
  briefing?: ABriefing
  /** Null unless this reader is an admin who may decide the appeal, or the reviewer. */
  appeal?: AppealForAnotherReader | null
  /** Who made the decision as it stands now (after an appeal changed it, the admin who changed it). Null until decided. */
  decidedByYou?: boolean | null
  decidedByFirstName?: string | null
}
export interface ReviewForThePerson {
  reader: 'person'
  id: string
  firstName: string
  writtenWithFirstName: string | null
  dueOn: string
  noticed: Noticed[]
  theirView: string | null
  /** What the person who writes the review has written, word for word, once they have written it. Null until then. */
  managersWords: string | null
  /** Who wrote them, by sign-in (request 162, item 6). Null until they are written. */
  managersWordsById?: string | null
  /** The prototype's "What Wairimu writes". Null until `managersWords` exists. */
  managersWordsHeading: string | null
  /** Both views, side by side, once the writer and the person have each written theirs. Null until both exist. */
  whereYouDiffer: { says: string; managersWords: string; yourView: string } | null
  decision: { says: string; reasons: string } | null
  record?: TheRecord | null
  recognise?: RecogniseForThePerson
  /** Who writes the review with them; not the admin who changed the decision on appeal (who is `writtenWithFirstName` then). */
  writerFirstName?: string | null
  mayAppeal?: boolean
  mayAppealSays?: string | null
  appeal?: YourAppeal | null
}
/** RELEASE 7: the review as pictured ("A review built from check-ins"), served where the organisation has Release 7 on. */
export interface AReviewAsPictured {
  readings: { label: string; question: string; says: string; evidence?: string[] }[]
  committedHeading: string
  committed: { title: string; says: string; tone: 'rec' | 'att' | 'act' | 'con' }[]
  blockedOrDropped: { title: string; says: string; tone: 'rec' | 'att' | 'act' | 'con' }[]
  ownViewHeading: string
  ownView: string
  decidesHeading: string
  decides: string
}
export type AReview = (ReviewForTheWriter | ReviewForThePerson) & { asPictured?: AReviewAsPictured }

/**
 * AN ADMIN'S LIST OF APPEALS (decision 113, GET /suites/reviews/appeals). Not drawn until now
 * (engine workspace, 9 October: "the review appeal is drawn" - "Not drawn yet"): an admin who may
 * decide an appeal, and one who decided the review itself and is waiting for a second admin.
 */
export interface AppealToDecide { id: string; name: string; firstName: string; dueOn: string; appealedOn: string; reviewerFirstName: string | null }
export interface AppealWaitingForAnotherAdmin { id: string; name: string; firstName: string; dueOn: string; appealedOn: string; says: string }
export interface AppealsToDecide { appeals: AppealToDecide[]; waitingForAnotherAdmin: AppealWaitingForAnotherAdmin[] }

export const reviewsApi = {
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     board already shows the server's own sentence, so the generic 404 toast repeated it. */
  board: async (): Promise<ReviewsBoard> => (await apiClient.get('/suites/reviews/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  /* B-214: see the note above `board` - the reviews board queries this too (for the reader's own
     reviews), and a switched-off suite answering 404 toasted the generic sentence on top of the
     page's own, in the server's third-person wording ("An admin switches it on…"), even for the
     admin reading it about themself. */
  mine: async (): Promise<YourReview[]> => (await apiClient.get('/suites/reviews/mine', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  /**
   * THE SAME CALL, FOR TODAY. Today asks it for everyone (to draw a decided review's own appeal
   * card, mayAppeal/appealSays), not only somebody already on the Performance reviews page - and
   * the reviews suite is off for most organisations, which the server reads as a 404. `mine` above
   * is called only from the reviews board, where that 404 is the caller's own business; here, for
   * every reader on Today, it is the ordinary case and must not toast "Not found" at them.
   */
  mineQuietly: async (): Promise<YourReview[]> =>
    (await apiClient.get('/suites/reviews/mine', { skipNotFoundToast: true } as any)).data,
  start: async (dueId: string): Promise<{ id: string }> => (await apiClient.post(`/suites/reviews/due/${dueId}/start`)).data,
  one: async (id: string): Promise<AReview> => (await apiClient.get(`/suites/reviews/${id}`, { skipForbiddenToast: true } as any)).data,
  words: async (id: string, text: string): Promise<AReview> => (await apiClient.put(`/suites/reviews/${id}/words`, { text })).data,
  view: async (id: string, text: string): Promise<AReview> => (await apiClient.put(`/suites/reviews/${id}/view`, { text })).data,
  /** Release 7: your own view, drafted from your running record. Nothing is kept until you save it. */
  selfReviewDraft: async (id: string): Promise<string> => ((await apiClient.get(`/suites/reviews/${id}/self-review-draft`)).data as any)?.draft ?? '',
  /** The person, or whoever writes it, reads the record again for a review in progress. */
  updateFromTheRecord: async (id: string): Promise<AReview> => (await apiClient.post(`/suites/reviews/${id}/update-from-the-record`)).data,
  correct: async (id: string, lineKey: string, text: string): Promise<AReview> =>
    (await apiClient.post(`/suites/reviews/${id}/lines/${encodeURIComponent(lineKey)}/correction`, { text })).data,
  decide: async (id: string, decision: string, reasons: string): Promise<AReview> =>
    (await apiClient.post(`/suites/reviews/${id}/decision`, { decision, reasons })).data,
  appeal: async (id: string, why: string): Promise<AReview> => (await apiClient.post(`/suites/reviews/${id}/appeal`, { why })).data,
  addToTheAppeal: async (id: string, text: string): Promise<AReview> => (await apiClient.post(`/suites/reviews/${id}/appeal/more`, { text })).data,
  decideTheAppeal: async (id: string, input: { outcome: 'stands' | 'changed'; reasons: string; decision?: string }): Promise<AReview> =>
    (await apiClient.post(`/suites/reviews/${id}/appeal/decision`, input)).data,
  /* B-214: see the note above `board` - the reviews board queries this too, and a switched-off
     suite answering 404 toasted the generic sentence on top of the page's own. */
  appealsToDecide: async (): Promise<AppealsToDecide> =>
    (await apiClient.get('/suites/reviews/appeals', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
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
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     board already shows the server's own sentence, so the generic 404 toast repeated it. */
  get: async (): Promise<LeavingBoard> => (await apiClient.get('/suites/leaving/board', { skipNotFoundToast: true } as any)).data,
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
  /* B-214: see onboardingBoardApi.get's own note. */
  get: async (): Promise<RoleMap> => (await apiClient.get('/suites/roles/board', { skipNotFoundToast: true } as any)).data,
}

/** Spending and budgets (GET /suites/spend/board): what waits for a yes or no, and each team's budget. */
export type SpendApprover = { kind: 'manager' } | { kind: 'person'; firstName: string } | { kind: 'admin' }
export interface SpendWaiting {
  id: string
  name: string
  firstName: string
  amount: number
  what: string
  /** The line as the prototype reads it: "Kamau: KES 18,000 for fuel for Kisumu deliveries" (request 162, item 3). */
  says: string
  team: string | null
  left: number | null
  over: boolean
  approver: SpendApprover
  mayDecide: boolean
  /** Where it is, in a full sentence for this reader: "Wairimu has approved it, and it is now waiting for Omar in finance." */
  where: string
  /** The category it is for, when the spending rules have categories. */
  category: string | null
  /** The evidence the rules ask for, in full sentences: "Spending on Fuel needs a receipt." */
  needs: string[]
  /** Each question asked about it, and the answer, in full sentences. */
  questions: string[]
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
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     board already shows the server's own sentence, so the generic 404 toast repeated it. */
  get: async (): Promise<SpendBoard> => (await apiClient.get('/suites/spend/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  /** `reason` is only ever sent with a decline (the controller's `DeclineDto`); the person is told it, word for word. */
  decide: async (id: string, outcome: 'approve' | 'decline', reason?: string): Promise<SpendBoard> =>
    (await apiClient.post(`/suites/spend/requests/${id}/${outcome}`, outcome === 'decline' ? { reason } : undefined)).data,
  ask: async (id: string, question: string): Promise<SpendBoard> =>
    (await apiClient.post(`/suites/spend/requests/${id}/question`, { question })).data,
  setBudget: async (team: string, amount: number): Promise<SpendBoard> =>
    (await apiClient.put('/suites/spend/budgets', { team, amount })).data,
}

/**
 * THE APPROVER'S QUEUE (GET /suites/queue): everything that waits for this one person to approve or
 * decline, leave and spending together, oldest first, a page at a time, with the counts of the whole
 * of it (the-approvals-queue.service.ts). Approve and decline use the same calls the leave and
 * spending boards already use (`leaveBoardApi.decide`/`spendApi.decide`), by `item.suite`.
 */
export interface AQueueItem {
  id: string
  suite: 'leave' | 'spend'
  name: string
  firstName: string
  team: string | null
  waitingSince: string
  workingDaysWaiting: number
  pastTheDeadline: boolean
  /** The request in a full sentence: "Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days." */
  says: string
  /** How long it has waited, in a full sentence. */
  waitedSays: string
  /** Where it is, in a full sentence for this reader. */
  where: string
  amount: number | null
  line: string | null
  startsOn: string | null
  endsOn: string | null
  /** Others in the same team already off on those days, with how many, who, and the sentence. Leave only. */
  clash: { count: number; names: string[]; says: string } | null
  /** Set only when the reader reads this because they stand in for somebody on leave. */
  standingIn: { name: string; until: string | null; says: string } | null
}
export interface TheQueue {
  counts: { all: number; leave: number; spend: number; pastTheDeadline: number }
  page: number
  pageSize: number
  pages: number
  items: AQueueItem[]
  /** One full sentence for the top of the page. */
  says: string
}

export const queueApi = {
  /* Quiet on 404 and 403: an organisation with the suites off answers 404 here, and the sidebar and
     Today read this for everybody, so a pop-up would greet almost every existing client on every page
     (walk of the existing clients' use cases, 7 October). The pages that show the queue say it in words. */
  get: async (params?: { page?: number; pageSize?: number; suite?: 'leave' | 'spend' }): Promise<TheQueue> =>
    (await apiClient.get('/suites/queue', { params, skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
}

/**
 * THE BATCH DECISION (POST /suites/decisions), ready from the engine (docs/answers-from-engine.md,
 * "For the screens: the batch decision, ready"). Between 1 and 50 decisions at once; every one is
 * answered by the route that answers it alone, in the order given, and one that fails never stops
 * the others. `says` is the server's own summary sentence ("All four answers were kept.", or "One of
 * the six answers was kept. Five could not be kept, and each says why."). A whole-call refusal (none,
 * more than 50, an outsider, or no suite on) throws instead, and is shown as any other refusal.
 */
export interface ADecisionGiven { suite: 'leave' | 'spend' | 'hours'; id: string; answer: 'approve' | 'decline'; reason?: string }
export interface ADecisionResult { id: string; suite: 'leave' | 'spend' | 'hours' | null; ok: boolean; says: string }
export interface TheDecisionsResult { results: ADecisionResult[]; answered: number; says: string }

export const decisionsApi = {
  decide: async (decisions: ADecisionGiven[]): Promise<TheDecisionsResult> =>
    (await apiClient.post('/suites/decisions', { decisions })).data,
}

/**
 * TO-DOS (GET /suites/todos/board): what each person said they will do in their check-ins.
 * Decision 110, P8: an admin reads these by check-in, never gathered into one list for a person
 * across check-ins (a person's own load across check-ins stays private). `checkIns` is the
 * engine's served shape (request 176); until it ships, `people` is regrouped by check-in on the
 * screen (TodosPage.tsx).
 */
/**
 * The To-dos board, one list for each check-in (decision 110, P8; the engine's answer of 7 October).
 * The same person in two check-ins is in two lists, and nothing joins them. `people` is the old
 * shape, kept optional only so a server that has not yet moved still draws, regrouped by check-in.
 */
export interface TodoList {
  checkIns?: { id: string; label: string; people: { name: string; firstName: string; todos: { id: string; text: string; source: 'check-in'; on: string; checkIn: string }[] }[] }[]
  people?: { name: string; firstName: string; todos: { id: string; text: string; source: 'check-in'; on: string; checkIn: string }[] }[]
}

export const todosApi = {
  /* B-214: see onboardingBoardApi.get's own note. */
  get: async (): Promise<TodoList> => (await apiClient.get('/suites/todos/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
}

/** Customers and deals (GET /suites/customers/board). */
export interface CustomerList {
  customers: { id: string; name: string; standing: string | null; owner: string | null; lastContact: string | null }[]
}

export const customersApi = {
  /* B-214: see onboardingBoardApi.get's own note. */
  get: async (): Promise<CustomerList> => (await apiClient.get('/suites/customers/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
}

/** Equipment (GET /suites/equipment/board). Admins only. */
export interface EquipmentBoard {
  items: { id: string; name: string; holderId: string | null; holder: string | null; condition: string | null }[]
  people: { id: string; name: string }[]
}

export const equipmentApi = {
  /* B-214: see onboardingBoardApi.get's own note. */
  get: async (): Promise<EquipmentBoard> => (await apiClient.get('/suites/equipment/board', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
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

/** One line of the month's totals: a team, or a category, or all of them (GET /suites/spend/finance/totals). */
export interface ATotal {
  /** The team or category, or "All teams". */
  name: string
  asked: { count: number; amount: number }
  approved: { count: number; amount: number }
  paid: { count: number; amount: number }
  waiting: { count: number; amount: number }
  declined: { count: number }
  /** The line in one full sentence. */
  says: string
}
export interface TheMonthsTotals {
  reader: 'finance' | 'admin'
  currency: string | null
  /** "2026-10". */
  month: string
  /** "October 2026". */
  monthSays: string
  all: ATotal
  byTeam: ATotal[]
  byCategory: ATotal[]
  /** One full sentence for the top of the page. */
  says: string
}

export const financeApi = {
  /* B-214: see onboardingBoardApi.get's own note - a switched-off suite answers 404, and the
     page already shows the server's own sentence, so the generic 404 toast repeated it; a 403
     (not finance, not an admin) is shown the same way, so that toast is skipped too. */
  get: async (): Promise<FinanceView> => (await apiClient.get('/suites/spend/finance', { skipForbiddenToast: true, skipNotFoundToast: true } as any)).data,
  /** The month's spending added up from the requests, by team and by category (`month`: "2026-10"; the current month when left out). */
  totals: async (month?: string): Promise<TheMonthsTotals> =>
    (await apiClient.get('/suites/spend/finance/totals', { params: month ? { month } : undefined })).data,
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

/**
 * A PERSON'S OWN REQUESTS (GET /suites/leave/mine and /suites/spend/mine). Only the person's own;
 * the server writes every sentence: where each one stands, the questions asked and the answers, and
 * what was said when it was declined. An answer to a waiting question goes back with the whole list.
 */
export interface YourRequest {
  id: string
  status: 'waiting' | 'approved' | 'declined'
  where: string
  questions: string[]
  questionWaiting: { id: string; question: string; askedBy: string } | null
  declinedBecause: string | null
}
export interface YourLeave { daysLeftSaid: string; requests: YourRequest[] }
export interface YourSpending { requests: YourRequest[] }

/**
 * A PERSON'S OWN HOURS (GET /suites/time/mine, fault 1 of the live walk, 6 October). After
 * confirming hours in chat a person is told "...you will see it under your hours.", but there was
 * nowhere on /suite/mine that showed them. `where` is the server's own sentence for each week, for
 * example "Your hours for the week of Monday 5 October are waiting for Daniel."; `standing` is
 * where this person stands against the time sheet rules this week (null with no rule, or none set
 * for this person) - the same sentence Today and Ask Groundwork already read.
 */
export interface YourHoursWeek { weekOf: string; minutes: Record<string, number>; total: number; approved: boolean; where: string }
export interface YourHours { weeks: YourHoursWeek[]; standing: string | null }

export const yourRequestsApi = {
  /* Quiet on 404 and 403, for the same reason as the queue: the page says the suite is off in words. */
  leave: async (): Promise<YourLeave> => (await apiClient.get('/suites/leave/mine', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
  spending: async (): Promise<YourSpending> => (await apiClient.get('/suites/spend/mine', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
  hours: async (): Promise<YourHours> => (await apiClient.get('/suites/time/mine', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
  answerLeave: async (id: string, answer: string): Promise<YourLeave> =>
    (await apiClient.post(`/suites/leave/requests/${id}/answer`, { answer })).data,
  answerSpending: async (id: string, answer: string): Promise<YourSpending> =>
    (await apiClient.post(`/suites/spend/requests/${id}/answer`, { answer })).data,
}

/**
 * FILING A REQUEST FROM ITS OWN FORM (request 165, Hafsah 6 October; docs/requests-to-engine.md).
 * The button on `openTheRequest` (anchor pieces 26/27) opens `/suite/leave/new` or
 * `/suite/spend/new` rather than Ask, so the person files the request themselves, from the same
 * form anybody else reaches these pages from. On success the server answers `{ id, says }` -
 * `says` is its own sentence, said on `/suite/mine`. A refusal is said in the server's own words
 * too (see `whatFilingARequestSays` in `@/lib/file-a-request-error`), which falls back to "This
 * request could not be sent from here yet..." only for a bare 404 that carries no message of its
 * own - the route existed and simply refused, every other time.
 */
export interface NewLeaveRequest { startsOn: string; endsOn: string; kind?: string; standInUserId?: string }
export interface NewSpendingRequest { amount: number; what: string; category?: string }
/** The server's own confirmation: an id, and its own sentence for what just happened. */
export interface RequestFiled { id?: string; says?: string }
/**
 * WHAT THE LEAVE FORM MAY OFFER (`GET /suites/leave/form`), open to any member of the organisation
 * who is not a guest - never the rules themselves, which stay admin/HR-only on `/suites/leave/rules`.
 * `standIns` are the colleagues who could cover, by name and id, never an address.
 */
export interface LeaveFormInfo { kinds: { key: string; name: string }[]; standIns: { userId: string; name: string }[] }
/**
 * WHAT THE SPENDING FORM MAY OFFER (`GET /suites/spend/form`): the currency, what the organisation
 * calls a category ("project", "category"), and the categories themselves. Never a limit, a
 * threshold or who approves.
 */
export interface SpendFormInfo { currency: string | null; categoryCalled: string; categories: string[] }

export const fileARequestApi = {
  leave: async (input: NewLeaveRequest): Promise<RequestFiled> =>
    (await apiClient.post('/suites/leave/requests', input, { skipNotFoundToast: true } as any)).data,
  spending: async (input: NewSpendingRequest): Promise<RequestFiled> =>
    (await apiClient.post('/suites/spend/requests', input, { skipNotFoundToast: true } as any)).data,
  /** A receipt or a proforma, attached to the person's own request while it waits (polish round 1, 25 October). Only its name and words are kept. */
  attachToSpending: async (id: string, file: File, kind: 'receipt' | 'quote'): Promise<{ id: string; says: string }> => {
    const body = new FormData(); body.append('file', file); body.append('kind', kind)
    return (await apiClient.post(`/suites/spend/requests/${id}/attachment`, body, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  /** With the suite off this throws a 404 carrying the board's own off sentence; the form reads
      that straight from the error rather than treating it as a generic failure. */
  leaveForm: async (): Promise<LeaveFormInfo> =>
    (await apiClient.get('/suites/leave/form', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
  spendForm: async (): Promise<SpendFormInfo> =>
    (await apiClient.get('/suites/spend/form', { skipNotFoundToast: true, skipForbiddenToast: true } as any)).data,
}
