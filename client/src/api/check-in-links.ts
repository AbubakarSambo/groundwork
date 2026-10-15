import { apiClient } from './client'

/**
 * LINKS BETWEEN CHECK-INS (D3, U.16). The server decides what each reader gets
 * (GET /grounds/:id/links): only links from check-ins the reader may already open, never a
 * check-in's name, a person or a blocker from one they cannot. The screen adds nothing.
 */
export interface WaitingOnAnotherTeam {
  id: string
  /** The other check-in's name when you may open it, or the team as it was said here, or null. */
  team: string | null
  what: string
  asked: string
  open: { label: string; to: string } | null
}
export interface AskedOfThisCheckIn {
  id: string
  team: string
  what: string
  /** First name, or null where that check-in does not let you see who asked. */
  askedBy: string | null
  asked: string
  open: { label: string; to: string }
}
export interface CheckInLinks {
  waitingOnOtherTeams: WaitingOnAnotherTeam[]
  askedOfThisCheckIn: AskedOfThisCheckIn[]
}

export const checkInLinksApi = {
  get: (groundId: string): Promise<CheckInLinks> =>
    apiClient.get<CheckInLinks>(`/grounds/${groundId}/links`).then(r => r.data),
}
