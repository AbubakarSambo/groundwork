/**
 * WHO HAS ANSWERED EACH SESSION, AS THE SERVER COUNTED IT (Hafsah, 1 November 2026: "who has answered is counted in one place, and
 * every page reads it").
 *
 * The server counts in one function (api reports/how-many-have-answered.ts, whoHasAnswered) and serves it on every check-in, the
 * list and the board in one shape, `theCount` (api grounds/the-count-as-served.ts), over the people the reader may see. Nobody's leave is in it: somebody on leave is simply not counted, and who
 * is away is served once, shaped for each reader (api suites/who-is-away.ts). Every page reads it from here and counts nothing itself: the page's own
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
  /** Not counted: an admin has not let them in, and they have not answered. */
  notLetIn: string[]
}

/**
 * THE ONE COUNT AS SERVED (api grounds/the-count-as-served.ts): the session the check-in's clock names, who has answered each
 * session, and the clock's session in sentences, only for a reader who is shown the others (null for anybody else).
 */
export interface TheCountAsServed {
  session: number
  bySession: Record<string | number, WhoHasAnswered>
  said: {
    /** "Three of the five people have checked in for session 2.", then who, then who is not counted. */
    says: string
    /** Each person counted, once, by name. */
    whoSays: string | null
    notJoinedSays: string | null
    notCountedSays: string | null
    everyoneIn: boolean
    /** Somebody other than the reader has answered the clock's session. */
    othersHaveAnswered: boolean | null
  } | null
}

const served = (ground: unknown): TheCountAsServed | null => (ground as { theCount?: TheCountAsServed | null } | null | undefined)?.theCount ?? null

/** The served count of one session, or null where the server served none. */
export function theCountOf(ground: unknown, sessionNumber: number | null | undefined): WhoHasAnswered | null {
  return served(ground)?.bySession?.[sessionNumber ?? 1] ?? null
}

/** The clock's session and its sentences, for a reader shown the others; null for anybody else, or where none was served. */
export function theClocksSessionSaid(ground: unknown): (NonNullable<TheCountAsServed['said']> & { session: number; answered: number }) | null {
  const c = served(ground)
  if (!c?.said) return null
  return { ...c.said, session: c.session, answered: theCountOf(ground, c.session)?.answered.length ?? 0 }
}

/** The people the session counts, in the order given, read from the served count. */
export function whoTheSessionCounts<T extends { id?: string }>(people: T[] | null | undefined, ground: unknown, sessionNumber: number | null | undefined): T[] {
  const on = new Set(theCountOf(ground, sessionNumber)?.onTheCheckIn ?? [])
  return (people ?? []).filter((p) => !!p.id && on.has(p.id))
}
