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
  /** Only on your own item about your own missed check-ins (decision 136): where your reason is kept, and the reason you already gave. */
  missedReason?: { checkInId: string; given: string | null }
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

/**
 * REQUEST 198 (b), DONE (docs/answers-from-engine.md, 8 October (late night)). Built from the same
 * functions the mail uses, so Today and the mail cannot disagree. Absent for anybody but a lead
 * with something to add - a participant, an admin who does not run the check-in, and a lead with
 * nothing new all get no key at all.
 */
export interface NobodyHasStarted {
  groundId: string
  label: string
  /** The same subject the first-reminder mail has, e.g. "Nobody has started "Distributor review" yet, and Groundwork is following up". */
  subject: string
  lines: string[]
  linkLabel: string
  to: string
}

export interface WhatIWouldDoThisWeek {
  groundId: string
  label: string
  /** "Here is what I would do this week." first, then each thing with its reason. */
  lines: string[]
}

export interface ForTheLead {
  nobodyHasStarted: NobodyHasStarted[]
  whatIWouldDoThisWeek: WhatIWouldDoThisWeek[]
}

export interface WhatNeedsYou {
  needs: Need[]
  count: number
  line: string | null
  comingUp: ComingUp[]
  /** For an admin while the organisation's free trial runs: one sentence with the day it ends. */
  freeTrial?: string | null
  /** "You can also check in on WhatsApp.", with "Connect WhatsApp", when one of your own check-ins is there to answer and WhatsApp is on (fix list, item 5). */
  checkInOnWhatsApp?: { says: string; link: string; label: string } | null
  /** Absent for everybody but a lead with something here to add (request 198 (b)). */
  forTheLead?: ForTheLead
  /** The one person the line names as not checked in yet, for the lead: the board's own nudge, beside the line. */
  lineNudge?: { groundId: string; participantId: string; firstName: string } | null
  /** "Since yesterday" (C1): what moved since the round before, for the check-in the line is about. */
  sinceYesterday?: { heading: string; says: string; also: string | null } | null
}

/**
 * WHAT IS OUTSTANDING FOR A LEAD (decision 120, GET /today/outstanding). The page the lead's daily
 * nudge links to, "to see everything". Each array holds whole sentences, already worded by the
 * server, in the order they should be read. `null` for anybody who is not a lead, or who has
 * nothing outstanding.
 */
/** Request 205: what each `Outstanding` sentence is about, matched against `Need` rows by id
    instead of by wording (`outstanding-not-already-shown.ts`). */
export interface OutstandingAbout {
  kind: 'requests' | 'wait' | 'decision' | 'promise' | 'plan-decision' | 'target' | 'quiet' | 'missed'
  ids: string[]
  groundId?: string
}

export interface Outstanding {
  needsYou: string[]
  overdueOnYourTeam: string[]
  risks: string[]
  /** One entry per sentence in each list above, in the same order. Absent on an older server. */
  about?: {
    needsYou: OutstandingAbout[]
    overdueOnYourTeam: OutstandingAbout[]
    risks: OutstandingAbout[]
  }
}

export const todayApi = {
  get: (): Promise<WhatNeedsYou> => apiClient.get<WhatNeedsYou>('/today').then(r => r.data),
  /** How many things need you in each organisation you belong to: "3 new" on "Choose an organisation". */
  everywhere: (): Promise<{ organizationId: string; count: number }[]> =>
    apiClient.get<{ organizationId: string; count: number }[]>('/today/everywhere').then(r => (Array.isArray(r.data) ? r.data : [])),
  /** Give the reason you missed your check-ins. Only you can give it; the person who runs the check-in reads it beside the line about it. */
  giveMissedReason: (checkInId: string, reason: string): Promise<{ kept: true }> =>
    apiClient.post<{ kept: true }>('/today/missed-reason', { checkInId, reason }).then(r => r.data),
  outstanding: (): Promise<Outstanding | null> =>
    apiClient.get<{ outstanding: Outstanding | null }>('/today/outstanding').then(r => r.data.outstanding ?? null),
}
