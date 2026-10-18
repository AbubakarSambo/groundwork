import { apiClient } from './client'
import type { Report } from '@/types'

export const reportsApi = {
  get: (groundId: string) =>
    /* The 404 now carries the reason there is no report yet, and the page renders it. A toast
       saying "Not found" over the top of that sentence contradicts it. */
    apiClient.get<Report & { activated?: boolean }>(`/grounds/${groundId}/report`, { skipNotFoundToast: true, skipForbiddenToast: true } as any).then(r => r.data),

  /**
   * WHAT THIS REPORT SAID AT THE END OF EACH ROUND, and the same rounds read as a sequence.
   *
   * The report at the top of the tab is always the current one. This is what it said when each
   * round closed - kept so a picture somebody read at day 14 is still there at day 90, and so a
   * ninety-day account is read back from the record rather than re-derived from transcripts.
   */
  /**
   * ONE SESSION'S REPORT, in the shape promised per check-in. Not the same call as `get`, which
   * returns the check-in's live working copy - this is one session, and once its round has closed
   * it never changes again.
   */
  /**
   * TYPED AS THE FULL SHAPE, THOUGH THE SERVER MAY SEND `WithheldSessionReport` INSTEAD (answers
   * from the engine, 51) - every existing caller already reads dozens of fields off this
   * unconditionally (SessionReportPage.tsx, EveryReportSideBySide.tsx), so widening the return type
   * here would make all of them fail to type-check for a case none of them handle yet. The one
   * caller that does handle it (`TheSessionsReport.tsx`) checks `(data as any).withheldUntilYouAnswer`
   * before reading anything else, the same way it already treats this response as loosely typed.
   */
  sessionReport: (groundId: string, sessionNumber: number) =>
    apiClient.get(`/grounds/${groundId}/report/session/${sessionNumber}`, { skipNotFoundToast: true } as any)
      .then(r => r.data as SessionShapedReport),

  /** What success was said to be, and where the accounts put each condition under it. */
  againstSuccess: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/report/against-success`, { skipNotFoundToast: true } as any)
      .then(r => r.data),

  /*
   * U.9 RE-REVIEW: THE FIELD IS `sessionNumber`, NOT `round`. Walked live against the real
   * response - `GET /grounds/:id/report/rounds` sends `"sessionNumber": 1` on every row of
   * `moved[]`, never `round` (`RoundsService.rounds()`, `reports.service.ts`, selects
   * `sessionNumber` off `ReportRound` and passes it straight through `howThisHasMoved`, which
   * itself outputs a field named `round` - so the wire shape and the function's own return type
   * disagree, and the wire shape is what a real request sends). This type now matches the wire.
   */
  rounds: (groundId: string) =>
    apiClient
      .get<{ rounds: any[]; moved: { sessionNumber: number; takenAt: string; says: string; differences: number; amended: string | null }[] }>(
        `/grounds/${groundId}/report/rounds`,
        { skipNotFoundToast: true },
      )
      .then(r => r.data),

  /* The route replies with when it happened, not the whole report (engine answer 43a) - the
     report itself is refetched separately once the release invalidates its query. */
  /** "Hold it": today's team report waits until the lead shares it herself (Hafsah's answer 5, 16 October 2026). */
  hold: (groundId: string) =>
    apiClient.post<{ sessionNumber: number; held: boolean; says: string }>(`/grounds/${groundId}/report/hold`).then(r => r.data),

  /** When today's team report is shared, as this reader is told it: the lead's words, or a team member's. */
  sharing: (groundId: string) =>
    apiClient.get<{ sessionNumber: number; shared: boolean; held: boolean; at: string | null; says: string }>(`/grounds/${groundId}/report/sharing`, { skipNotFoundToast: true } as any).then(r => r.data),

  release: (groundId: string) =>
    apiClient.post<{ groundId: string; releasedAt: string }>(`/grounds/${groundId}/report/release`).then(r => r.data),

  /** The lead's button: this round's report to everyone who answered and asked for it, once each. */
  /* `as` is the organiser's choice of what the respondents receive, made at the moment of sending.
     See what-the-respondents-get.ts on the API for what anonymised does and does not remove. */
  sendToEveryone: (groundId: string, as: 'NAMED' | 'ANONYMOUS' = 'NAMED') =>
    apiClient.post<{ sessionNumber: number; sent: number; failed: number; alreadyTold: number; notAsked: number; sharedAs: 'NAMED' | 'ANONYMOUS' }>(`/grounds/${groundId}/report/send-to-everyone`, { as }).then(r => r.data),

  /* `activate` is gone with the reveal it belonged to. Nothing withholds a released report from
     the person it is for any more, so there is nothing to activate - see there-is-no-reveal.spec.
     The route still exists server-side; a client method nothing calls is how a deleted feature
     gets wired back up by accident. */

  /* `activationStatus` HAD NO CALLER LEFT, and its answer now travels with the report.
     It told a page which parties had shown theirs, and the page joined that against the roster to
     name them - badly, as "Party 2". `GET /report/session/:n` returns `counting`, which carries
     the report's own labels, so the join and the second request are both gone. The endpoint
     itself stays: it is the same data and something may want it on its own. */

  startClarification: (groundId: string, inferenceId: string) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/clarify`, { inferenceId }).then(r => r.data),

  startSelfCorrection: (groundId: string, sessionNumber: number) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/correct-session`, { sessionNumber }).then(r => r.data),

  /**
   * THE WEEKLY REPORT (B4, "This week"; docs/answers-from-engine.md, request 9 part (d), and
   * decision 73). `week` reads an earlier week by the date of its Monday ("2026-09-21"); without
   * it, the latest week. A week with no report comes back as `saying` alone. Drawn for whoever
   * runs the check-in (and an org admin, on an ordinary check-in) with every field below; a
   * participant reads only their own sentence in `eachPerson` and never `forNextWeek` (the
   * server decides this - the screen draws only what it is sent).
   */
  week: (groundId: string, week?: string) =>
    apiClient
      .get<WeeklyReport>(`/grounds/${groundId}/report/week`, { params: week ? { week } : undefined, skipNotFoundToast: true, skipForbiddenToast: true } as any)
      .then(r => r.data),
}

/** `GET /grounds/:groundId/report/week`. See reportsApi.week above for how it is drawn. */
export interface WeeklyReport {
  /** The light report's one fact for each folded part, from the week as this reader is served it (api/src/modules/reports/a-report-at-a-glance.ts). */
  inThisReport?: { threeInARow?: string; saidAndProof?: string; whatChanged?: string }
  weekStart: string | null
  builtAt: string | null
  saying?: string
  heading?: string
  whatThisIs?: string
  inNumbers?: { figure: string; of: string; says: string }[]
  eachPerson: { who: string; isYou: boolean; says: string }[]
  acrossTheTeam?: string[]
  threeInARow?: { who: string; isYou: boolean; says: string }[]
  saidAndProof?: string | null
  whatChanged?: { moved: string[]; dropped: string[]; result: string[] }
  forNextWeek?: { do: string; why: string; comesFrom: string }[]
}

/**
 * ANSWERS FROM THE ENGINE, 51: THE SESSION REPORT BEFORE SOMEONE HAS ANSWERED.
 *
 * Before the report is released, a participant who has not answered THAT session gets only this -
 * not the full `SessionShapedReport` - so reading somebody else's account first cannot happen
 * before writing your own. `saying` is the same sentence the main (round) report gives; shown the
 * same way SharedReportForAParty.tsx already shows it there.
 */
export interface WithheldSessionReport {
  sessionNumber: number
  withheldUntilYouAnswer: true
  saying: string
}

/** The promised per-session shape. See api/src/modules/reports/the-session-report.ts. */
export interface SessionShapedReport {
  /** The light report's one fact for each folded part, from the report as this reader is served it (api/src/modules/reports/a-report-at-a-glance.ts). */
  inThisReport?: { reliesOn?: string; eachPersonDid?: string; picture?: string; notRaisedAgain?: string; goodLooksLike?: string; sitsUnder?: string }
  sessionNumber: number
  state: 'forming' | 'final'
  whereThingsStand: { agreed: number; stillOpen: number; saying: string; settled: string[]; open: string[] }
  sections: {
    title: string
    about: string
    items: { text: string; who: string | null; documented: boolean }[]
    saying?: string
  }[]
  howClearThisWas: { level: string | null; saying: string }
  theConversationWorthHaving: string | null
  /** The four reads the front page shows when it shows a report. Named the same as the board's. */
  atAGlance: { label: string; value: string; sub: string; tone: 'good' | 'warn' | 'bad' | 'flat' }[]
  /**
   * How much basis there is to build a good shared report at all. Not the specificity meter, which
   * is about one person's own input and lives on the private half of the page.
   */
  confidence: { score: number; band: 'thin' | 'partial' | 'solid'; saying: string; reasons: string[] }
  /**
   * What keeps showing up, from the pattern engine. Surfaced only, in the library's own words. A
   * section, not a suggestion to the model - see sessionReport on the server.
   */
  patterns: { who: string; isYou: boolean; signal: string; positive: boolean; periodsObserved: number }[]
  /** Each person's own lines this session, under their own name. */
  whatEachPersonSaid: { who: string; isYou: boolean; lines: string[]; saying?: string }[]
  /** Whether this session's account can still be corrected, and the sentence if it cannot. */
  correctable: boolean
  whyNotCorrectable: string | null
  /** Everybody the report is counting for this session, named, with what each has done. */
  counting: { who: string; isYou: boolean; answered: boolean }[]
  everybodyHasShownTheirs: boolean
  /** Whether the shared report has gone out, and whether this reader has shown their own. */
  released: boolean
  iHaveShownMine: boolean
  /** Drafted from the engines' reads and worded by the model. Null when there is no engine basis. */
  sharedPicture: string | null
  /** The same picture, one claim per line, which is how the page draws it. */
  pictureLines: string[]
  pictureBasis: 'engines' | 'none'
  /** The stored, model-written picture. Kept under its own name; this page does not render it. */
  writtenPicture: string | null
  /** Why there is no conversation question, when there is none. */
  whyNoQuestion: string | null
  takenAt: string | null
  amendedAt: string | null
  amendedNote: string | null
  showsEverybody: boolean
}
