import { isShut } from './a-ground-that-has-ended'
import { theCountOf, type TheCountAsServed } from './the-one-count'

/**
 * WHAT A GROUND IN THE RAIL NEEDS FROM YOU, IF ANYTHING.
 *
 * Hafsah's model: grounds sit in the sidebar like channels, you come back and keep
 * adding check-ins, and the name changes when it is your turn. This is the read
 * behind that - one function, so the rail, a future sort, and any test all agree on
 * what "your turn" means.
 *
 * RED MEANS LATE, NOT "YOUR TURN". She said the name should turn red when it is time
 * to check in, and I split that in two on purpose. The product's own tone rules
 * forbid surveillance signals - "Never say engagement is declining. Never say the
 * person seems to be pulling back. These are surveillance observations. They make
 * people feel watched not supported" - and a ground that goes red the moment it is
 * your turn is a red mark against somebody for being on time. Bold and a dot while
 * the window is open; red only once it has closed.
 *
 * AND THE BADGE MEANS DIFFERENT THINGS TO DIFFERENT PEOPLE. For a party it is "your
 * turn". For an admin who runs a ground they are not in, there is no turn at all -
 * the state is how many others are still out. Rendering those identically would have
 * an admin believing they owe a check-in they do not.
 */

export type RailAttention =
  | { kind: 'none' }
  /** An open check-in of your own, still inside its window. */
  | { kind: 'yours'; sessionNumber: number }
  /** An open check-in of your own, past the date it was due. */
  | { kind: 'overdue'; sessionNumber: number; daysLate: number }
  /** Not yours to do: other people have not checked in yet. */
  /** The served count's own sentence says who is not counted and why (api grounds/this-sessions-count.ts). */
  | { kind: 'waiting'; done: number; total: number }

export interface RailGround {
  /** The ground's own status. Without it, the rail cannot tell a live check-in from a shut one. */
  status?: string | null
  /** `managingOnly`: a lead who runs an anchor check-in and does not check in herself (the server's flag). */
  participants?: { id: string; userId?: string | null; partyType?: string | null; managingOnly?: boolean | null; notLetInYet?: boolean | null }[]
  /** `isSetup`: the lead's set-up conversation, kept as a check-in row; it is not a session and nobody answered it. */
  checkIns?: { participantId: string; sessionNumber: number; status: string; availableFrom?: string | null; isSetup?: boolean | null }[]
  closedAt?: string | null
  resolvedAt?: string | null
  scenario?: string | null
  /** Who has answered each session, as the server counted it (the one count). */
  theCount?: TheCountAsServed | null
}

/** How long after a check-in opens before it counts as late. */
export const OVERDUE_AFTER_DAYS = 7

