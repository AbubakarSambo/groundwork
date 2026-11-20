import { forThesePeople, type TheServedCount } from '../reports/how-many-have-answered';
import type { ThisSession } from './this-sessions-count';

/**
 * THE ONE COUNT, AS ONE READER IS SERVED IT (F1 part 2, 3 November 2026). Two copies of one count went out: `answeredBySession` (who
 * has answered each session, whoHasAnswered over every session) and `thisSession` (the clock's session, counted again by
 * theCountOfASession, with its sentences). The list, the check-in page and the board each served both, and each page read the one
 * it happened to have. Now one shape goes out, `theCount`, and every page reads it (client/src/lib/the-one-count.ts):
 *
 *   session    the session the check-in's clock names;
 *   bySession  who is counted and who has answered, for every session, over the people this reader may see;
 *   said       the clock's session in sentences ("Three of the five people have checked in for session 2.", then who), only for a
 *              reader who is shown the others. A reader walled from the others gets their own row in `bySession` and no sentence.
 *
 * Nothing of anybody's leave is in it: somebody on leave is simply not counted (386f22341). Who is away is served once, shaped for each
 * reader, by theRoundAsServed (suites/who-is-away.ts), its other half.
 */
export interface TheCountAsServed {
  session: number;
  /** How many sessions the check-in plans (thePlannedSessionsOf, the one owner), or null while it runs until somebody ends it. Every page
      reads this rather than working it out again (round 50: 51 on one page and 103 on another for the same check-in). */
  planned: number | null;
  bySession: Record<number, TheServedCount>;
  said: Pick<ThisSession, 'says' | 'whoSays' | 'notJoinedSays' | 'notCountedSays' | 'everyoneIn' | 'othersHaveAnswered'> | null;
}

export function theCountAsServed(
  clock: { session: number; said: ThisSession | null; planned?: number | null },
  bySession: Record<number, TheServedCount> | null | undefined,
  /** `onlyThese`: the people a reader walled from the others may see (their own row). Null: they are shown everybody. */
  reader: { onlyThese: ReadonlySet<string> | null },
): TheCountAsServed {
  const all = bySession ?? {};
  const s = clock.said;
  return {
    session: clock.session,
    planned: clock.planned ?? null,
    bySession: reader.onlyThese ? forThesePeople(all, reader.onlyThese) : all,
    said: reader.onlyThese || !s
      ? null
      : { says: s.says, whoSays: s.whoSays, notJoinedSays: s.notJoinedSays, notCountedSays: s.notCountedSays, everyoneIn: s.everyoneIn, othersHaveAnswered: s.othersHaveAnswered },
  };
}

/** The clock's session as counted in the served shape: everybody counted, and who of them has answered. Null where none was served. */
export function theClocksSessionIn(c: TheCountAsServed | null | undefined): TheServedCount | null {
  return c ? c.bySession?.[c.session] ?? null : null;
}
