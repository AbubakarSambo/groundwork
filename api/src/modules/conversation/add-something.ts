/**
 * ADD SOMETHING, ANY TIME (Hafsah, after polish round 3, 26 October 2026).
 *
 * Between check-ins a person can add something: the "Add something" button on the web and the phone, and any message on WhatsApp. It goes
 * into the record the same way an answer does, so it is filed against the right deal, person or promise and appears on the board where it
 * belongs. It is not a private note: those stay as they are (between-session-notes.ts), and nothing typed in Ask reaches the record.
 *
 * HOW. What they add is an answer in their check-in. If one is open, it goes straight in. If not, their next check-in opens now, with
 * "What would you like to add?" as its first line, and what they added is the first answer. Groundwork takes it, says where it goes, and
 * asks at most two follow-ups for what the board needs (a-short-day.ts), then closes.
 */
export const WHAT_WOULD_YOU_LIKE_TO_ADD = 'What would you like to add?';

export const ADD_SOMETHING_REFUSED = {
  empty: 'Write what you want to add first.',
  notInIt: 'You are not in this check-in, so nothing can be added to it here.',
  nothingToAddTo: 'This check-in has no session open or coming up to add to.',
} as const;

/** Their check-in to add to: the one open, else the next one waiting, else none. */
export function theCheckInToAddTo<T extends { id: string; status: string; sessionNumber: number }>(theirs: readonly T[]): T | null {
  const open = theirs.filter((c) => c.status === 'IN_PROGRESS').sort((a, b) => b.sessionNumber - a.sessionNumber)[0];
  if (open) return open;
  return theirs.filter((c) => c.status === 'NOT_STARTED').sort((a, b) => a.sessionNumber - b.sessionNumber)[0] ?? null;
}
