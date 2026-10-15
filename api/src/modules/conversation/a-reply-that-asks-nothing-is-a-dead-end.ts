/**
 * A REPLY EITHER ASKS SOMETHING OR ENDS THE SESSION. NEVER NEITHER.
 *
 * Walked both sides of a check-in in a browser. Twice, a turn came back like this:
 *
 *   "You will go to their team lead directly on Monday."
 *
 * That is all of it. The person has just given the thing that was asked for, and what comes back
 * acknowledges it and stops. They are left holding the conversation with nowhere to put it: no
 * question, and no sign the session is over. It happened to the lead as well as the participant.
 *
 * THE PRODUCT ALREADY KNOWS THIS HAPPENS. There is a button under the composer that says "Not
 * seeing a wrap-up? Complete session" - a hatch built because people get stranded here. The hatch
 * is worth keeping; needing it twice in ten minutes is not.
 *
 * WHY THIS IS CODE'S BUSINESS AND NOT THE PROMPT'S. It is shape, not judgement: did this reply ask
 * anything, and is the session closing. Neither question needs to know what the conversation is
 * about, and nothing here decides what to ask - the model is asked again and writes its own. The
 * same move the report's question uses, and the same retry the two gates beside it in
 * conversation.service already use.
 */

/**
 * Is there a question in here at all?
 *
 * A question mark is the honest test. Not every question carries one - "tell me what changed" is a
 * question in every sense that matters - so this is deliberately generous: anything with a "?"
 * passes, and a reply that asks without one is a near miss this does not chase. The fault being
 * caught is the flat acknowledgement, which has no "?" and no imperative either.
 */
export function asksSomething(text: string): boolean {
  return /\?/.test(text ?? '');
}

/**
 * WHAT COUNTS AS ASKING WITHOUT A QUESTION MARK.
 *
 * Read off real replies: "Tell me what changed since last time." and "Say more about the finance
 * hold-up." are questions doing their job. Refusing them would send the model back for a rewrite of
 * something that was fine, and a retry that fires on good output is worse than the fault.
 */
const AN_ASK_WITHOUT_A_QUESTION_MARK =
  /\b(?:tell me|say more|walk me through|talk me through|describe|give me a sense|let me know|help me understand|please (?:answer|tell|share|describe|reply|write|say|add|send|type|give|explain|confirm|let)|go ahead|when you(?:'re| are) ready|take your time|(?:write|type|say) (?:[\u201c\u2018"']?finish)|reply (?:with|here))\b/i;

/**
 * A dead end: it asked nothing, and the session is not ending.
 *
 * `closing` comes from the close marker the engine already reads - see `hadCloseMarker`. A closing
 * turn has every right to be a statement; that IS the wrap-up.
 */
export function isADeadEnd(text: string | null | undefined, closing: boolean): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (closing) return false;
  if (asksSomething(t)) return false;
  if (AN_ASK_WITHOUT_A_QUESTION_MARK.test(t)) return false;
  return true;
}

/** What to tell the model when its reply left somebody with nowhere to go. */
export const ASK_SOMETHING_OR_CLOSE =
  'YOUR LAST REPLY ASKED NOTHING AND DID NOT END THE SESSION, so the person reading it has nowhere '
  + 'to go. Say the same thing again and finish with the one question you actually need next, in '
  + 'your own words. If there is genuinely nothing left to ask, end the session instead. Do not '
  + 'explain this instruction and do not mention it.';
