/**
 * MORE THAN ONE CHECK-IN OPEN ON WHATSAPP (decision 106 item 1, Hafsah's words).
 *
 * A reply to a check-in's opening message, or its Start button, goes straight to that check-in. When
 * several are open and the person just writes in, they are taken one at a time, the one closing soonest
 * first: "You have two check-ins open: <first> and <second>. Let's start with <first>." When one
 * finishes, the next is offered. Once in one, the person stays in it until they finish or write "switch".
 * The numbered list is only the last resort, when Groundwork genuinely cannot tell (after "switch").
 *
 * Pure: the sentences and the order. The service reads and writes.
 */

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A check-in's name as it is said in a sentence. */
export const named = (label: string) => `"${label}"`;

/** "A", "A and B", "A, B and C". */
export function inOneSentence(labels: string[]): string {
  const said = labels.map(named);
  if (said.length <= 1) return said[0] ?? '';
  return `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
}

/** The one closing soonest first; one with no closing date last; otherwise the order they came in. */
export function closingSoonestFirst<T extends { dueAt?: Date | string | null }>(open: T[]): T[] {
  const at = (c: T) => (c.dueAt ? new Date(c.dueAt).getTime() : Number.POSITIVE_INFINITY);
  return open.map((c, i) => ({ c, i })).sort((a, b) => at(a.c) - at(b.c) || a.i - b.i).map((x) => x.c);
}

/** "You have two check-ins open: "A" and "B". Let's start with "A"." */
export function oneAtATime(ordered: { label: string }[]): string {
  const n = ordered.length;
  const howMany = NUMBER_WORDS[n] ?? String(n);
  return `You have ${howMany} check-ins open: ${inOneSentence(ordered.map((c) => c.label))}. Let's start with ${named(ordered[0].label)}.`;
}

/** Said after one finishes, when another is still open. */
export function theNextOne(next: { label: string }): string {
  return `You also have ${named(next.label)} open. Reply START when you are ready to begin it.`;
}
