/**
 * THE ROUTER IS RULES. THE MODEL COMPOSES LANGUAGE AND NEVER DRIVES A WRITE.
 *
 * Intent is decided here, in code that can be read and tested without a model call, and the lane it
 * picks is what decides whether anything happens. A model that could choose the lane could be
 * talked into choosing one - and every piece of text reaching it arrives from a customer's own
 * systems, which is exactly the carrier an injection needs.
 *
 * WHAT THIS IS NOT: an attempt at understanding. It is a small set of confident matches and an
 * honest default. The default is the important half.
 */

export type Lane =
  | 'what_you_can_see'
  | 'what_am_i_on'
  | 'who_is'
  | 'unplaced';

export interface Routed {
  lane: Lane;
  /** For `who_is`, the name or id being asked about. */
  subject?: string;
}

const rule = (lane: Lane, patterns: RegExp[]) => ({ lane, patterns });

/**
 * Ordered, and the order is a decision. "What can you see about Naomi" is a question about Naomi,
 * not about the connection - so the more specific lane is matched first, and a rule that would
 * swallow it sits below.
 */
const RULES = [
  rule('who_is', [
    /\bwho(?:'s| is)\s+(.+?)\s*\??$/i,
    /\bwho\s+does\s+(.+?)\s+report\s+to\s*\??$/i,
    /\bwho\s+reports\s+to\s+(.+?)\s*\??$/i,
  ]),
  rule('what_am_i_on', [
    /\bwhat\s+am\s+i\s+(?:on|working on|assigned)\b/i,
    /\bwhat(?:'s| is)\s+(?:on\s+)?my\s+(?:plate|work|objectives?)\b/i,
    /\bmy\s+objectives?\b/i,
    /\bwhat\s+do\s+i\s+owe\b/i,
  ]),
  rule('what_you_can_see', [
    /\bwhat\s+(?:can\s+you|do\s+you)\s+see\b/i,
    /\bwhat(?:'s| is)\s+connected\b/i,
    /\bhow\s+current\b/i,
    /\bwhat\s+would\s+you\s+connect\b/i,
  ]),
];

export function route(input: string): Routed {
  const text = (input ?? '').trim();
  if (!text) return { lane: 'unplaced' };

  for (const r of RULES) {
    for (const p of r.patterns) {
      const m = p.exec(text);
      if (m) {
        return r.lane === 'who_is'
          ? { lane: 'who_is', subject: (m[1] ?? '').trim() }
          : { lane: r.lane };
      }
    }
  }
  return { lane: 'unplaced' };
}

/**
 * NEVER FAIL INTO A SHRUG.
 *
 * "I did not understand that" is where somebody stops coming back. An unplaced input is still
 * information, and discarding it teaches people to stop typing - so the answer says what CAN be
 * done with what they said rather than reporting a failure to parse it.
 *
 * Deliberately not an apology. The person did nothing wrong; the tool is young.
 */
export function whatICanDoWith(input: string): { line: string; options: { key: string; label: string }[] } {
  const trimmed = (input ?? '').trim();
  const short = trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
  return {
    line: trimmed
      ? `I cannot answer that one yet. Here is what I can do with "${short}".`
      : 'Ask me something, or pick one of these.',
    options: [
      { key: 'what_you_can_see', label: 'Tell me what you can see' },
      { key: 'what_am_i_on', label: 'What am I on?' },
      { key: 'hold_it', label: 'Hold this against my next check-in' },
    ],
  };
}
