/**
 * WHAT SOMEBODY IS DOING IS NOT AN AIM (reviewer, 14 October).
 *
 * Grace, setting up Sales daily, said "Kilele is close, Greenfield is slower." The extraction kept an aim named
 * "Grace is working on the Kilele account." Her own Context page then read it about her in the third person,
 * Kevin's 40 units at Kilele Hotel landed on it, and the deal was Kevin's, not hers. A sentence saying who is
 * working on what, with no number to reach, says what somebody does; it is not something to reach. It is not
 * kept as an aim. An aim with a number ("Close 300 units") or with no person in it is kept as before.
 */
const SOMEBODY_IS_DOING = /^\s*(?:i|we|you|he|she|they|[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,2})\s+(?:is|are|am|was|were|has\s+been|have\s+been)\s+(?:working\s+on|handling|looking\s+after|managing|following\s+up\s+on|in\s+charge\s+of|responsible\s+for)\b/u;

export function isWhatSomebodyDoesNotAnAim(a: { name: string; target: number | null }): boolean {
  if (a.target != null) return false;
  return SOMEBODY_IS_DOING.test(a.name ?? '');
}
