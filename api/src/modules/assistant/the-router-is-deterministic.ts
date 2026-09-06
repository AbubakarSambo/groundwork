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
  | 'where_am_i_needed'
  | 'what_is_stuck'
  | 'where_am_i_up_to'
  | 'what_should_we_talk_about'
  | 'what_came_of_it'
  | 'set_an_objective'
  | 'start_a_check_in'
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
  rule('start_a_check_in', [
    /*
     * ABOVE `set_an_objective`, because "set up a check-in about our objectives" is a request to
     * start a session and reads to that lane as a request to write an objective. The more specific
     * thing somebody named is the thing they asked for.
     *
     * Narrow, like the objective lane and for the same reason: it starts something. It owns the
     * shapes that name a CHECK-IN or a session, and nothing that merely mentions one.
     */
    /*
     * ASKING FOR IT IS NOT ASKING ABOUT IT, and one word separates them. "How do I run a check-in"
     * is a question about how this product works and belongs to `how_we_work`; this lane would have
     * taken it and started one instead. Caught by the guard that pins those two next to each other,
     * which is what that guard is for.
     */
    /^(?!.*\bhow\s+(?:do|does|did|to|can|should)\b).*\b(?:start|begin|open|set\s+up|kick\s+off|run)\s+(?:my|our|the|a|this)?\s*(?:check[\s-]?in|session|ground|round)\b/i,
    /^(?!.*\bhow\s+(?:do|does|did|to|can|should)\b).*\b(?:check[\s-]?in|session)\s+(?:set\s+up\s+)?for\s+me\b/i,
    /\bready\s+to\s+(?:start|begin)\s+(?:my|our|the)?\s*check[\s-]?in\b/i,
    /\bcan\s+i\s+(?:start|do|take)\s+(?:my|our|the)?\s*check[\s-]?in\b/i,
  ]),

  rule('set_an_objective', [
    /*
     * FIRST, AND NARROW.
     *
     * First because it is the only lane that starts a piece of work rather than
     * answering a question about one, and "I want to set an objective for the
     * quarter" reads to three lanes below as a question about the quarter. The
     * person is not asking what exists; they are asking to make something.
     *
     * Narrow because the cost of a false positive is high: it opens a draft and
     * starts asking questions, which is intrusive in a way that a wrong answer
     * is not. It owns the shapes that explicitly ask to SET one, and nothing
     * that merely mentions objectives.
     */
    /\b(?:set|write|create|start|draft|agree)\s+(?:up\s+)?(?:an?|our|my|the|some)?\s*(?:new\s+)?(?:objectives?|okrs?|goals?|targets?)\b/i,
    /\bhelp\s+(?:me|us)\s+(?:to\s+)?(?:set|write|agree|work\s+out)\b.*\b(?:objectives?|okrs?|goals?|targets?)\b/i,
    /\b(?:objective|okr|goal)\s+setting\b/i,
  ]),
  rule('where_am_i_up_to', [
    /*
     * Above the handoff and coaching lanes. "What am I meant to be doing" from somebody in their
     * first fortnight is a question about their onboarding, not about a stuck handoff or a coaching
     * step - and answering it with either would be answering a question they did not ask at the
     * moment they are least able to tell.
     */
    /\bwhat(?:'?s| is| are)?\s+(?:still\s+)?(?:left|outstanding)\b/i,
    /\bam\s+i\s+(?:set\s+up|onboarded|done\s+setting\s+up)\b/i,
    /\bwhere\s+am\s+i\s+up\s+to\b/i,
    /\bmy\s+onboarding\b/i,
    /\bwhat\s+is\s+my\s+role\b/i,
  ]),
  rule('what_came_of_it', [
    /*
     * ABOVE `what_did_i_commit_to`, and the distinction it turns on is "we" against "I". That lane
     * owns "what did I agree to" - a question about this person's own commitments - and this one
     * owns "what did we agree", which is a question about what a check-in produced. The two read
     * almost identically and mean different things, so the narrower pronoun wins and both patterns
     * are pinned in tests next to each other.
     */
    /\bwhat\s+came\s+(?:out\s+)?of\s+(?:the|our|that|my|it)\b/i,
    /\bwhat\s+did\s+we\s+(?:agree|decide|conclude|settle)\b/i,
    /\bwhat\s+(?:happened|came\s+out)\s+(?:in|of|from)\s+(?:the\s+|our\s+)?last\b/i,
    /\bour\s+last\s+check-?in\b/i,
    /\bwhat\s+did\s+(?:the\s+)?last\s+(?:check-?in|round|report)\b/i,
    /\bwhat\s+(?:has|have)\s+(?:we|the\s+team)\s+(?:agreed|decided)\b/i,
  ]),
  rule('what_should_we_talk_about', [
    /*
     * ABOVE `what_is_stuck` AND `how_am_i_doing`, and the reason is the overlap rather than the
     * wording. "What should I be doing about my team" reads to the coaching lane as a request for a
     * step and to this one as a request for the pending suggestions, and the suggestions are the
     * better answer: they are addressed to this person by name, they expire, and the coaching step
     * will still be there tomorrow.
     *
     * Narrow on purpose. It owns the shapes that ask what is waiting to be decided, and nothing
     * that merely mentions a conversation - "how do I run a check-in" is a handbook question.
     */
    /\bwhat\s+(?:should|do)\s+we\s+(?:talk|speak)\s+about\b/i,
    /\b(?:any|my|what)\s+suggestions?\b/i,
    /\bwhat\s+(?:conversations?|check-?ins?)\s+(?:should|do)\s+i\b/i,
    /\bwhat\s+(?:is|are)\s+(?:waiting|pending)\s+(?:for|on)\s+(?:my\s+)?(?:decision|answer|me\s+to\s+decide)\b/i,
    /\bwhat\s+(?:do\s+)?you\s+(?:suggest|recommend)\b/i,
    /\bwhat\s+needs\s+(?:my\s+)?deciding\b/i,
  ]),
  rule('where_am_i_needed', [
    /*
     * ABOVE `how_am_i_doing`, WHICH IS THE ONE IT ACTUALLY COLLIDES WITH.
     *
     * I first wrote that the collision was with `what_is_stuck` - both being about handoffs - and
     * driving the assembled router said otherwise: with this lane removed, five of its six phrasings
     * fall through unplaced and only "what should I focus on this week" is claimed by anything, by
     * `how_am_i_doing`. Which makes sense read aloud. It is the same words as somebody asking after
     * their own standing, and the two want opposite answers: one is a person's own record, the other
     * is four lists of other people. So the order between THOSE two is what matters, and the note
     * saying otherwise would have sent the next person to defend the wrong boundary.
     *
     * Narrow on purpose: it owns the shapes that ask where the ASKER should spend their attention,
     * and nothing that merely asks about somebody's state.
     */
    /\bwhere\s+(?:am\s+i|should\s+i\s+be)\s+needed\b/i,
    /\bwho\s+needs\s+(?:me|my\s+(?:help|attention|time))\b/i,
    /\bwhat\s+(?:should|do)\s+i\s+(?:focus\s+on|do)\s+this\s+week\b/i,
    /\bwhere\s+(?:do\s+i|should\s+i)\s+(?:start|spend\s+my\s+time)\b/i,
    /\bmy\s+week\b/i,
  ]),
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
    /* "How are things going for me" went nowhere. Found by declaring what this
       capability owns and running it through the router — which is the registry
       doing the one job it exists for. */
    /\bhow\s+(?:are\s+)?things\s+going\s+for\s+me\b/i,
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
    /* Same finding, same run: somebody asking what it is connected to says "what
       data do you have" as readily as "what can you see". */
    /\bwhat\s+(?:data|information|records)\s+(?:do\s+you\s+)?(?:have|hold|see)\b/i,
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
    /*
     * "HOW DOES THE FREEZE WORK" WENT NOWHERE.
     *
     * The lane owned `how do we` and `how do I` and neither shape covers a question about a THING
     * rather than about doing something. Found the day the company's own decisions were first pushed
     * in: four cards landed, retrieval found them, and two of the three questions anybody would
     * actually ask were routed to the default.
     *
     * Deliberately not a bare `how` — that would take "how am I doing", which is somebody's own
     * standing and a different question with a lane of its own sitting below this one.
     */
    /\bhow\s+(?:does|do)\s+(?:the|our|a|an|this)\s+(.{3,})/i,
    /*
     * "What do I do if I am locked out" reached no lane at all, and the handbook had a section
     * headed exactly that. Found by uploading a real handbook and asking it the questions the
     * handbook answers, which is a different exercise from reading the patterns.
     *
     * Safe this low: the lanes that own the near neighbours all sit above it - "I'm stuck" is
     * coaching, "what am I waiting on" is the handoff lane - so what reaches here is a question
     * about a situation rather than about this person's own work.
     */
    /\bwhat\s+(?:do|should)\s+i\s+do\s+(?:if|when|about)\s+(.{3,})/i,
    /\bwho\s+do\s+i\s+(?:ask|tell|contact)\s+(?:about\s+)?(.{3,})/i,
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