export function railAttention(g: RailGround, myUserId: string | null | undefined, now: Date = new Date()): RailAttention {
  /*
   * A CHECK-IN THAT REFUSES EVERY ANSWER IS NOT SOMEBODY'S TURN.
   *
   * Nate Peterson, 23 September 2026: "it doesn't seem clear that you can't check in, because all
   * of the involved accounts have things like 'your turn - 12 days late', which would indicate that
   * a user could still check in."
   *
   * They could not. The server refuses with "This check-in is closed. Nothing further can be added
   * to it." This function never looked at the ground's status at all - it declared `closedAt` and
   * `resolvedAt` in its own input type and read neither - so every ended, held and out-of-time
   * check-in kept asking people for an answer it would then reject. Twelve days of it, in his case.
   *
   * `isShut` and not `hasEnded`: out of time is the one he hit, and it is the one that looks most
   * like a live check-in from the outside.
   */
  if (isShut(g.status) || g.closedAt || g.resolvedAt) return { kind: 'none' }

  const me = (g.participants ?? []).find((p) => p.userId && p.userId === myUserId)
  /* The set-up conversation is not a session (screens item c), so it is never "done" for anybody here (release check, 9 October:
     an anchor lead read "Two of the three have not answered yet." while nobody had checked in). */
  const checkIns = (g.checkIns ?? []).filter((c) => !c.isSetup)

  if (me) {
    const mine = checkIns.filter((c) => c.participantId === me.id && c.status !== 'COMPLETED')
    // The earliest open one: being two rounds behind should read as one thing to do,
    // not two, or the rail nags twice for the same person.
    const next = mine.sort((a, b) => a.sessionNumber - b.sessionNumber)[0]
    if (next) {
      const from = next.availableFrom ? new Date(next.availableFrom) : null
      // Not yet open is not "your turn": a session scheduled for next fortnight is
      // not something anybody is late for.
      if (from && from.getTime() > now.getTime()) return { kind: 'none' }
      const daysLate = from ? Math.floor((now.getTime() - from.getTime()) / 86_400_000) : 0
      return daysLate > OVERDUE_AFTER_DAYS
        ? { kind: 'overdue', sessionNumber: next.sessionNumber, daysLate }
        : { kind: 'yours', sessionNumber: next.sessionNumber }
    }
  }

  // Nothing of yours outstanding. Say who else is still out, which is what an admin
  // wants and what a party who has finished wants - both are "not your move".
  /*
   * THE TEAM'S ROUND, NOT THE LEAD'S OWN EXTRA ONE (journey test, 12 October 2026). Lena checked in
   * herself a second time, so her session 2 row was the latest open one, and the team, all on session
   * 1 (the line under it said "Session 1 of 261"), was counted against session 2, which none of them
   * had. The round counted is the latest one opened for somebody who does not choose when to check in;
   * only where nobody else has a row is it the lead's.
   */
  const choosesWhen = new Set((g.participants ?? []).filter((p) => p.partyType === 'INITIATOR' || !!p.managingOnly).map((p) => p.id))
  const theTeams = checkIns.filter((c) => !choosesWhen.has(c.participantId))
  const round = openRound(theTeams.length ? theTeams : checkIns, now)
  /*
   * B-078: A LEAD WHO ONLY MANAGES IS NOT COUNTED PAST HER OWN SET-UP ROUND. Grace runs "Shops
   * reorder in two days" (HELP_TEAM_UNDERSTAND) and never checks in; the server's one count leaves
   * her out of this exact count everywhere else on the page, but this
   * function counted every participant and her completed set-up row as an answer, so the line at
   * the top of every tab read "Three of the four have not answered yet." when none of the three
   * people who actually check in had answered. One rule, used here too.
   */
  /* Who the round counts and who has answered it, as the server counted them (the one count). */
  const count = theCountOf(g, round)
  const parties = count?.onTheCheckIn.length ?? 0
  if (parties > 1 && round > 0 && count) {
    const done = count.answered.length
    if (done < parties) return { kind: 'waiting', done, total: parties }
  }
  return { kind: 'none' }
}

/**
 * Rail order: what needs you, then what is late, then everything else.
 *
 * The flat rail stays usable far longer when the rows that need you are at the top,
 * which is most of why grouping can wait (her call, and the right one - grouping
 * solves a scale nobody has yet).
 */
/**
 * THE LATEST SESSION THAT HAS OPENED. A session scheduled for next week already has its rows, so
 * taking the highest session number counted people as "not checked in" for a session nobody can
 * start yet: the admin's sidebar said nobody had checked in for session 3 while session 2 had two of
 * five done and session 3 did not open for another week. A row with no opening date is open.
 */
export function openRound(checkIns: RailGround['checkIns'], now: Date = new Date()): number {
  const open = (checkIns ?? []).filter((c) => !c.availableFrom || new Date(c.availableFrom).getTime() <= now.getTime())
  return Math.max(0, ...open.map((c) => c.sessionNumber))
}

export function railRank(a: RailAttention): number {
  switch (a.kind) {
    case 'overdue': return 0
    case 'yours': return 1
    case 'waiting': return 2
    default: return 3
  }
}

/**
 * Whether a closed ground still belongs in the rail.
 *
 * Her decision: about three months, then it drops out. Removing it the day it closes
 * would hide it exactly when it matters most - the report has just landed, the
 * resolution has just been agreed, and people are still rereading it. Nothing is
 * deleted either way; it stays on the grounds page and at its URL, which the
 * product's own promise requires ("stays open to you after it closes").
 */
export const RAIL_KEEPS_CLOSED_FOR_DAYS = 90

export function stillInRail(g: RailGround, now: Date = new Date()): boolean {
  const ended = g.closedAt ?? g.resolvedAt
  if (!ended) return true
  const days = (now.getTime() - new Date(ended).getTime()) / 86_400_000
  return days < RAIL_KEEPS_CLOSED_FOR_DAYS
}
