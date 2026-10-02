/**
 * EACH SESSION'S INFERENCES ARE ITS OWN (screens request 102, 2 October 2026).
 *
 * `Report.inferences` held one list: the claims the latest synthesis concluded rather than heard. Each
 * synthesis overwrote it, so a closed session's own report page could only reach for the latest list,
 * and session 1's page, closed on 27 September, showed what session 2 had concluded.
 *
 * Now each item carries the session it was concluded in (`sessionNumber`), and a synthesis replaces
 * only the items of the session the report holds now. Earlier sessions' items are kept as they were,
 * frozen at the round they were built for, the way a round's picture is kept in `ReportRound`. The
 * column keeps its shape (an array of items), so a clarification still finds an item by its id.
 *
 * A list written before this has no `sessionNumber` on its items. Those items belong to the session
 * the report held when it was last written, which the caller works out from the record.
 */

export interface AnInference {
  id: string;
  text: string;
  participantLabel?: string;
  reason?: string;
  sessionNumber?: number;
  [k: string]: unknown;
}

const asList = (v: unknown): AnInference[] =>
  (Array.isArray(v) ? v : []).filter((x: any) => x && typeof x === 'object' && typeof x.id === 'string') as AnInference[];

/**
 * What to store: the earlier sessions' items as they were, and this synthesis's items for the session
 * the report holds now. An earlier item whose id the new list also uses is kept under a new id, so a
 * clarification asked about either finds the right one.
 */
export function keptWithEachSessionsOwn(
  stored: unknown,
  fresh: unknown,
  holds: number,
  storedWithoutASessionBelongTo: number,
): AnInference[] {
  const now = asList(fresh).map((i) => ({ ...i, sessionNumber: holds }));
  const taken = new Set(now.map((i) => i.id));
  const earlier = asList(stored)
    .map((i) => ({ ...i, sessionNumber: typeof i.sessionNumber === 'number' ? i.sessionNumber : storedWithoutASessionBelongTo }))
    .filter((i) => i.sessionNumber < holds)
    .map((i) => (taken.has(i.id) ? { ...i, id: `s${i.sessionNumber}-${i.id}` } : i));
  return [...earlier, ...now];
}

/**
 * One session's own items. An item with no session is the latest list, written before items carried
 * one, so it belongs only to the session the report holds now; an earlier session that was never
 * kept has none, rather than a later session's.
 */
export function theInferencesOfSession(stored: unknown, sessionNumber: number, holds: number): AnInference[] {
  return asList(stored).filter((i) => (typeof i.sessionNumber === 'number' ? i.sessionNumber === sessionNumber : sessionNumber === holds));
}
