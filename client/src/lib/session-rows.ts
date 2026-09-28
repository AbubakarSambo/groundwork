import type { SessionRow } from '@/components/gw/TheReportIsAListOfSessions'
import { whoIsInRound } from '@/lib/who-is-in-this-round'

/**
 * ONE ROW PER SESSION, AND WHO EACH ROW IS COUNTING.
 *
 * U.10: LIFTED OUT OF GroundAdminPage SO THE BOARD CAN USE THE SAME ROWS.
 *
 * This was a client-only IIFE inside GroundAdminPage.tsx, computing `SessionRow[]` from the same
 * `ground` object (participants, checkIns, roundCompletions) both the Report tab and the board
 * already fetch. The board's "Reports" table (board-as-lead.jpg) needs the same facts - a date, how
 * many checked in, and whether the round shared - so this is now a shared, pure function rather
 * than a second copy of the same counting rules. GroundAdminPage's Report tab is unchanged in what
 * it shows; it just calls this instead of computing its own copy.
 *
 * The denominator is every party who is not managing-only, which is exactly the set
 * `recordRoundCompletion` counts on the server - so "3 of 4 answered" and whether the row says
 * Final cannot disagree. Somebody managing without giving an account is not in it, because they
 * were never going to answer.
 */
export function buildSessionRows(
  ground: { participants?: any[]; checkIns?: any[]; roundCompletions?: any[]; scenario?: string | null } | null | undefined,
  userId: string | null | undefined,
  labelInASentence: (p: any) => string,
): SessionRow[] {
  const everybody = (ground?.participants ?? []) as any[]
  const checkIns = (ground?.checkIns ?? []) as any[]
  const numbers = [...new Set(checkIns.filter((c) => !c.isSetup).map((c) => c.sessionNumber as number))]
    .filter((n) => checkIns.some((c) => c.sessionNumber === n && c.status === 'COMPLETED'))
    .sort((a, b) => b - a)

  return numbers.map((n) => {
    /* Who this round counts: a managing-only lead is in session 1 and not after. See who-is-in-this-round. */
    const parties = whoIsInRound(everybody, n, ground?.scenario)
    const answeredIds = new Set(
      checkIns.filter((c) => c.sessionNumber === n && c.status === 'COMPLETED').map((c) => c.participantId),
    )
    const mine = checkIns.find(
      (c) => c.sessionNumber === n && c.status === 'COMPLETED'
        && parties.some((p) => p.id === c.participantId && p.userId === userId),
    )
    return {
      sessionNumber: n,
      myCheckInId: mine?.id ?? null,
      answered: parties.filter((p) => answeredIds.has(p.id)).length,
      total: parties.length,
      closed: ((ground?.roundCompletions ?? []) as any[]).some((r) => r.sessionNumber === n),
      /* The reader is "you", never their own name (the wording rule); everybody else as labelled. */
      waitingOn: parties.filter((p) => !answeredIds.has(p.id)).map((p) => (p.userId && p.userId === userId ? 'you' : labelInASentence(p))),
      /* When this session opened, for the row's "Wed, 23 Sept" (U.9). The earliest opening, or
         the first answer when no opening time was kept. */
      opened: (() => {
        const these = checkIns.filter((c) => c.sessionNumber === n)
        const times = these.map((c) => c.availableFrom).filter(Boolean)
        const pick = times.length ? times : these.map((c) => c.completedAt).filter(Boolean)
        return pick.length ? pick.map((t: string) => new Date(t)).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0].toISOString() : null
      })(),
    }
  })
}
