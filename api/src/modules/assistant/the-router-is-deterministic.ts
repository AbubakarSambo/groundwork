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
  | 'what_did_i_commit_to'
  | 'how_we_work'
  | 'what_did_i_say'
  | 'how_am_i_doing'
  | 'what_is_stuck'
  | 'unplaced';

export interface Routed {
  lane: Lane;
  /**
   * What the question is ABOUT, with the question words removed.
   *
   * For `who_is` it is the name. For `how_we_work` it is the topic, and there it is not a
   * convenience: retrieval scores a phrase against a card, and "how do I swap" carries no meaning
   * while dragging the score down. Searching the whole sentence failed to match "swap oncall" to a
   * card titled "The on-call rota" - found by asking it.
   */
  subject?: string;
}

const rule = (lane: Lane, patterns: RegExp[]) => ({ lane, patterns });

/**
 * Ordered, and the order is a decision. "What can you see about Naomi" is a question about Naomi,
 * not about the connection - so the more specific lane is matched first, and a rule that would
 * swallow it sits below.
 */
const RULES = [
  rule('what_is_stuck', [
    /*
     * ABOVE BOTH `who_is` AND THE COACHING LANE, and driving it is how that was found. "Who is
     * waiting on me" begins with "who is", so the directory lane matched it first and answered a
     * question about a handoff by looking somebody up. Unit tests did not catch it because each
     * lane's own patterns were right - only the order between them was wrong, which is a thing
     * only the assembled router can be asked about.
     *
     * It also sits above coaching, because "I'm stuck" and "what am I waiting on" want different
     * answers - the first a step, the second a name and a number of days.
     */
    /\bwhat\s+(?:am\s+i|are\s+we)\s+waiting\s+on\b/i,
    /\bwho\s+is\s+waiting\s+on\s+me\b/i,
    /\bwhat'?s?\s+(?:blocked|stuck|held\s+up)\b/i,
    /\bwhat\s+is\s+(?:blocked|stuck)\b/i,
  ]),
  rule('who_is', [
    /\bwho(?:'s| is)\s+(.+?)\s*\??$/i,
    /\bwho\s+does\s+(.+?)\s+report\s+to\s*\??$/i,
    /\bwho\s+reports\s+to\s+(.+?)\s*\??$/i,
  ]),
  /*
   * LAST OF THE MATCHERS, ON PURPOSE. "How do we..." is the broadest shape here and would otherwise
   * swallow questions the specific lanes own. Its own rules stay narrow for the same reason.
   */
  rule('how_am_i_doing', [
    /*
     * Above the recall lane, because "how am I doing" is not a question about what they said. Both
     * shapes go here - the flat question and the stuck one - since the coach's answer to either is
     * the same single step.
     */
    /\bhow\s+am\s+i\s+doing\b/i,
    /\bi'?m\s+stuck\b/i,
    /\bhow\s+do\s+i\s+get\s+better\b/i,
    /\bwhat\s+should\s+i\s+(?:work on|focus on)\b/i,
  ]),
  rule('what_did_i_say', [
    /*
     * Above the commitment lane, because "what did I say about the vendor" is a question about the
     * conversation and "what did I say I would do" is a question about commitments - and the second
     * rule would take both if it went first.
     */
    /\bwhat\s+did\s+i\s+say\s+about\s+(.+)/i,
    /\bdid\s+i\s+(?:mention|tell you about|say anything about)\s+(.+)/i,
    /\bhave\s+we\s+(?:talked|spoken)\s+about\s+(.+)/i,
    /\bremind\s+me\s+(?:what|about)\s+(.+)/i,
  ]),
  rule('what_did_i_commit_to', [
    /* Ordered above `what_am_i_on` because "what did I commit to" contains "what did I" and the
       objectives rule would otherwise take it. */
    /\bwhat\s+did\s+i\s+(?:commit|say|promise)\b/i,
    /\bmy\s+commitments?\b/i,
    /\bwhat\s+have\s+i\s+committed\b/i,
    /\bwhat\s+did\s+i\s+agree\s+to\b/i,
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
  /*
   * LAST, ON PURPOSE. "How do we..." is the broadest shape here, and above the others it would
   * swallow questions they own - "how do I get on with my objectives" is not a handbook question.
   * Its own patterns stay narrow for the same reason.
   */
  rule('how_we_work', [
    /\bhow\s+do\s+(?:we|i)\s+(.{3,})/i,
    /\bwhat(?:'s| is)\s+(?:our|the)\s+(?:policy|process|rule)\b/i,
    /\bwhere\s+do\s+i\s+(?:find|go|put)\b/i,
    /\bam\s+i\s+allowed\s+to\b/i,
  ]),
];

export function route(input: string): Routed {
  const text = (input ?? '').trim();
  if (!text) return { lane: 'unplaced' };

  for (const r of RULES) {
    for (const p of r.patterns) {
      const m = p.exec(text);
      if (m) {
        /* Group one is the topic wherever a pattern captures it; lanes that need no subject ignore it. */
        const subject = (m[1] ?? '').trim().replace(/[?.!]+$/, '');
        return subject ? { lane: r.lane, subject } : { lane: r.lane };
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
