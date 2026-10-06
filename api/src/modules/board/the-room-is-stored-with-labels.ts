import type { TheRoomServed } from './the-room-as-each-reader-reads-it';

/**
 * WHAT THE ROOM IS ABOUT IS STORED WITH LABELS, AND NAMES GO IN ONLY WHEN IT IS SERVED (decision 110, P9).
 *
 * The room's read was stored with every person's full name, outside the rule reports follow: a stored report holds "the initiator" and
 * "participant A", and names are put in only at the read, for the readers entitled to them, through the wrapper that also handles
 * anonymous sharing. So a stored room cannot give a name away wherever it is copied. Now the model is given labels where it was given names, it
 * answers in labels, and the room is stored with them. `theRoomWithNames` puts the names back at the read, before the board's own walls run, so
 * every wall (decision 75 item 14, decision 17, "you") works on names exactly as it did.
 *
 * ROWS STORED BEFORE THIS HOLD NAMES AND ARE LEFT AS THEY ARE: a name is not one of the check-in's labels, so nothing in it is changed. No
 * stored row is rewritten.
 */
/** The label a person is stored under in the room: made from their row id, so it never holds a name or the lead's description of them, and does not move. */
export const theRoomsLabelFor = (participantId: string): string => `person-${participantId}`;

const A_LABEL = /^person-/;

/** The room as it is read: each label, where there is one, as the person's full name, so the walls and the reader's own "you" work as before. A label nobody holds a name for (somebody with no name on their row) is left out, as such a person always was: a label is never served. */
export function theRoomWithNames<T extends TheRoomServed | null | undefined>(room: T, nameOfLabel: ReadonlyMap<string, string>): T {
  if (!room) return room;
  const swap = (list: unknown): string[] =>
    Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').flatMap((x) => (nameOfLabel.has(x) ? [nameOfLabel.get(x)!] : A_LABEL.test(x) ? [] : [x])) : [];
  const r = room as TheRoomServed;
  return {
    ...r,
    ...(Array.isArray(r.aims) ? { aims: r.aims.map((a) => ({ ...a, held: swap(a.held) })).filter((a) => a.held.length) } : {}),
    ...(Array.isArray(r.places) ? { places: r.places.map((p) => ({ ...p, named: swap(p.named) })).filter((p) => p.named.length) } : {}),
    ...(Array.isArray(r.things) ? { things: r.things.map((t) => ({ ...t, named: swap(t.named) })).filter((t) => t.named.length) } : {}),
  } as T;
}
