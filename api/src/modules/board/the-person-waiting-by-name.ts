import { peersAreNamedOn } from '../reports/peers-are-named';
import { displayName } from '../reports/party-labels';
import { isEvaluationCheckIn, theSubjectOfAnEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';

/**
 * THE PERSON WAITING, SAID BY NAME, NEVER BY THEIR EMAIL ADDRESS (3 October 2026).
 *
 * Asked "where am I needed", Ask Groundwork answered "femi@baridi.test: waiting on you for the new price
 * list for Kilimani, 22 days." The waits across the organisation are matched person to person by email,
 * and nothing ever put a name beside the address, so the address was said where a name belongs.
 *
 * The name is the one every board uses: their sign-in's name, else the roster's, else the name they gave
 * at the end of an open link (`displayName`), with who they answered for where they said. It is said only
 * to a reader the check-in lets see it: whoever runs that check-in, anybody when it is the person who runs
 * it who is waiting, and otherwise only where the check-in names its people to each other
 * (`peersAreNamedOn`, which also keeps decision 17 for the person reviewed). Everybody else, and anybody
 * with no name at all, reads "somebody in <the check-in>". The address is never said.
 *
 * AN ADMIN OF THE ORGANISATION READS THE NAME TOO, in a check-in they are not in and where the people are not
 * named to each other (decision 93, row 1). Participants keep "somebody" where the lead set it so.
 */

/** What a wait carries about who is waiting, read once with the wait, before any reader is known. */
export interface WhoIsWaiting {
  /** Their name, or null where none is known. Never an address. */
  fromName: string | null;
  /** Whether the person waiting runs the check-in the wait was said in. */
  fromRunsIt: boolean;
  groundLabel: string;
  /** The check-in's own naming rule, and its people matched by address, so the reader's row can be found. */
  naming: {
    scenario?: any;
    peersVisibleToEachOther?: boolean | null;
    participants: { id: string; partyType: string; managingOnly?: boolean | null; createdAt?: Date | string | null; key: string | null; runsIt: boolean }[];
  };
}

/** A name for a participant row: sign-in, then the roster, then the name they gave. Never the address. */
export function aNameFor(
  p: { partyType?: any; nameGiven?: string | null; organisationGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null } | null | undefined,
  rosterName?: string | null,
): string | null {
  const roster = (rosterName ?? '').trim();
  const clean = (n: string | null) => (n && !/@/.test(n) ? n : null);
  if (!p) return clean(roster || null);
  const party = { id: '', partyType: p.partyType, user: p.user, organisationGiven: p.organisationGiven } as any;
  if (p.user?.firstName?.trim()) return clean(displayName(party));
  if (roster) return clean(displayName({ ...party, user: { firstName: roster } }));
  return clean(displayName({ ...party, nameGiven: p.nameGiven }));
}

/** "somebody in Sales team, Q3", or "a colleague" where the check-in has no title. */
export function somebodyIn(groundLabel: string | null | undefined): string {
  const label = (groundLabel ?? '').trim();
  return label ? `somebody in ${label}` : 'a colleague';
}

/**
 * Who is waiting, as this reader may read it. `readerKey` is the reader's address, the key the waits are
 * matched by. Lower case where the words are mid-sentence ("somebody in ..."); see `atTheStartOfASentence`.
 */
export function thePersonWaitingAsTheyRead(
  w: Partial<WhoIsWaiting> & { groundLabel?: string },
  readerKey: string | null | undefined,
  /** An admin of the organisation reads the name wherever the wait was said (decision 93, row 1). */
  opts: { readerIsAdmin?: boolean } = {},
): string {
  const none = somebodyIn(w.groundLabel);
  const name = (w.fromName ?? '').trim();
  if (!name || /@/.test(name)) return none;
  const key = (readerKey ?? '').toLowerCase();
  const people = w.naming?.participants ?? [];
  const reader = key ? people.find((p) => p.key === key) : undefined;
  /* An admin who is the person a review is about is still never told a colleague's name there (decision 17). */
  const theyAreWhoItIsAbout = !!reader && isEvaluationCheckIn(w.naming?.scenario)
    && theSubjectOfAnEvaluationCheckIn(people as any) === reader.id;
  if (opts.readerIsAdmin && !theyAreWhoItIsAbout) return name;
  /* Somebody in no part of that check-in reads nobody's name from it. */
  if (!reader) return none;
  if (reader.runsIt || w.fromRunsIt) return name;
  return peersAreNamedOn(w.naming as any, { participantId: reader.id }) ? name : none;
}

/** The first letter up, for a name or "somebody in ..." that starts a sentence. */
export function atTheStartOfASentence(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
