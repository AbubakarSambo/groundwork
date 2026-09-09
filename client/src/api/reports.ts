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
  sessionReport: (groundId: string, sessionNumber: number) =>
    apiClient.get(`/grounds/${groundId}/report/session/${sessionNumber}`, { skipNotFoundToast: true } as any)
      .then(r => r.data as SessionShapedReport),

  /** What success was said to be, and where the accounts put each condition under it. */
  againstSuccess: (groundId: string) =>
    apiClient.get(`/grounds/${groundId}/report/against-success`, { skipNotFoundToast: true } as any)
      .then(r => r.data),

  rounds: (groundId: string) =>
    apiClient
      .get<{ rounds: any[]; moved: { round: number; takenAt: string; says: string; differences: number; amended: string | null }[] }>(
        `/grounds/${groundId}/report/rounds`,
        { skipNotFoundToast: true },
      )
      .then(r => r.data),

  release: (groundId: string) =>
    apiClient.post<Report>(`/grounds/${groundId}/report/release`).then(r => r.data),

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
}

/** The promised per-session shape. See api/src/modules/reports/the-session-report.ts. */
export interface SessionShapedReport {
  sessionNumber: number
  state: 'forming' | 'final'
  whereThingsStand: { agreed: number; stillOpen: number; saying: string; settled: string[]; open: string[] }
  sections: {
    title: string
    about: string
    items: { text: string; who: string | null; documented: boolean }[]
    saying?: string
  }[]
  howClearThisWas: { level: string | null; recall: string | null; saying: string }
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
