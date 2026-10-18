import { railAttention, openRound } from '@/lib/rail-attention'
import { hasEnded, hasStalled } from '@/lib/a-ground-that-has-ended'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { scenarioLabel, isEvaluationScenario } from '@/lib/scenario-catalog'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { whenItRunsOut } from '@/lib/when-it-runs-out'
import type { TagTone } from '@/components/gw/kit'

/**
 * HOW ONE ROW OF THE CHECK-INS LIST READS, FROM THE READER'S SIDE (C1, U.5).
 *
 * The prototype's table (docs/prototype/screens/C1-today-and-check-ins/check-ins.txt): the check-in
 * with one line about it, what it is for, what it needs from you, and where it stands.
 *
 *   Faith, first 90 days    Faith and Wairimu. Weekly, Mondays. Week 1 of 12.
 *   Help a new hire get started      Your turn      Just started
 *
 * Every part is a sentence or a short fact, never pieces joined with dots. The reader is "you": a
 * check-in you run with one other person reads "Kwame and you", never your own name.
 *
 * Nothing here decides what a reader may see. It only says, in words, what the list endpoint already
 * gave this reader.
 */

export interface ListRow {
  id: string
  label: string
  status?: string | null
  initiatorId?: string | null
  scenario?: string | null
  brief?: string | null
  cadence?: string | null
  cadenceAnchorDay?: number | null
  workingDays?: number[] | null
  timelineDays?: number | null
  maxSessions?: number | null
  totalSessions?: number | null
  closedAt?: string | null
  resolvedAt?: string | null
  endsAt?: string | null
  daysLeft?: number | null
  hasBoard?: boolean
  otherOrgName?: string | null
  reportWaitingForMe?: boolean
  roundsDone?: number
  /** The sessions whose team report has been shared, as the list serves it. */
  report?: { releasedAt?: string | null; releasedSessions?: number[] | null } | null
  participants?: {
    id: string
    userId?: string | null
    partyType?: string | null
    user?: { firstName?: string | null; lastName?: string | null } | null
    nameGiven?: string | null
    managingOnly?: boolean | null
  }[]
  checkIns?: { participantId: string; sessionNumber: number; status: string; availableFrom?: string | null; isSetup?: boolean | null }[]
  glance?: {
    progress?: { roundsDone?: number; roundsPlanned?: number | null; answeredThisRound?: number; ofPeople?: number }
    inTheWay?: { count?: number; oldest?: string | null }
  } | null
}

