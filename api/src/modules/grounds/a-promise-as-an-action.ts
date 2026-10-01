/**
 * A PROMISE, WRITTEN AS AN ACTION (C2 the You board, E8 to-dos; group 2's review, fault B).
 *
 * A commitment is kept in the person's own words, because that is what they said in their check-in:
 * "I will file the bundle", "I'll call her back", "I am going to send them the price list". Read back
 * as a to-do - on the To-dos board (suites/the-todos.service.ts) and "What you said you'd do" on the
 * You board (grounds/your-board.ts) - it should read as an action, the way the prototype's own to-dos
 * do ("Visit Westgate Deli on Friday", suite-todos.txt): no leading "I will"/"I'll"/"I am going to",
 * and a capital first letter. Nothing else about the words changes - no full stop is added, because
 * CLAUDE.md's "plain, full sentences" is about what a person reads as prose, and a to-do already reads
 * as one action, the same way the prototype's own to-dos carry no trailing full stop either.
 */
const LEADING_I_WILL = /^i\s*['’]?ll\b\s*|^i\s+will\b\s*|^i\s*am\s+going\s+to\b\s*/i;

export function asAnAction(text: string | null | undefined): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return trimmed;
  const stripped = trimmed.replace(LEADING_I_WILL, '');
  if (!stripped) return stripped;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * A GOAL, WRITTEN AS A SENTENCE (fault A). What is expected of a person is written by a lead or an
 * admin, in their own words ("I want it at 162,000 by December.") or a short field ("shops") built
 * into a line by goalFromTarget. Either way, a reader sees a capital first letter and a stop at the
 * end - the fragment is fixed, never the words a person chose.
 */
export function asASentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}
