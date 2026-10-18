import { apiClient } from './client'
import type { ServedPattern } from './patterns'
import type { TheMonthBoard, TheEndOfMonthRead, TheActiveLine, TheIdeasFromYourTeam, TheAnchorBoardSections } from './anchorShapes'

export type BoardSection =
  | 'phaseSpine' | 'quickRead' | 'objectives' | 'startingState' | 'divergence'
  | 'whatTheRoomIsAbout' | 'whoOwnsWhat' | 'dependencies' | 'checkInGrid' | 'contribution' | 'coverage'
  | 'cascade' | 'hiddenContributors' | 'patterns' | 'decisions' | 'poll'
  /* The anchor scenario's own sections (decision 114; docs/anchor-scenario.md sections 11, 12, 18, 19,
     23, 24), named by the switchboard for that scenario alone (api/src/modules/board/board-families.ts,
     SCENARIO_SECTIONS_ADDED) and drawn by the ordinary board page like any other section. */
  | 'whatYouAreCarrying'
  | 'howGroundworkWillWork'
  | 'theFourLenses'
  | 'ideasFromTheTeam'
  | 'peopleHelpingTheTeamMove'
  | 'recommendations'
  | 'weeklyInsight'

export type BoardFamily = 'DELIVERY' | 'COHORT' | 'ONBOARDING' | 'EVALUATION' | 'SENSING' | 'AGREEMENT' | 'RECURRING' | 'SNAPSHOT' | 'UPDATE'
export type CoverageVariant = 'text' | 'bar'

/**
 * REQUEST 112 (b): WHAT THE LEAD CAN DO ABOUT ONE ITEM UNDER "What needs you" (board-as-lead.txt:
 * "Yes, it counts" / "No", "Share now" / "Hold it", "Ask him"). Sent to the lead alone - nobody
 * else is ever sent an `action`, and the ids it is built from are sent to nobody. `goesTo` is
 * where the one button leads ("check-in" or "context") where there are no `choices`; each choice
 * carries the route that keeps that exact answer, or `null` where the answer changes nothing
 * ("Not yet").
 */
export interface AnAction {
  label: string
  /** Not always sent: a choice with `route: null` ("Not yet") draws only when this is there to say
      something back - see `ActionButtons` in BoardPage.tsx. */
  says?: string
  goesTo: 'check-in' | 'context' | null
  choices?: { label: string; route: { method: 'PATCH' | 'POST'; path: string; body: Record<string, unknown> } | null }[]
}

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

/**
 * REQUEST 123: "What was agreed at the start", the onboarding board's own shape for
 * `startingState` (docs/answers-from-engine.md, "Request 123"). Built from each person's goals
 * (`PersonObjective`) and the commitments made in session 1, grouped by the step of the first 90
 * days they fall due in.
 */
export interface StartingStateAtTheStart {
  /** "What was agreed at the start". */
  heading: string
  rows: {
    /** "Day 1", "By day 30", "By day 60", "By day 90" or "After day 90", in that order. */
    when: 'Day 1' | 'By day 30' | 'By day 60' | 'By day 90' | 'After day 90'
    /** "You" to the person this row is about, otherwise their name. */
    whose: string
    /** One full sentence, e.g. "A goal was agreed for Tobi Adewale, to be met by day 90." */
    says: string
    /** The goal as it was written down, for the screen to draw under the step. Null for a commitment. */
    what: string | null
    kind: 'goal' | 'commitment'
  }[]
}

/**
 * REQUEST 123: "Change since last check-in", the onboarding board's own field (docs/answers-from-
 * engine.md, "`changeSinceLast`, 'Change since last check-in'"). One row per area between the last
 * two finished sessions. Absent until two sessions are finished, and absent for a reader who may
 * read nothing in it.
 */
export interface ChangeSinceLast {
  /** "Change since last check-in". */
  heading: string
  /** "Between session 5 and session 6." */
  between: string
  rows: {
    /** "Commitments", "Waits", or the goal's own words. */
    area: string
    state: 'moved' | 'held' | 'late'
    /** One or more full sentences. */
    says: string
    kind: 'commitments' | 'waits' | 'goal'
  }[]
}

/**
 * REQUEST 123: "The 90 days, in three steps" (docs/answers-from-engine.md, "Request 123, the
 * rest"). Built from the goals told to the person, their commitments, and what they wait for.
 */
export interface NinetyDays {
  /** "The 90 days, in three steps". */
  heading: string
  steps: {
    step: number
    day: number
    /** E.g. "Is Tobi Adewale settled in?" to the lead, "Are you settled in?" to the new hire. */
    question: string
    /** One or more full sentences. */
    says: string
    reached: boolean
  }[]
}

/**
 * THE BOARD AT A GLANCE (the light prototype; docs/light-rebuild/sales-first.md, rules 3 and 4):
 * one fact for each folded line, two for each box, and what is waiting on the lead, built by the
 * server from the board this reader is served (api/src/modules/board/the-board-at-a-glance.ts).
 * Sent on a sales board to every reader but a participant, who reads their own view. A fact the
 * record cannot say is left out, never made up.
 */
