import { apiClient } from './client'

/**
 * TODAY (C1, U.5): what needs you now, gathered by the server across every check-in you can see.
 * The server decides what is on it and writes the sentences; the screen only says when.
 */
export type NeedKind = 'ready' | 'decide' | 'look'

export interface Need {
  key: string
  kind: NeedKind
  title: string
  detail: string | null
  action: { label: string; to: string }
  groundId: string
  organizationId: string
  /** True for an item the board of that check-in already lists itself (request 122). The board leaves it out of its own "needs you" rows. */
  onTheBoardToo?: true
}

export interface ComingUp {
  /** A moment. The screen says it in the reader's own time: "Tomorrow, 4pm". */
  at: string
  what: string
  to: string
  /** The check-in it is about, and the day it started, so two close names can be told apart by the thing (request 193). */
  groundId?: string
  checkInStartedOn?: string
}

export interface WhatNeedsYou {
  needs: Need[]
  count: number
  line: string | null
  comingUp: ComingUp[]
  /** A lead's only (screens request 198, b); absent for everybody else and for a lead with nothing to add. Every sentence is the server's, the mail's own. */
  forTheLead?: {
    nobodyHasStarted: { groundId: string; label: string; subject: string; lines: string[]; linkLabel: string; to: string }[]
    whatIWouldDoThisWeek: { groundId: string; label: string; lines: string[] }[]
  }
}

/**
 * WHAT IS OUTSTANDING FOR A LEAD (decision 120, GET /today/outstanding). The page the lead's daily
 * nudge links to, "to see everything". Each array holds whole sentences, already worded by the
 * server, in the order they should be read. `null` for anybody who is not a lead, or who has
 * nothing outstanding.
 */
export interface Outstanding {
  needsYou: string[]
  overdueOnYourTeam: string[]
  risks: string[]
}

export const todayApi = {
  get: (): Promise<WhatNeedsYou> => apiClient.get<WhatNeedsYou>('/today').then(r => r.data),
  /** How many things need you in each organisation you belong to: "3 new" on "Choose an organisation". */
  everywhere: (): Promise<{ organizationId: string; count: number }[]> =>
    apiClient.get<{ organizationId: string; count: number }[]>('/today/everywhere').then(r => (Array.isArray(r.data) ? r.data : [])),
  outstanding: (): Promise<Outstanding | null> =>
    apiClient.get<{ outstanding: Outstanding | null }>('/today/outstanding').then(r => r.data.outstanding ?? null),
}
