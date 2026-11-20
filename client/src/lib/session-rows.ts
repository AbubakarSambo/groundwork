import type { SessionRow } from '@/components/gw/TheReportIsAListOfSessions'
import { theCountOf, type TheCountAsServed } from '@/lib/the-one-count'


/** A session the clock closed where the person said nothing (closedReason 'auto_closed', no turn of theirs). Rows served without either field read as before. */
export function wasAQuietClose(c: { closedReason?: string | null; turns?: unknown[] | null }): boolean {
  return c?.closedReason === 'auto_closed' && Array.isArray(c.turns) && c.turns.length === 0
}

/**
 * WHETHER A SESSION'S TEAM PICTURE HAS BEEN SHARED, THE SAME RULE THE ENGINE USES.
 *
 * SCREEN FAULT 1 (FINAL WALK): "NOT SHARED" WHEN THE REPORT WAS SHARED. `SessionRow.closed` answers
 * "did everyone in this round finish" (from `roundCompletions`), which is a DIFFERENT fact from
 * "has the lead released this session's report to everyone" (`report.releasedAt` /
 * `report.releasedSessions`, decision 76) - a lead can cut a session short and release it before
 * everyone has answered, and a finished round is not released until the lead shares it. The Reports
 * list and the board both drew "Shared"/"Not shared" from `closed`, so a released-but-not-fully-
 * answered session read "Not shared", and the "Share it" button it drew pointed at a page the
 * engine never gave a share control. This mirrors the server's own
 * `isThisSessionReleased` (api/src/modules/reports/each-sessions-picture-is-released-on-its-own.ts)
 * so the two can never disagree.
 */