export type GlanceLine =
  | 'deals' | 'targetAssumes' | 'reported' | 'targetsOverTime' | 'whereHeading' | 'forecast' | 'likelyEnd' | 'byArea' | 'sitsUnder' | 'landing'
  | 'whatToAsk' | 'teamToday' | 'patterns' | 'whoCheckedIn' | 'helpNobodyMentioned'
  | 'yourNextStep' | 'commitments' | 'workPlan'
  | 'blockers' | 'risks' | 'waitingOnOtherTeams' | 'openIssues'
  | 'reports'
export type GlanceBox = 'work' | 'team' | 'plan' | 'risk' | 'rest'
export type TheBoardAtAGlance = {
  lines: Partial<Record<GlanceLine, string>>
  boxes: Record<GlanceBox, string[]>
  /** For an admin or the chief executive: what is waiting on the lead, in one line. */
  needsTheLead: string | null
  /** One fact for each "What the target of 25 assumes" line, by the target's id. */
  assumesEach: Record<string, string>
}

export type BoardPresent = {
  groundId: string
  atAGlance?: TheBoardAtAGlance | null
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
   * DECISION 77: "Faraji Odhiambo is waiting to be let in." (or "...was not let in.", or null).
   * Sent only to whoever runs the check-in, the admin who set it up, or an admin with access to
   * it - null for everybody else, whether or not anybody is held at the door. Draw it beside the
   * count in `HowItIsGoing`, never inside it.
   */
  waitingToBeLetIn?: string | null
  /**
   * BOARD FIX (sales B, item 3a): WHETHER THE TEAM'S PICTURE IS SHARED, FOR A PARTICIPANT
   * (a-participants-board-is-their-own.ts). `shared: true` once the report has gone out to the
   * people in it; `shared: false` with `says` (the server's own sentence) and `yourOwnReport` (the
   * server's own "Your own report is ready now.", or null when this reader has no report yet) while
   * it has not. Present only on a participant's own narrowed board - absent for the lead.
   */
  teamPicture?: { shared: true } | { shared: false; says: string; yourOwnReport: string | null }
  /**
   * "YOUR SHARE" (request 107 c; board-as-participant.txt: "4 of your 5 sales so far; 3 paid. Only
   * you and Wairimu see your share."). Only this reader's own targets with a number set, each
   * already said as a full sentence (`says`) and already ending in who else may see it (`whoSees`).
   * Present only for a participant who owns at least one such target.
   */
  yourShare?: { objectiveId: string; says: string; whoSees: string }[]
  /**
   * REQUEST 110 (a): the sentence to show beside an empty `yourShare` ("There is no number of yours
   * on this board yet, so there is no share to show."). Sent only when `yourShare` is `[]`.
   */
  yourShareSays?: string
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
  participants: { id: string; name: string | null; role: string | null; managingOnly: boolean; signedOffAt: string | null; partyType?: string }[]

  phaseSpine?: { startsAt: string | null; endsAt: string | null; currentSession: number; sessions: { n: number; state: string; date: string | null; /** The day it opens, for a session not yet done. */ opensOn?: string | null; /** The engine's own sentence for this session, e.g. "Session 5 opens on 12 October." */ says?: string }[] }
  /**
   * The ground's pre-agreed intent, set at creation. Null when none was set.
   *
   * REQUEST 123: on the onboarding board (`family === 'ONBOARDING'`) this is an object instead of
   * a sentence - "What was agreed at the start", grouped by when it falls due (Day 1, by day 30,
   * 60, 90, or after). Every other board still gets the plain sentence, or null, unchanged.
   */
  startingState?: string | StartingStateAtTheStart | null
  /** REQUEST 123: "Change since last check-in", on the onboarding board only. */
  changeSinceLast?: ChangeSinceLast
  /** REQUEST 123: "The 90 days, in three steps", on the onboarding board only. */
  ninetyDays?: NinetyDays
  quickRead?: { label: string; value: string; sub: string; tone: string }[]
  objectives?: {
    /** What the target assumes, the lead's lines (U.7). */
    assumes?: string[]
    /**
     * REQUEST 115 (c): where nothing is written down, said plainly rather than left empty - to the
     * lead, an invitation to write it; to anybody else who may read the target, a plain sentence
     * that nobody has yet. Present only when `assumes` is empty.
     */
    assumesSays?: string | null
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
    /**
     * REQUEST 108 (b): a word for where this target stands ("Met", "On time", "Close", "Behind",
     * "Within", "Over limit", "Not settled"), with `says` for why, or null where none can be said
     * yet (fewer than two sessions counted, no planned last session, or no direction set). Null
     * for any target with somebody's name on it - see board/the-headline-and-where-each-target-stands.ts.
     */
    stands?: { word: string; says: string } | null
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
    /** Decision 141 (2): counted by code from the record, never by the model. Travels with the judgement. */
    theCountsBehindThis?: { says: string[] } | null
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
  whoOwnsWhat?: { participantId: string; name: string | null; role: string | null; items: {
    id: string; type: string; text: string; sessionNumber: number | null
    /** Request 117 (8): `text` already says what kind of item this is in its own words (e.g. "You
        have reported progress."), so the record-type sentence below it (`whatThisItemIs` in
        BoardPage.tsx) would repeat it - "You have reported progress. This is progress you
        reported." Draw that sentence only when this is not set. */
    itsKindIsSaid?: boolean
  }[] }[]
  dependencies?: {
    id: string; from: string | null; fromParticipantId?: string | null; what: string; on: string | null; onParticipantId?: string | null; status: 'BLOCKING' | 'WAITING' | 'CLEARED'; then: string | null
    /** REQUEST 107 (c), part 2: how often this blocker was raised, in check-ins, never a single session counted twice. */
    raised?: { times: number; firstRaisedAt: string; lastRaisedAt: string; says: string }
  }[]
  checkInGrid?: { sessions: number[]; rows: {
    participantId: string; name: string | null; role: string | null; managingOnly: boolean; cells: Record<string, string>
    /** Decision 77: not sent on this row today - the ground's own `participants` (`GET
        /grounds/:id`) carry it instead. Kept here, optional, so a future board payload that does
        send it on the row itself needs no further change. */
    notLetInYet?: boolean
  }[] }

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
  stillUnanswered?: { who: string; what: string; says?: string; sinceRound: number; certain: boolean }[]

  eachPerson?: {
    participantId: string
    who: string
    /** True where `who` is their role standing in for a name nobody has given. */
    nameIsTheirRole: boolean
    target: number | null
    count: number
    reason: 'has not answered' | 'something in the way two weeks' | 'behind the pace' | 'nothing checkable' | 'waiting on someone' | 'nothing to do' | 'not let in'
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
    /**
     * Whether `reason` is itself the sentence about how checkable this person's answers are
     * ("Nothing X has said so far is checkable, because nobody else can check it yet..."), set by
     * the server (api/src/modules/board/a-rating-goes-only-to-the-person.ts). CLAUDE.md: "Leads
     * never see how a person's answers were rated" - `reason` is withheld on screen when this is
     * true (board review, third pass, item 1).
     */
    nothingCheckable?: boolean
    /** Engine merge, 2 October (`each-repeated-sentence-said-once.ts`): true once this row's
        `note` was the same as another row's and has been nulled out here, its words moved once
        into `contributionSaysOnce`, above every card. */
    saidOnceAbove?: boolean
  }[]
  /** Request 117 (8): a sentence repeated across several `contribution` rows, said once here
      instead of under each row - see `contribution[].saidOnceAbove`. */
  contributionSaysOnce?: string | null
  coverage?: {
    scope: string
    reads: {
      /** Request 111 (a): a score of where a person's work lands stays removed - the engine does
          not always send this any more, so the bar variant only draws when it is a real number. */
      participantId: string; name: string | null; scope: string; pct?: number
      /** Decision 141 (3): the lead only. The share of the work in this person's role that other people
          described doing as theirs, 0 to 100. Drawn beside the name; people are never sorted by it. */
      landingPercent?: number
      kind: 'LEAKING' | 'ABSORBING' | 'STABLE'; trend: string; what: string | null
      reason: string; reasonText: string | null; ownVoice: string | null
      coupledToBlocker: boolean; remitDefined: boolean
      confidence?: number; evidenceCount?: number; shown?: boolean; basis?: string
      /** Engine merge, 2 October: true once `what` and/or `reasonText` were the same as another
          row's and have been nulled out here, their words moved once into `coverage.saysOnce`. */
      saidOnceAbove?: boolean
    }[]
    /** Request 117 (8): one entry per sentence repeated across several `reads` rows, said once
        above them instead of under each - see `reads[].saidOnceAbove`. */
    saysOnce?: string[]
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
  /** `action` is sent to the lead alone - see `AnAction`. */
  decisions?: { question: string; why: string; owner: string; source: 'blocker' | 'divergence'; action?: AnAction }[]
  poll?: { id: string; question: string; options: { id: string; label: string; who: (string | null)[]; whoIds: string[]; count: number }[] } | null

  /**
   * THE KIND OF WORK THIS CHECK-IN IS ABOUT (request 76). One of the eleven names in
   * `KIND_OF_WORK_OPTIONS` below, exactly as the server writes it, or `null` when nobody has said.
   * Read from the lead's own words at setup; the lead, or an admin of the organisation, can change
   * it with `groundsApi.setKindOfWork`. A later read never overwrites the lead's own choice.
   */
  kindOfWork?: KindOfWork | null
  /**
   * THE KINDS A NEW CHECK-IN MAY BE GIVEN (request for the screens workspace, 4 October 2026). The
   * release offers only some of the eleven kinds; this is that list, exactly as the server writes
   * it. The kind-of-work dialog (`WorkRecords.tsx`) lists only these, plus `kindOfWork` itself so a
   * check-in that already holds another kind can still be saved. Absent on an older server - keep
   * today's full list then.
   */
  kindsOffered?: KindOfWork[]
  /**
   * ANCHOR PIECE 24/25: whether a new anchor check-in can be started (`release.anchorScenario`).
   * Off at release, so nothing drawn from it shows. Serves no other change to this board's own
   * sections - only "Groundwork recommends" (BoardPage.tsx) reads it, and only for the lead.
   */
  anchorScenarioOn?: boolean
  /**
   * ANCHOR PIECE 30/31, THE "ACTIVE" LINE (section 26; docs/answers-from-engine.md, "Request 149
   * (4 of 6)", `TheActiveLine`). Groundwork manages engagement itself, and the lead sees a status
   * line of its own words, for example "18/20 active · Groundwork has nudged the remaining 2."
   * Served only to whoever runs the check-in, for an anchor Ground - absent otherwise, and the line
   * below draws nothing then. `line` is Hafsah's own wording and is drawn exactly as sent, never
   * rebuilt from `active`/`total`/`nudged` on this side.
   */
  activeLine?: TheActiveLine
  /**
   * ANCHOR PIECES 12/13/20, THE MONTH BOARD, "Are we moving together?" (section 24;
   * docs/answers-from-engine.md, "Request 149 (5 of 6)", `TheMonthBoard`). Lead only: this is the
   * lead's own board, served only to whoever runs this check-in, only while `anchorScenarioOn` is
   * served true (see BoardPage.tsx, `theMonthBoardForTheLead`) - absent otherwise, and the section
   * draws nothing then.
   */
  theMonthBoard?: TheMonthBoard
  /**
   * ANCHOR PIECE 22, A PERSON'S OWN RECOGNITION SENTENCE, "Helping the team move"
   * (docs/anchor-scenario.md section 19; docs/answers-from-engine.md, "Anchor piece 22, hidden
   * contributors, is served"). Hafsah's decision: a person reads the same sentence the lead reads
   * about them on `theMonthBoard.peopleHelpingThingsMove`, said as "you" - "You committed to send
   * your manager the deck, and you say it is done." Served only for a check-in started from the
   * anchor link, only while the anchor switch is on, and only to that person - never to anybody
   * else, and the server sends nothing for anybody else's. `null` when they have closed nothing
   * this month; absent on any other check-in or with the switch off, and the screen draws nothing
   * then either way.
   */
  yourPartInMovingThings?: string | null
  /**
   * ANCHOR PIECE 30, THE NUDGE (section 26; docs/anchor-scenario.md;
   * docs/answers-from-engine.md, "Anchor piece 30, the nudge, is built"). Served to a person in an
   * anchor check-in who has not yet checked in for the open round - built from their own last open
   * promise, said back to them: "You mentioned you would send your manager the deck. I'd love to
   * hear how it went." With no open promise: "It's been a few days since we spoke. What's changed
   * since then?" `null` once they have checked in. Never served to anybody else - not the lead, not
   * an admin with access, and not an admin who only reads - and absent on any other check-in or
   * with the switch off; the screen draws nothing then either way.
   */
  aNudgeForYou?: string | null
  /**
   * ANCHOR PIECE 32/33, THE END-OF-MONTH READ (sections 28 and 29; docs/answers-from-engine.md,
   * "Request 149 (6 of 6)", `TheEndOfMonthRead`). Built once from the record; opening the page
   * never rebuilds it. Lead only, drawn on EndingPage.tsx; absent until the month has run.
   */
  theEndOfMonthRead?: TheEndOfMonthRead
  /**
   * PIECE 19/20, "IDEAS FROM YOUR TEAM" (section 18; plan section 5 row 7; decision 96, item 10;
   * docs/answers-from-engine.md, "Request 149, missing (1)"). Shape only - not served yet, so this
   * is absent on every board today, and the section draws nothing until the engine sends it. To
   * everyone in that check-in (never lead-only): an idea is captured only after the person's own
   * yes, and from then on everyone in the check-in reads it, "Raised by <name>".
   */
  ideasFromYourTeam?: TheIdeasFromYourTeam
  /**
   * THE RECORDS THE KIND OF WORK KEEPS: deals and their stages, releases, tickets, a matter's
   * deadlines and parties, and so on - one section per name in the switchboard (`section`, e.g.
   * "Deal grid"). Each section says what it holds, in plain words, and whether it is filled, has
   * none yet, or is not something Groundwork keeps for this kind ("not-known", with `why`). Only
   * the lead can add, change or remove a row, with `boardApi.addWorkItem` / `updateWorkItem` /
   * `deleteWorkItem`. Who sees which rows is already decided by the server.
   */
  workRecords?: AServedWorkSection[]

  /**
   * THE SWITCHBOARD'S OWN SECTIONS (request 70): the 22 purple sections with no served field
   * before 1 October. Each is a new top-level field, present only when it has something in it
   * (absent, never an empty list), built from rows the record already holds - no model, nothing
   * written, so opening the board changes none of them. Who reads what is already decided
   * server-side; the client only draws what it is given, gated further by the switchboard's own
   * per-situation table (`what-the-switchboard-allows.ts`) so a section never appears for a
   * situation G2 marks off on purpose.
   */
  /** What could go wrong, each with the facts it rests on. At most 10. */
  risks?: { id: string; says: string; because: string }[]
  /** Who is doing what, and by when - every commitment this reader may read, open first. */
  workPlan?: { id: string; participantId: string | null; who: string | null; says: string; when: string | null; state: 'open' | 'done' | 'not done' | 'dropped'; statedInSession: number | null }[]
  /** What happened, in order. `on` is the day for ordering; `says` starts with the day in words. Newest 40. */
  timeline?: { on: string; says: string }[]
  /** One person's record over time: their own tally, the lead's for everyone who has answered. */
  personHistory?: { participantId: string; who: string; says: string; sessions: { n: number; on: string | null; says: string }[] }[]
  /** For each open wait: whether it names a person, whether what was tried was said, whether a time was given. */
  blockerCheck?: { id: string; who: string; says: string; namesWhoHoldsIt: boolean; saidWhatWasTried: boolean; timeGiven: boolean; checks: string[] }[]
  /** Every line on the board a document proves or a colleague confirmed, word for word. */
  evidenceIndex?: { id: string; participantId: string | null; who: string | null; said: string; backedBy: string; sessionNumber: number | null }[]
  /** Counts from the record, for whoever runs the check-in only, never a label. */
  busyOrMoving?: { eachPerson: { participantId: string; who: string; says: string }[]; cannotTellYou: string }
  /**
   * COACHING (modules.md: "One thing to do better, for each person"). `yours` is this reader's own
   * private note, the same shape `WhatToWorkOnNext` already draws on the report page - sent to
   * every reader who has one, lead and participant alike. `eachPerson` is the lead's own read on
   * everybody else, the same shape `WhatToProbeThemOn` already draws - the server sends it only to
   * whoever runs the check-in, and null for anybody else, so there is nothing here to gate further.
   */
  coaching?: {
    yours: import('@/components/gw/WhatToWorkOnNext').CoachingNote | null
    eachPerson: import('@/components/gw/WhatToProbeThemOn').ProbeRead[] | null
  }
  /** What the person who runs the check-in needs to do. At most 10, for that reader only. */
  /** `action` is sent to the lead alone - see `AnAction`. */
  leadActions?: { id: string; says: string; because: string | null; action?: AnAction }[]
  /** MISSED CHECK-INS (decision 136), to the lead of this check-in alone: the whole line, already worded, with the reason the person gave and the next step suggested inside it. */
  missedCheckIns?: { participantId: string; name: string; text: string; reason: string | null; suggestion: string | null }[]
  /** What each side promised, and what somebody here still waits on that side for. One per person, then each outside party named. */
  obligations?: { participantId: string | null; who: string; promised: string[]; othersWaitFor: string[] }[]
  /** Where a team's number would land by the last session at its current pace, against the aim or the limit. Never about one person. */
  forecast?: { objectiveId: string; about: string; says: string; restsOn: string; cannotTellYou: string }[]
  /** Every wait in the record, open or cleared, with the day it started and the day it cleared. Oldest first. */
  whoWaitedOnWhom?: { id: string; says: string; startedAt: string | null; clearedAt: string | null; days: number | null }[]
  /** Where one person's own record says two different things about one commitment. */
  contradictions?: { id: string; commitmentId: string; participantId: string | null; who: string; says: string }[]
  /** Questions only whoever runs the check-in can answer. At most 10, for that reader only. */
  questionsForTheLead?: { id: string; question: string; because: string }[]

  /**
   * REQUEST 105, PART 1 (a), AND REQUEST 132: A GOVERNMENT PROGRAMME'S OWN THREE SECTIONS
   * (gov.txt: "What each level understood", "What the visit log shows", "The counties"). Built
   * only from the record this reader is already served - nothing made up - and sent only to
   * whoever runs the check-in, the admin who set it up, or an admin of the organisation (the same
   * readers as every other kind-of-work section in this file). See docs/answers-from-engine.md,
   * "Request 105, part 1: five kinds of work get their own board shape".
   */
  /**
   * The aim that was set, then each person's own words for what it means, in the order they
   * joined. `who` is "You" for the reader themselves. `note` is always sent and explains why the
   * order is by join date and not by level - Groundwork does not keep which level each person
   * works at (api/src/modules/board/each-kind-gets-its-own-board.ts, `NO_LEVEL_ON_RECORD`).
   */
  whatEachLevelUnderstood?: {
    heading: string
    state: 'filled' | 'none-yet'
    levels?: { participantId: string | null; who: string; said: string[] }[]
    note: string
    /** Only on `'none-yet'`: "Nobody has said yet what the aim means to them." */
    says?: string
  }
  /**
   * The numbers brought in from another system for what this check-in is about (`ProductMetric`
   * rows). `numbers[].says` is the sentence for one number; `whatANumberIsNot` is the three
   * standing sentences that come with them, as on the report - drawn exactly as sent, in order.
   */
  whatTheVisitLogShows?: {
    heading: string
    state: 'filled' | 'not-known'
    numbers?: { key: string; source: string; value: number; unit: string | null; measuredAt: string; says: string }[]
    whatANumberIsNot?: string[]
    /** Only on `'not-known'`: why nothing can be said yet. */
    why?: string
  }
  /** Each county on record, with the project names that name it, or why there is nothing yet. */
  theCounties?: {
    heading: string
    state: 'filled' | 'none-yet'
    counties?: { id: string; name: string; said: string | null; saidBy: string | null; projects: string[]; says: string }[]
    /** Only on `'none-yet'`: "No county is on record yet." */
    says?: string
  }

  /**
   * REQUEST 133: AN ASSET LOANS COHORT'S OWN "WHERE THE COHORT STANDS" (loans.txt). One group per
   * row the engine counts the cohort into (repaying, behind, blocked, not heard from), each with
   * its own sentence and, for whoever runs the check-in, the names in it. A colleague or read-only
   * admin gets `count` and `says` with no `who` at all (`whyNoNames` explains it once, for the
   * whole section) - never names narrowed down after the fact on this side.
   */
  whereTheCohortStands?: {
    heading: string
    says: string
    groups: ({
      group: string
      count: number
      says: string
      who: string[] | null
    } | {
      group: string
      state: 'not-known'
      why: string
    })[]
    /** Only when `who` is withheld from every group: who may read it instead. */
    whyNoNames?: string
  }

  /**
   * REQUEST 133: "SUPPORT GIVEN, AND WHETHER IT HELPED" (loans.txt). Today the record never says
   * what support was given or whether it helped, so this is always `'not-known'`, with `why`; a
   * later engine that does keep that record can send `'filled'`, with `says` and/or `rows` of its
   * own sentences, drawn exactly as sent.
   */
  supportGiven?: {
    heading: string
    state: 'filled' | 'not-known'
    says?: string
    rows?: { id: string; says: string }[]
    /** Only on `'not-known'`: why nothing can be said yet. */
    why?: string
  }

  /**
   * THE LAW FIRM MATTER BOARD'S OWN "WHERE THE MATTER STANDS" (matter.txt). Drawn straight after
   * the glance, only for this kind, only when the engine sends it. `says` is one plain sentence
   * per line, drawn exactly as sent - never built up here from other fields.
   */
  whereTheMatterStands?: {
    heading: string
    says: string[]
  }

  /**
   * THE LAW FIRM MATTER BOARD'S OWN "WHAT YOU NEED TO DECIDE" (matter.txt). Each item is a question
   * still open, why it matters, and who owns settling it - the same shape as a `decisions` row, but
   * kept as its own section, in matter.txt's own place, rather than folded into "What needs you in
   * this check-in" (see `decisionDuplicatesALeadAction`-style de-duplication in BoardPage.tsx, which
   * keeps this kind's own "What needs you" from repeating a question already read here).
   */
  whatYouNeedToDecide?: {
    heading: string
    state: 'filled' | 'none-yet'
    items?: { question: string; why: string; owner: string }[]
    /** Only on `'none-yet'`: "Nothing is waiting on a decision right now." */
    says?: string
  }

  /**
   * THE LAW FIRM MATTER BOARD'S OWN "WHAT CHANGED THIS WEEK, AND WHAT IT CHANGED" (matter.txt).
   * Each line is one thing said in the newest session, with `markSays` saying how it is known
   * ("Only someone's word", "From memory only", ...) - the same marks `whoOwnsWhat` already carries
   * for this kind - then `cannotTell` says plainly that nothing here links a change to what it
   * changed.
   */
  whatChangedThisWeek?: {
    heading: string
    state: 'filled' | 'none-yet'
    sessionNumber?: number
    says?: string
    lines?: { id: string; participantId: string | null; text: string; mark: string; markSays: string }[]
    cannotTell?: string
  }

  /**
   * REQUEST 108 (a): THE HEADLINE QUESTION, WITH ITS ANSWER AND ITS BAR (board-as-lead.txt: "Will
   * we reach 25 sales by 30 September?"). Built only from the check-in's own team aims. Absent
   * where nothing qualifies - nothing is made up. Draw `question` above everything else, `answer`
   * under it, then one bar per entry in `bars`, then `howItIsGoing.latestSummary` as before.
   */
  headline?: {
    question: string
    answer: string | null
    bars: { objectiveId: string; kind: 'aim' | 'limit'; now: number; target: number; filled: number; word: string | null }[]
  } | null

  /**
   * REQUEST 115 (c): "TO CLOSE THE GAP, TWO OF THESE THREE" (board-as-lead.txt), beside the
   * headline. Sent only to whoever is served the headline (the lead, the admin who set it up) -
   * never a participant, never on a performance plan. Built only from the open deals this reader
   * is already served and the team's own aim.
   */
  toCloseTheGap?: {
    gap: number
    aim: string
    says: string
    deals: { id: string; name: string; owner: string | null; says: string }[]
  } | null

  /**
   * REQUEST 115 (c): "HELP NOBODY MENTIONED" (board-as-lead.txt: "You see the help, not who said
   * it."). Sent only to whoever runs the check-in - never who said it, and never what they said.
   */
  helpNobodyMentioned?: { lines: string[]; why: string } | null

  /**
   * REQUEST 115 (c): "OPEN ISSUES" (board-as-lead.txt). Nothing on record follows an issue through
   * its stages, so this is always the one "not-known" sentence, to whoever runs the check-in, not
   * on a performance plan.
   */
  openIssues?: { state: 'not-known'; why: string } | null

  /**
   * REQUEST 108 (d): "WHERE THIS IS HEADING" AND "RECORD THE DECISION" (board-as-lead.txt). Built
   * only from what the product already records: the situation's own possible endings, signals
   * already served elsewhere on this board, and what the lead wrote down as still to decide.
   * Sent only to whoever runs the check-in; null for everybody else, including on an evaluation
   * check-in. See board/where-this-is-heading.ts.
   */
  whereThisIsHeading?: {
    heading: string
    about: string
    outcomes: { value: string; says: string; more: string | null }[]
    outcomesSays: string | null
    signals: { says: string; from: string }[]
    signalsSays: string | null
    whatWouldSettleIt: string[]
    whatWouldSettleItSays: string | null
    whoDecides: string
    groundworkDoesNotChoose: string
    recordTheDecision: string | null
    decided: string | null
  } | null

  /**
   * THE MARKETVIEW Q4 BOARD'S OWN "WHAT THE SYSTEMS SHOW" (mvq4.txt). Numbers brought in from
   * another system (Paystack, MarketView) for what this check-in is about. `numbers[].says` is
   * the whole sentence for one number, drawn exactly as sent - never read apart for its own
   * target or goal, which the engine does not send as separate fields (see
   * docs/answers-from-engine.md, "A MarketView Q4 test check-in", "Missing, and why"). Sent only
   * to whoever runs the check-in, the admin who set it up, or an admin of the organisation.
   */
  whatTheSystemsShow?: {
    heading: string
    state: 'filled' | 'not-known'
    numbers?: { key: string; source: string; value: number; unit: string | null; measuredAt: string; says: string }[]
    whatANumberIsNot?: string[]
    /** Only on `'not-known'`: why nothing can be said yet. */
    why?: string
  }

  /**
   * THE MARKETVIEW Q4 BOARD'S OWN "WHERE WHAT PEOPLE SAID AND THE SYSTEMS DIFFER" (mvq4.txt).
   * Each row pairs one thing somebody said with a document on this check-in that says it
   * differently - the engine does not yet compare what people said with a number from another
   * system, only with a document (see docs/answers-from-engine.md). `'none-yet'` when nothing on
   * record differs. Sent only to whoever runs the check-in, the admin who set it up, or an admin
   * of the organisation.
   */
  whereWhatWasSaidAndTheSystemsDiffer?: {
    heading: string
    state: 'filled' | 'none-yet'
    rows?: { id: string; participantId: string | null; said: string; documentSays: string }[]
    /** Only on `'filled'`: the three standing sentences that say what a number is not. */
    whatANumberIsNot?: string[]
    /** Only on `'none-yet'`: "Nothing anybody said differs from a document or a number on record yet." */
    says?: string
  }

  /** REQUEST 107 (c), part 3: grouped by site, county, team or queue, where a line names one. */
  byArea?:
    | { state: 'filled'; heading: string; areas: { area: string; records: number; says: string }[] }
    | { state: 'not-known'; why: string }

  /**
   * THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN "BY WHO THEY ARE" (mvnext.txt: "By who they are" /
   * "What each group said it needs"). Lead only. Groundwork does not keep which group a person
   * belongs to - processor, distributor, researcher - so this reads `not-known`, with `why`; `says`
   * carries the plain count of who has answered either way (docs/answers-from-engine.md, "(d)
   * MarketView where next").
   */
  byWhoTheyAre?: {
    heading: string
    state: 'filled' | 'not-known'
    says?: string
    why?: string
    /** Who each person is in the lead's own words, served to the lead alone. */
    note?: string
    groups?: { group: string; count: number; answered: number; says: string }[]
  }

  /**
   * THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN "WHERE THEY DISAGREE" (mvnext.txt). Lead only, and the
   * engine's own `divergence.items`, under this heading - the two are never both drawn on this
   * board (see BoardPage.tsx, where the general `divergence` block is left out for this kind).
   * `none-yet`, with `says`, where nobody has said anything that differs yet.
   */
  whereTheyDisagree?: {
    heading: string
    state: 'filled' | 'none-yet'
    says?: string
    items?: any[]
  }

  /** REQUEST 107 (c), part 4: a sales board only - what was reported at each stage, never "criteria met". */
  reportedAgainstCriteria?: {
    state: 'not-known'
    why: string
    stages: { stage: string; reported: number; withProof: number; says: string }[]
  }

  /**
   * REQUEST 105, PART 2: BLOCKERS GET ONE SECTION (board-as-lead.txt: "Blockers"). One entry per
   * open blocker, already walled the same as every other wait. A cleared blocker is not in it.
   */
  blockers?: {
    id: string
    who: string
    name: string
    state: 'blocking' | 'waiting'
    says: string
    raised: { times: number; firstRaisedAt: string; lastRaisedAt: string; says: string; sessions: number[]; inSessions: string }
    proof: { state: string; says: string }
    timeGiven: string
    wouldClearIt: string | null
    wouldClearItSays: string
    holdingUp: string | null
  }[]
} & TheAnchorBoardSections

export type BoardResponse = BoardAbsent | BoardWithheld | BoardPresent

/** The twelve kinds of work Groundwork's board can draw records for, exactly as the server writes them. */
export const KIND_OF_WORK_OPTIONS = [
  'sales team',
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

/* Whether a kind is one of the two sales kinds: isASalesKind in lib/a-sales-kind.ts, kept apart so a spec's mock of this file never hides it. */

/** One row of a kind of work's record: a deal, a release, a ticket, a deadline, a party, and so on. */
export interface AServedWorkRow {
  id: string
  kind: string
  name: string
  stage: string | null
  /** The stage as the record holds it, when that differs from the stage said: "Said to be won, not shown yet". Shown in place of the stage. */
  stageSays?: string | null
  owner: string | null
  ownerParticipantId: string | null
  due: string | null
  /** The day somebody last spoke about it in a check-in, "2026-09-30" - the day of the line it came from. Null for a row added on the board. */
  lastSaidOn?: string | null
  /**
   * REQUEST 112 (a): ITS GROUP ON A SALES DEAL GRID ("likely", "possible", "next-quarter",
   * "cooling", "cold", "won"), and why it is there, in full sentences from its own record. Sales
   * deal rows only; absent on every other kind of work.
   */
  group?: 'likely' | 'possible' | 'next-quarter' | 'cooling' | 'cold' | 'said-won' | 'won'
  groupSays?: string
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
  /** The whole line the engine says for this reader: "In your words," on their own line, else "In Baraka's words,". Print it as sent. */
  saidByLine?: string | null
  /** The id behind `saidBy`, or null for "a colleague" and for a record the lead added. */
  saidByParticipantId?: string | null
  /**
   * REQUEST 108 (c): the mark of the line this row came from - `proven`, `confirmed`, `memory`,
   * `said` or `none` (a record added on the board, nothing behind it). Draw with the shared
   * `ProofMark`: filled for `proven`, ringed for the rest, nothing for `none`.
   */
  mark?: 'proven' | 'confirmed' | 'memory' | 'said' | 'none'
  /** How `from`/`said` is known: "proof" (a document is behind it), "said" or "lead" (added on the board). */
  known?: 'proof' | 'said' | 'lead'
  knownSays?: string
  /** REQUEST 107 (c), part 1: the open commitment about this exact record, in the words of whoever made it, or null. */
  next?: string | null
  nextKnown?: 'proof' | 'said' | 'lead' | null
  nextSays?: string
  /**
   * DECISION 76, ITEM 3: a record with nobody's name on it that somebody says is theirs. Sent to
   * the lead alone, with the claim already said as a full sentence; her yes or no goes to
   * `POST .../work-items/:itemId/claim` with `{ yes }` (`boardApi.claimWorkItem`, below). Nobody
   * else is ever sent a claim. Drawn on the deal grid row, beside "Nobody is named for it yet." -
   * see `SalesDealGridRow` in WorkRecords.tsx.
   */
  ownerClaim?: { participantId: string; who: string; says: string } | null
  /** REQUEST 115 (b): what somebody said it is worth, where they said - and the sentence where nobody has. */
  value?: string | null
  valueSays?: string | null
  /** Each day somebody spoke about it in a check-in, newest first - only lines this reader may read. */
  contactHistory?: { on: string; how: 'with proof' | 'in their words'; says: string }[]
  contactHistorySays?: string
  /** The owner's own latest sentence that names it, word for word - null where they never named it, or this reader may not read their words. */
  theirRead?: { who: string; words: string; says: string } | null
}

export type AServedWorkSection =
  | { section: string; holds: string; state: 'not-known'; why: string }
  | {
      section: string; holds: string; state: 'none-yet' | 'filled'; stages?: string[]; rows: AServedWorkRow[]
      /**
       * REQUEST 112 (a): EACH GROUP ON A SALES DEAL GRID, in the prototype's own order, only the
       * groups that have a deal in them. `rowIds` are `AServedWorkRow.id`s in this section's own
       * `rows`. Present only on the sales org's "Deal grid" section.
       */
      groups?: { group: 'likely' | 'possible' | 'next-quarter' | 'cooling' | 'cold' | 'said-won' | 'won'; heading: string; reason: string; rowIds: string[] }[]
      /** What the record cannot support, said plainly once under the grid - never claimed by a group. */
      groupsNote?: string[]
      /** Present only on a participant's own board, where this section already holds only their own rows ("Only yours."). */
      onlyYours?: string | null
    }

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
        /* B-110 (GW-PRI-04): the page already says GroundGone's one sentence for both a 404 and a
           403 (see BoardPage.tsx). Without skipForbiddenToast, the client's own axios layer raised
           a second, DIFFERENT message on top of it for a 403 only - "That one is not yours to
           open... whoever runs this check-in can let you in" - which tells a stranger holding a
           stale link exactly what GroundGone is written not to: that something real sits behind
           it. skipNotFoundToast already did the equivalent for 404; this closes the same door for
           403. */
        skipNotFoundToast: true,
        skipForbiddenToast: true,
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

  /**
   * DECISION 76, ITEM 3: THE LEAD'S YES OR NO TO A RECORD'S `ownerClaim`. The path is built only
   * from this call's own `groundId` and `itemId` (never a route string read off the server), the
   * same way `addWorkItem`/`updateWorkItem`/`deleteWorkItem` above already call this check-in's
   * own path - so there is nothing here for a served value to redirect. A yes answers with
   * `{ record: { id, ownerParticipantId }, saidBack: "The Westgate Deli deal is now Amani Wekesa's." }`;
   * a no with `{ record: { id, ownerParticipantId: null }, saidBack: "The Westgate Deli deal still
   * has nobody's name on it." }`. Lead only; refused otherwise.
   */
  claimWorkItem: (groundId: string, itemId: string, yes: boolean) =>
    apiClient
      .post<{ record: { id: string; ownerParticipantId: string | null }; saidBack: string }>(
        `/grounds/${groundId}/board/work-items/${itemId}/claim`,
        { yes },
      )
      .then((r) => r.data),

  /** Initiator only: set the availability question and the times. */
  upsertPoll: (groundId: string, dto: { question: string; options: string[] }) =>
    apiClient.post(`/grounds/${groundId}/board/poll`, dto).then((r) => r.data),

  /** Availability is logistics, so every party can set their own. */
  togglePoll: (groundId: string, optionId: string) =>
    apiClient
      .post<{ optionId: string; available: boolean; count: number }>(`/grounds/${groundId}/board/poll/${optionId}/toggle`)
      .then((r) => r.data),
}
