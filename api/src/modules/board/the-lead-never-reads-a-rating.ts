import type { Ranked, Reason } from './where-each-person-is-against-their-number';

/**
 * THE LEAD NEVER READS HOW A PERSON'S ANSWERS WERE RATED (CLAUDE.md, privacy).
 *
 * "Where each person is" gives each row one reason. One of them, "nothing checkable", is worked out
 * from the rating of how checkable a person's answers were (`specificityLevel`,
 * `specificityDimensions`). U.8 stopped that rating reaching anyone but the person. The board still
 * turned it into a sentence for the lead, so the lead could read it by another route.
 *
 * The rule that ranks the rows belongs to the engine (request 8 asks it to say what is missing from
 * the record instead). Until then, the board does not serve that reason: the row reads as if the
 * reason did not exist, and it is placed exactly where it would be placed if it had never been
 * worked out, so the order of the list cannot give the rating away either.
 */
const SERVED_ORDER: Reason[] = ['has not answered', 'stuck and not chasing', 'behind the pace', 'nothing to do'];

export function withoutTheRating<T extends Pick<Ranked, 'reason' | 'who' | 'nameIsTheirRole'>>(rows: T[]): T[] {
  return rows
    .map((r) => (r.reason === 'nothing checkable' ? { ...r, reason: 'nothing to do' as Reason } : r))
    .sort((a, b) => {
      const byReason = SERVED_ORDER.indexOf(a.reason) - SERVED_ORDER.indexOf(b.reason);
      if (byReason !== 0) return byReason;
      if (!!a.nameIsTheirRole !== !!b.nameIsTheirRole) return a.nameIsTheirRole ? 1 : -1;
      return a.who.localeCompare(b.who);
    });
}