export interface RowReads {
  /** The line under the name. */
  about: string
  /** What it is for: the situation, in sentence case. */
  forWhat: string
  /** What it needs from you, as a tag, or nothing. */
  needs: { text: string; tone: TagTone } | null
  /** Where it stands, in a few words. */
  stands: string
  /** Where "Read the board" goes, on a finished one. */
  standsTo?: string
  /** A second, quieter sentence under where it stands, when something is holding it up. */
  also?: string
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

const firstName = (p?: ListRow['participants'] extends (infer T)[] | undefined ? T : never) =>
  (p?.user?.firstName ?? '').trim() || (p?.nameGiven ?? '').trim().split(/\s+/)[0] || null
const fullName = (p?: ListRow['participants'] extends (infer T)[] | undefined ? T : never) =>
  [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || null

/** "Help a New Hire Get Started" as the prototype says it: "Help a new hire get started". */
export function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
}

export function isFinished(g: ListRow): boolean {
  return hasEnded(g.status) || !!g.closedAt || !!g.resolvedAt
}

/** "Weekly, Mondays.", "Daily, weekdays.", "One time." */
export function howOften(g: ListRow): string | null {
  const c = g.cadence
  if (!c) return null
  if (c === 'ONE_TIME') return 'One time.'
  if (c === 'SEQUENTIAL') return 'When the lead checks in.'
  const base = ({ DAILY: 'Daily', WEEKLY: 'Weekly', FORTNIGHTLY: 'Every 2 weeks', MONTHLY: 'Monthly' } as Record<string, string>)[c]
  if (!base) return null
  const days = [...(g.workingDays ?? [])].sort().join(',')
  if (c === 'DAILY' && days === '1,2,3,4,5') return 'Daily, weekdays.'
  if ((c === 'WEEKLY' || c === 'FORTNIGHTLY') && g.cadenceAnchorDay != null && WEEKDAYS[g.cadenceAnchorDay]) {
    return `${base}, ${WEEKDAYS[g.cadenceAnchorDay]}.`
  }
  return `${base}.`
}

/** Who is in it, from the reader's side: "Kwame and you.", "6 people.", "Run by Amani Njoroge." */
function whoIsIn(g: ListRow, me: string | null | undefined): string | null {
  const people = g.participants ?? []
  if (g.initiatorId && g.initiatorId !== me) {
    const lead = people.find(p => p.partyType === 'INITIATOR') ?? people.find(p => p.userId === g.initiatorId)
    const name = fullName(lead)
    return name ? `Run by ${name}.` : null
  }
  const mine = people.find(p => !!me && p.userId === me)
  const others = people.filter(p => p !== mine)
  if (people.length === 0) return null
  if (people.length === 1) return mine ? 'Only you so far.' : firstName(others[0]) ? `Only ${firstName(others[0])} so far.` : '1 person.'
  if (people.length === 2) {
    if (mine && firstName(others[0])) return `${firstName(others[0])} and you.`
    if (!mine && firstName(others[0]) && firstName(others[1])) return `${firstName(others[0])} and ${firstName(others[1])}.`
  }
  /* The people who check in: a lead who only manages is not counted ("6 people" for six reps and their lead, check-ins.txt). */
  const checkingIn = people.filter(p => !p.managingOnly).length
  return `${checkingIn || people.length} people.`
}

function sessionsOf(g: ListRow) {
  return (g.checkIns ?? []).filter(c => !c.isSetup)
}

function nextSessionOn(g: ListRow, now: Date): Date | null {
  const future = sessionsOf(g)
    .map(c => (c.availableFrom ? new Date(c.availableFrom).getTime() : null))
    .filter((t): t is number => t !== null && t > now.getTime())
    .sort((a, b) => a - b)[0]
  return future ? new Date(future) : null
}

export function howARowReads(g: ListRow, me: string | null | undefined, now: Date = new Date(), reader: { isAdmin?: boolean } = {}): RowReads {
  const forWhat = g.scenario ? sentenceCase(scenarioLabel(g.scenario, g.brief)) : ''
  const iRunIt = !!me && g.initiatorId === me
  const planned = g.glance?.progress?.roundsPlanned
    ?? plannedSessionsFor(g.timelineDays ?? null, g.cadence as never, g.maxSessions ?? g.totalSessions ?? null)
  const done = g.glance?.progress?.roundsDone ?? g.roundsDone ?? 0
  /*
   * SCREEN FAULT 9: "SESSION 2 OF 12" HERE, "SESSION 1 OF 12" ON THE BOARD, FOR THE SAME CHECK-IN
   * AT THE SAME MOMENT.
   *
   * This read `openRound` (rail-attention.ts) alone - the highest session number that has become
   * AVAILABLE by the clock. The board and the header read `whichSessionIsThisCheckInOn`
   * (which-session-are-we-on.ts) instead: one past the lowest number of sessions anybody still in
   * it has actually FINISHED - it can only go lower than the schedule, never higher, because a
   * session opening on time does not mean everybody still owes it has answered.
   *
   * The list is not served that same full per-participant history (only the open round's rows),
   * so it cannot run that rule itself without inventing a number from thinner material. What it
   * IS served, the same as the board, is `roundsDone` (`done` here) - the server's own count of
   * sessions everybody has actually finished, the number `whichSessionIsThisCheckInOn` is built
   * from. One past that (`done + 1`) is the same answer the board's rule would give; taking
   * whichever of that and the schedule's own number is LOWER agrees with the board whenever the
   * two differ, and still agrees with the schedule once everybody has caught up to it.
   */
  const scheduleRound = openRound(g.checkIns as never, now)
  const round = scheduleRound > 0 ? Math.min(done + 1, scheduleRound) : 0

  /* FINISHED: when it ended, and the way back to it. */
  if (isFinished(g)) {
    const ended = g.closedAt ?? g.resolvedAt ?? g.endsAt
    const about = [ended ? `Ended ${whenItWas(ended, 'dayAndMonthLong')}.` : 'Ended.', g.otherOrgName ? `It belongs to ${g.otherOrgName}.` : null]
      .filter(Boolean).join(' ')
    return {
      about,
      forWhat,
      needs: null,
      stands: g.hasBoard ? 'Read the board' : 'Read the report',
      standsTo: g.hasBoard ? `/grounds/${g.id}/board` : `/grounds/${g.id}/report`,
    }
  }

  const allDone = !!planned && done >= planned
  const sessionLine = round > 0
    ? planned
      ? allDone ? `Session ${planned} of ${planned}, finished.` : `Session ${round} of ${planned}.`
      : `Session ${round}.`
    : null
  const about = [whoIsIn(g, me), howOften(g), sessionLine, g.otherOrgName ? `It belongs to ${g.otherOrgName}.` : null]
    .filter(Boolean).join(' ')

  /* WHAT IT NEEDS FROM YOU. */
  let needs: RowReads['needs'] = null
  const a = railAttention(g as never, me, now)
  const out = whenItRunsOut(g as never)
  /* Waiting for an admin: to the admin, it is theirs to approve (U.5 review); to anyone else, it is waiting. */
  if (g.status === 'AWAITING_APPROVAL') needs = reader.isAdmin ? { text: 'Yours to approve', tone: 'action' } : { text: 'Waiting for an admin', tone: 'plain' }
  /* REPORT_READY is a legacy status nothing writes now; rows written before the release change carry it. */
  else if (g.reportWaitingForMe) needs = { text: 'Your report is ready', tone: 'proven' }
  /* The legacy status says a report exists, not that one is this reader's: an admin who is not in
     the check-in read "Your report is ready" (live walk, 6 October). */
  else if (g.status === 'REPORT_READY') needs = ((g.participants ?? []).some(p => !!me && p.userId === me) || iRunIt) ? { text: 'Your report is ready', tone: 'proven' } : { text: 'The report is ready', tone: 'plain' }
  else if (hasStalled(g.status) || out.state === 'out') needs = { text: 'Out of time', tone: 'attention' }
  else if (out.state === 'soon') needs = { text: out.daysLeft === 1 ? 'Runs out tomorrow' : `Runs out in ${out.daysLeft} days`, tone: 'attention' }
  else if (a.kind === 'yours' || a.kind === 'overdue') needs = { text: 'Your turn', tone: 'action' }
  /*
   * TODAY'S REPORT IS READY (check-ins.jpg and every board's "The other boards you’re in": "Sales team, Q3, Today’s report
   * ready"). For whoever runs a check-in that repeats, this session's team report is there to read and share once anybody
   * has checked in (it shares itself at its set time unless they hold it). A one-time check-in still waits for everybody.
   */
  /* Not on a check-in about one person: there is no team to share it with, and both accounts being in is what counts there. */
  else if (iRunIt && !allDone && !isEvaluationScenario(g.scenario) && g.cadence && g.cadence !== 'ONE_TIME' && round > 0 && aSessionReportToShare(g, round)) needs = { text: g.cadence === 'DAILY' ? 'Today’s report ready' : 'This session’s report is ready', tone: 'proven' }
  else if (a.kind === 'waiting' && iRunIt) {
    const byId = new Map((g.participants ?? []).map(p => [p.id, p]))
    const missing = sessionsOf(g).filter(c => c.sessionNumber === round && c.status !== 'COMPLETED').map(c => byId.get(c.participantId))
    const name = missing.length === 1 ? firstName(missing[0]) : null
    /* Counted from the session's own rows: a lead who does not answer is not someone it waits on. */
    const count = missing.length
    if (count > 0) needs = { text: name ? `Waiting on ${name}` : count === 1 ? 'Waiting on 1 person' : `Waiting on ${count} people`, tone: 'plain' }
  }

  /* WHERE IT STANDS. */
  let stands: string
  const answered = g.glance?.progress?.answeredThisRound
  const ofPeople = g.glance?.progress?.ofPeople ?? 0
  const next = nextSessionOn(g, now)
  if (g.status === 'AWAITING_APPROVAL') stands = 'Not started yet'
  else if (g.status === 'DECLINED') stands = 'An admin declined it'
  else if (hasStalled(g.status)) stands = 'It ran out of time'
  else if (allDone && iRunIt) stands = 'Decide how it ends'
  else if (a.kind === 'overdue') stands = `It opened ${a.daysLate} days ago`
  else if (done === 0 && round <= 1 && !answered) stands = 'Just started'
  /* danielpip-board.jpg, "Daniel, the next six weeks: Both accounts in": on a check-in about one person, the person's account and the lead's are both in for this session. */
  else if (round > 0 && isEvaluationScenario(g.scenario) && ofPeople === 2 && answered === 2) stands = 'Both accounts in'
  else if (round > 0 && ofPeople > 1 && answered != null && answered < ofPeople) stands = `${answered} of ${ofPeople} answered`
  else if (next) stands = `Next: ${whenItWas(next, 'dayAndMonthLong')}`
  else if (planned) stands = `${done} of ${planned} sessions done`
  else stands = done === 1 ? '1 session done' : `${done} sessions done`

  /* AND WHAT IS HOLDING IT UP, OR THAT IT CANNOT MAKE A SHARED REPORT YET. */
  let also: string | undefined
  const stuck = g.glance?.inTheWay?.count ?? 0
  if (stuck === 1 && g.glance?.inTheWay?.oldest) also = `${sentenceStart(g.glance.inTheWay.oldest)} is holding it up.`
  else if (stuck > 1) also = `${stuck} things are holding it up.`
  /* Visible without opening it: a check-in with one person answering will never make a shared report (B17). */
  else if (iRunIt && g.status === 'ACTIVE' && (g.participants ?? []).filter(p => !p.managingOnly).length < 2) also = 'It needs a second person for a shared report.'

  return { about, forWhat, needs, stands, also }
}

/** This session has at least one check-in finished, and its team report has not been shared yet. */
function aSessionReportToShare(g: ListRow, round: number): boolean {
  const finished = (g.checkIns ?? []).some((c) => c.sessionNumber === round && c.status === 'COMPLETED' && !c.isSetup)
  const shared = (g.report?.releasedSessions ?? []).includes(round)
  return finished && !shared
}

function sentenceStart(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}
