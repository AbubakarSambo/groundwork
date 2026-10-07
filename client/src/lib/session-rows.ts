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
  /**
   * THE FULL ROSTER, WHEN `ground.participants` DOES NOT CARRY IT.
   *
   * `GET /grounds/:id` sends a participant only their own row, never anyone else's - so for a
   * participant, `ground.participants` has one entry even on a two-person check-in, where the
   * board's own answer (`GET /grounds/:id/board`) sends every party's name to everybody on it (the
   * lead is not a peer whose visibility this withholds, and a party's own name on a roster they are
   * already on is nothing new). Pass that list here, when it is to hand, and a restricted row counts
   * from it instead of the one-person list.
   *
   * Onboarding board review, 3 October: Tobi Adewale's four "Reports" rows read "1 of 1 checked
   * in" - true of the one row his own `ground.participants` carried, false of the check-in, which
   * has two people, both of whom answered every session (his own board said "Everybody has
   * answered this round."). Where no full roster is to hand (the check-in page's Report tab fetches
   * no board data), a restricted row draws no count at all, rather than the smaller, false one -
   * see `answered`/`total` turning `null` below.
   */
  fullParticipants?: { id: string; managingOnly?: boolean | null; notLetInYet?: boolean | null }[] | null,
  /**
   * SCREEN FAULT 9, PART 2: THE BOARD CALLED SOMEBODY BOTH "NOT ON ANY OF THESE SESSIONS" AND
   * "NOT YET CHECKED IN", FOR THE SAME SESSION.
   *
   * `whoIsInRound` counts anyone not managing-only and not held at the door as in EVERY round -
   * right for "whether this round's count should include them" once they are in it, but it has
   * no notion of when somebody joined, so a party added to the check-in after session `n` had
   * already run was still named in that round's own `waitingOn`. A missing check-in row at `n` is
   * not a safe test either: a row for an existing party who simply has not started `n` yet can be
   * just as absent (proven by session-rows.spec.ts's own "4 of 5... 2 of 5" case, Baraka and
   * Neema have no row at session 2 and are still correctly counted).
   *
   * The server's own grid (`checkInGrid.rows[].cells`, nine-columns-is-not-a-phone-screen.tsx)
   * already knows the true answer and says "na" for exactly this case - this is that same map,
   * participant id to the sessions they are actually on, passed in from where the board already
   * has it (BoardPage.tsx). `null`/absent when it is not to hand (every existing caller, and
   * every test of this file that predates it), in which case this falls back to `whoIsInRound`
   * alone, exactly as before.
   */
  onSessionFromGrid?: Map<string, Set<number>> | null,
): SessionRow[] {
  const everybody = (ground?.participants ?? []) as any[]
  const checkIns = (ground?.checkIns ?? []) as any[]
  const numbers = [...new Set(checkIns.filter((c) => !c.isSetup).map((c) => c.sessionNumber as number))]
    .filter((n) => checkIns.some((c) => c.sessionNumber === n && c.status === 'COMPLETED'))
    .sort((a, b) => b - a)

  return numbers.map((n) => {
    /* Who this round counts: a managing-only lead is in session 1 and not after. See who-is-in-this-round.
       Screen fault 9, part 2: and, when the server's own grid is to hand, only somebody actually on
       this session by it - see the parameter's own note above. */
    const parties = whoIsInRound(everybody, n, ground?.scenario)
      .filter((p) => !onSessionFromGrid || onSessionFromGrid.get(p.id)?.has(n))
    const fullParties = fullParticipants ? whoIsInRound(fullParticipants, n, ground?.scenario) : null
    /* `ground.participants` is restricted to the viewer's own row when it is shorter than the full
       roster the board sent for the same round - the only case this read can be too small. */
    const restricted = !!fullParties && fullParties.length > parties.length
    const closed = ((ground?.roundCompletions ?? []) as any[]).some((r) => r.sessionNumber === n)
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
      /*
       * A CLOSED ROUND MEANS EVERYBODY IN IT ANSWERED - that is what "closed" is (see
       * TheReportIsAListOfSessions.tsx's own note: "shared" and "closed" are the same fact, and a
       * round only closes once the server has every required account). So a restricted, closed
       * round can still say "N of N checked in" truthfully, with N the full roster's count - it is
       * only an OPEN round, restricted, where this reader cannot know how many of the others have
       * answered, and draws no count at all rather than guess at it.
       */
      answered: restricted ? (closed ? fullParties!.length : null) : parties.filter((p) => answeredIds.has(p.id)).length,
      total: restricted ? fullParties!.length : parties.length,
      closed,
      /* The reader is "you", never their own name (the wording rule); everybody else as labelled. */
      waitingOn: parties.filter((p) => !answeredIds.has(p.id)).map((p) => (p.userId && p.userId === userId ? 'you' : labelInASentence(p))),
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
        const these = checkIns.filter((c) => c.sessionNumber === n)
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
