import { apiClient } from './client'
import type { Report } from '@/types'

export type ActivationStatus = {
  groundId: string
  parties: { participantId: string; activated: boolean }[]
  allActivated: boolean
}

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

  rounds: (groundId: string) =>
    apiClient
      .get<{ rounds: any[]; moved: { round: number; takenAt: string; says: string; differences: number; amended: string | null }[] }>(
        `/grounds/${groundId}/report/rounds`,
        { skipNotFoundToast: true },
      )
      .then(r => r.data),

  release: (groundId: string) =>
    apiClient.post<Report>(`/grounds/${groundId}/report/release`).then(r => r.data),

  activate: (groundId: string) =>
    apiClient.post<ActivationStatus>(`/grounds/${groundId}/report/activate`).then(r => r.data),

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
  whereThingsStand: { agreed: number; stillOpen: number; saying: string }
  sections: {
    title: string
    about: string
    items: { text: string; who: string | null; documented: boolean }[]
    saying?: string
  }[]
  howClearThisWas: { level: string | null; recall: string | null; saying: string }
  theConversationWorthHaving: string | null
  /** The four reads the front page shows when it shows a report. */
  atAGlance: { label: string; value: string; sub: string }[]
  /** Each person's own lines this session, under their own name. */
  whatEachPersonSaid: { who: string; isYou: boolean; lines: string[]; saying?: string }[]
  /** Whether this session's account can still be corrected, and the sentence if it cannot. */
  correctable: boolean
  whyNotCorrectable: string | null
  /** Everybody the report is counting for this session, named, with what each has done. */
  counting: { who: string; isYou: boolean; answered: boolean; hasShownTheirs: boolean }[]
  everybodyHasShownTheirs: boolean
  /** Whether the shared report has gone out, and whether this reader has shown their own. */
  released: boolean
  iHaveShownMine: boolean
  sharedPicture: string | null
  takenAt: string | null
  amendedAt: string | null
  amendedNote: string | null
  showsEverybody: boolean
}
