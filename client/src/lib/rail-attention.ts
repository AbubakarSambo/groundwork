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
  | { kind: 'waiting'; done: number; total: number }

export interface RailGround {
  participants?: { id: string; userId?: string | null }[]
  checkIns?: { participantId: string; sessionNumber: number; status: string; availableFrom?: string | null }[]
  closedAt?: string | null
  resolvedAt?: string | null
}

/** How long after a check-in opens before it counts as late. */
export const OVERDUE_AFTER_DAYS = 7

export function railAttention(g: RailGround, myUserId: string | null | undefined, now: Date = new Date()): RailAttention {
  const me = (g.participants ?? []).find((p) => p.userId && p.userId === myUserId)
  const checkIns = g.checkIns ?? []

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
  const parties = (g.participants ?? []).length
  if (parties > 1) {
    const round = Math.max(0, ...checkIns.map((c) => c.sessionNumber))
    if (round > 0) {
      const done = checkIns.filter((c) => c.sessionNumber === round && c.status === 'COMPLETED').length
      if (done < parties) return { kind: 'waiting', done, total: parties }
    }
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
