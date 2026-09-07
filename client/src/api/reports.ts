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

  activationStatus: (groundId: string) =>
    apiClient.get<ActivationStatus>(`/grounds/${groundId}/report/activation-status`).then(r => r.data),

  startClarification: (groundId: string, inferenceId: string) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/clarify`, { inferenceId }).then(r => r.data),

  startSelfCorrection: (groundId: string, sessionNumber: number) =>
    apiClient.post<{ checkInId: string }>(`/grounds/${groundId}/correct-session`, { sessionNumber }).then(r => r.data),
}
