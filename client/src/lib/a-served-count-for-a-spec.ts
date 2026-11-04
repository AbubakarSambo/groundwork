import type { TheCountAsServed, WhoHasAnswered } from './the-one-count'

/**
 * A SERVED COUNT FOR A SPEC: the `theCount` the server sends with a check-in, the list and the board (api grounds/the-count-as-served.ts),
 * written out by hand for the people a spec's fixture has. It holds no rule (the rule is the server's, checked in api
 * reports/the-one-count-as-every-page-reads-it.spec.ts); each spec says who the session counts and who has answered, as the server
 * would serve it for its fixture, and, for a reader shown the others, the clock's session in sentences (`said`).
 */
export function aServedCount(
  sessions: Record<number, { on: string[]; answered: string[]; notJoined?: string[]; declined?: string[]; notLetIn?: string[] }>,
  said: (Partial<NonNullable<TheCountAsServed['said']>> & { session?: number; says: string }) | null = null,
): TheCountAsServed {
  const bySession: Record<number, WhoHasAnswered> = Object.fromEntries(Object.entries(sessions).map(([n, s]) => [n, {
    sessionNumber: Number(n), onTheCheckIn: s.on, answered: s.answered, notYet: s.on.filter((id) => !s.answered.includes(id)),
    notJoined: s.notJoined ?? [], declined: s.declined ?? [], notLetIn: s.notLetIn ?? [],
  }]))
  const session = said?.session ?? Math.max(1, ...Object.keys(sessions).map(Number))
  return {
    session,
    bySession,
    said: said
      ? { says: said.says, whoSays: said.whoSays ?? null, notJoinedSays: said.notJoinedSays ?? null, notCountedSays: said.notCountedSays ?? null, everyoneIn: !!said.everyoneIn, othersHaveAnswered: said.othersHaveAnswered ?? null }
      : null,
  }
}
