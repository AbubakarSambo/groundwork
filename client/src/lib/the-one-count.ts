/**
 * WHO HAS ANSWERED EACH SESSION, AS THE SERVER COUNTED IT (Hafsah, 1 November 2026: "who has answered is counted in one place, and
 * every page reads it").
 *
 * The server counts in one function (api reports/how-many-have-answered.ts, whoHasAnswered) and serves it on every check-in as
 * `answeredBySession`, over the people the reader may see. Every page reads it from here and counts nothing itself: the page's own
 * copy of the rule (who-is-in-this-round.ts) is gone. A session the server served no count for has nobody counted on it.
 */
export interface WhoHasAnswered {
  sessionNumber: number
  /** Everybody this session counts, in row order: the "6" of "5 of 6". */
  onTheCheckIn: string[]
  /** Of them, who has answered (a decline included): the "5". */
  answered: string[]
  /** Of them, who has not answered yet and whose session is still open. */
  notYet: string[]
  /** Of them, who was invited and has not joined yet. */
  notJoined: string[]
  /** Of them, who answered by declining. */
  declined: string[]
  /** Not counted: on approved leave and not answered, with the last day of it. */
  away: Record<string, string>
  /** Not counted: an admin has not let them in, and they have not answered. */
  notLetIn: string[]
}

/** The served count of one session, or null where the server served none. */
export function theCountOf(ground: unknown, sessionNumber: number | null | undefined): WhoHasAnswered | null {
  const served = (ground as { answeredBySession?: Record<string | number, WhoHasAnswered> } | null | undefined)?.answeredBySession
  return served?.[sessionNumber ?? 1] ?? null
}

/** The people the session counts, in the order given, read from the served count. */
export function whoTheSessionCounts<T extends { id?: string }>(people: T[] | null | undefined, ground: unknown, sessionNumber: number | null | undefined): T[] {
  const on = new Set(theCountOf(ground, sessionNumber)?.onTheCheckIn ?? [])
  return (people ?? []).filter((p) => !!p.id && on.has(p.id))
}
