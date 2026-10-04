import { withoutSentencesAboutOneOfThem } from '../reports/one-persons-circumstances-stay-their-own';

/**
 * WHAT THE ROOM IS ABOUT, WHERE PEOPLE DO NOT SEE EACH OTHER (decision 75, item 14).
 *
 * The room's read is stored on the check-in with people's names, and the report's wall for a person in a check-in
 * where people do not see each other (`onlyCountsAndPatternsAboutTheOthers`) never ran over it, because it is not
 * part of the report. So on a check-in with the people kept apart, once the team's picture was shared, a borrower
 * read "Musa Danjuma wants the grinding machine he was promised to be delivered.", held by `["Musa Danjuma"]`, and
 * Kaduna and the tricycle each named by one other borrower.
 *
 * The same wall as the report's: the reader's own rows stay, and so do rows held or named by several people, which
 * are a pattern across the group, and rows the lead holds, since the lead is named to everybody. A row held or named
 * by one other person alone is that person's circumstance and goes. In the rows that stay, the other people's names
 * go from the lists and are said as a count (`andOthers`), and a sentence that names one of them goes from the aim.
 *
 * Applied to the room as stored, with full names, before it is said to the reader ("You").
 */

export interface TheRoomStored {
  aims?: { aim: string; held: string[] }[];
  places?: { name: string; named: string[] }[];
  things?: { name: string; named: string[] }[];
  [k: string]: unknown;
}

export interface WhoIsWho {
  /** The reader's full name as the room stores it. */
  reader: string | null;
  /** The lead's full name as the room stores it, or null. */
  lead: string | null;
  /** Every other person's names, full, first and last, as a sentence might say them. */
  otherNames: string[];
  /**
   * An evaluation check-in (decision 17): only a person's NAME is kept from the person reviewed, so a sentence goes only where it names one of
   * the others. "Know how a team member is doing" is the lead's aim and stays; without this its "a team member" read as one colleague.
   */
  namesOnly?: boolean;
}

const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function theRoomWithoutOneOfTheOthers<T extends TheRoomStored | null | undefined>(room: T, who: WhoIsWho): T {
  if (!room || typeof room !== 'object') return room;
  const split = (people: unknown) => {
    const list = Array.isArray(people) ? (people as unknown[]).filter((p): p is string => typeof p === 'string' && !!p.trim()) : [];
    const kept = list.filter((p) => same(p, who.reader) || same(p, who.lead));
    return { kept, others: list.length - kept.length };
  };
  /* Kept when it is the reader's, the lead's, or several people's. */
  const keeps = (kept: string[], others: number) => kept.length > 0 || others >= 2;

  const aims = Array.isArray(room.aims)
    ? room.aims.flatMap((a) => {
      const { kept, others } = split(a?.held);
      if (!keeps(kept, others)) return [];
      const aim = typeof a?.aim === 'string' ? withoutSentencesAboutOneOfThem(a.aim, { names: who.otherNames }, { namesOnly: !!who.namesOnly }) : '';
      if (!aim.trim()) return [];
      return [{ ...a, aim, held: kept, ...(others ? { andOthers: others } : {}) }];
    })
    : room.aims;
  const listed = <R extends { named: string[] }>(rows: R[] | undefined) =>
    Array.isArray(rows)
      ? rows.flatMap((r) => {
        const { kept, others } = split(r?.named);
        if (!keeps(kept, others)) return [];
        return [{ ...r, named: kept, ...(others ? { andOthers: others } : {}) }];
      })
      : rows;
  return { ...room, aims, places: listed(room.places), things: listed(room.things) } as T;
}
