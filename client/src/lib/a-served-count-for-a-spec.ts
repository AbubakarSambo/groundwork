import type { WhoHasAnswered } from './the-one-count'

/**
 * A SERVED COUNT FOR A SPEC: the `answeredBySession` the server sends with a check-in, written out by hand for the people a spec's
 * fixture has. It holds no rule (the rule is the server's, checked in api reports/the-one-count-as-every-page-reads-it.spec.ts);
 * each spec says who the session counts and who has answered, as the server would serve it for its fixture.
 */
export function aServedCount(sessions: Record<number, { on: string[]; answered: string[]; notJoined?: string[]; declined?: string[]; notLetIn?: string[] }>): Record<number, WhoHasAnswered> {
  return Object.fromEntries(Object.entries(sessions).map(([n, s]) => [n, {
    sessionNumber: Number(n), onTheCheckIn: s.on, answered: s.answered, notYet: s.on.filter((id) => !s.answered.includes(id)),
    notJoined: s.notJoined ?? [], declined: s.declined ?? [], away: {}, notLetIn: s.notLetIn ?? [],
  }]))
}
