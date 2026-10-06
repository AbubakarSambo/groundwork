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
}

export interface WhatNeedsYou {
  needs: Need[]
  count: number
  line: string | null
  comingUp: ComingUp[]
}

export const todayApi = {
  get: (): Promise<WhatNeedsYou> => apiClient.get<WhatNeedsYou>('/today').then(r => r.data),
  /** How many things need you in each organisation you belong to: "3 new" on "Choose an organisation". */
  everywhere: (): Promise<{ organizationId: string; count: number }[]> =>
    apiClient.get<{ organizationId: string; count: number }[]>('/today/everywhere').then(r => (Array.isArray(r.data) ? r.data : [])),
}