export function isSessionShared(
  report: { releasedAt?: string | null; releasedSessions?: number[] | null } | null | undefined,
  sessionNumber: number,
): boolean {
  if (!report?.releasedAt) return false
  const list = Array.isArray(report.releasedSessions)
    ? [...new Set(report.releasedSessions.filter((n) => Number.isInteger(n) && n > 0))]
    : null
  if (list === null) return true
  return list.includes(sessionNumber)
}

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
  ground: { participants?: any[]; checkIns?: any[]; roundCompletions?: any[]; scenario?: string | null; theCount?: TheCountAsServed | null } | null | undefined,
  userId: string | null | undefined,
  labelInASentence: (p: any) => string,
  /**
   * THE FULL ROSTER, WHEN `ground.participants` DOES NOT CARRY IT.
   *
   * `GET /grounds/:id` sends a participant only their own row, never anyone else's - so for a
   * participant, `ground.participants` has one entry even on a two-person check-in, where the
   * board's own answer (`GET /grounds/:id/board`) sends every party's name to everybody on it (the
   * lead is not a peer whose visibility this withholds, and a party's own name on a roster they are
   * already on is nothing new). The count itself is the server's (theCount), so it is the whole check-in's
   * whichever list the page has; this list only names the people still waited on.
   */
  fullParticipants?: { id: string; managingOnly?: boolean | null; notLetInYet?: boolean | null }[] | null,
  /**
   * SCREEN FAULT 9, PART 2: THE BOARD CALLED SOMEBODY BOTH "NOT ON ANY OF THESE SESSIONS" AND
   * "NOT YET CHECKED IN", FOR THE SAME SESSION.
   *
   * The served count says who a round counts, but not when somebody joined, so a party added after session `n` had already run
   * could be named in that round's own `waitingOn`.
   *
   * The server's own grid (`checkInGrid.rows[].cells`, nine-columns-is-not-a-phone-screen.tsx)
   * already knows the true answer and says "na" for exactly this case - this is that same map,
   * participant id to the sessions they are actually on, passed in from where the board already
   * has it (BoardPage.tsx). `null`/absent when it is not to hand (every existing caller, and
   * every test of this file that predates it), in which case the served count stands alone.
   */
  onSessionFromGrid?: Map<string, Set<number>> | null,
): SessionRow[] {
  const everybody = (ground?.participants ?? []) as any[]
  const checkIns = (ground?.checkIns ?? []) as any[]
  const report = (ground as any)?.report as { releasedAt?: string | null; releasedSessions?: number[] | null } | null | undefined
  const numbers = [...new Set(checkIns.filter((c) => !c.isSetup).map((c) => c.sessionNumber as number))]
    .filter((n) => checkIns.some((c) => c.sessionNumber === n && c.status === 'COMPLETED'))
    /* A round the server served no count for was opened in a pause and sent to nobody, so it is not a row ("0 of 0 checked in", and one more in "All N check-ins"). A payload that carries no count at all lists as before. */
    .filter((n) => !(ground as { theCount?: TheCountAsServed | null } | null | undefined)?.theCount || !!theCountOf(ground, n))
    .sort((a, b) => b - a)

  return numbers.map((n) => {
    /* Who this round counts and who has answered it, as the server counted them (the one count, the-one-count.ts). Screen fault 9,
       part 2: and, when the server's own grid is to hand, only somebody actually on this session by it. */
    const count = theCountOf(ground, n)
    const onIt = (count?.onTheCheckIn ?? []).filter((id) => !onSessionFromGrid || !!onSessionFromGrid.get(id)?.has(n))
    const answeredIds = new Set(count?.answered ?? [])
    /* Names for the people counted: this page's list, or the board's whole roster where the page was sent only the reader's own row. */
    const byId = new Map<string, any>([...(fullParticipants ?? []), ...everybody].map((p: any) => [p.id, p]))
    const closed = ((ground?.roundCompletions ?? []) as any[]).some((r) => r.sessionNumber === n)
    const mine = checkIns.find(
      (c) => c.sessionNumber === n && c.status === 'COMPLETED'
        && everybody.some((p) => p.id === c.participantId && p.userId === userId),
    )
    return {
      sessionNumber: n,
      myCheckInId: mine?.id ?? null,
      answered: onIt.filter((id) => answeredIds.has(id)).length,
      total: onIt.length,
      closed,
      shared: isSessionShared(report, n),
      /* The reader is "you", never their own name (the wording rule); everybody else as labelled. */
      /* Somebody invited and not joined is counted, and said as not joined where the count's sentence is said, never as somebody who has
         not checked in (first experience, round 3: Fatuma and James, who never joined, read as "has not checked in"). */
      waitingOn: onIt.filter((id) => !answeredIds.has(id) && !(count?.notJoined ?? []).includes(id) && byId.has(id)).map((id) => byId.get(id)).map((p) => (p.userId && p.userId === userId ? 'you' : labelInASentence(p))),
      /* WHEN THIS SESSION REALLY OPENED, for the row's "Wed, 23 Sept" (U.9).
       *
       * Board review, 1 October, item 3: this used to read `availableFrom` first - the day the
       * session was SCHEDULED to open - so a round that had already run showed a date still to
       * come ("Session 2, 6 Oct" beside the same session's own page saying "opened on 30
       * September"). `availableFrom` is a gate a cron reads before anyone can start; it is not
       * when anyone actually did. The board's own phase-spine timeline (board.service.ts,
       * `phaseSpine.sessions[].date`) already gets this right, from the earliest `completedAt`
       * among that session's check-ins - the first account that is actually in. This copies the
       * same rule, so the two places on the board agree.
       */
      opened: (() => {
        /* The lead's own optional row never dates the team's round: session 1 read "Mon 12 Oct", the day of her setup,
           for a round the team ran from 19 October (night quality run 1, problem 4). Nor does a session nobody answered. */
        const all = checkIns.filter((c) => c.sessionNumber === n && !wasAQuietClose(c))
        const theTeams = all.filter((c) => !c.optional && c.completedAt)
        const these = theTeams.length ? theTeams : all
        const completed = these.map((c) => c.completedAt).filter(Boolean)
        return completed.length
          ? completed.map((t: string) => new Date(t)).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0].toISOString()
          : null
      })(),
      /* The scheduled day this session opens, for a round nobody has started yet - said as
         "opens on", never confused with the date above, which is when it really did. */
      opensOn: (() => {
        const these = checkIns.filter((c) => c.sessionNumber === n)
        const times = these.map((c) => c.availableFrom).filter(Boolean)
        return times.length
          ? times.map((t: string) => new Date(t)).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0].toISOString()
          : null
      })(),
    }
  })
}
