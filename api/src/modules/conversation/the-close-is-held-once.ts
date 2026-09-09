/**
 * THE CLOSE BAR.
 *
 * The prompt says: two pushbacks, then record what they said as a weak evidence definition. That is
 * a rule, and a rule was not enough, so the bar is attached to the mechanism. Before a close is
 * accepted, the last thing the person said is read for a number, a date, a document, or a file
 * they attached this session. If none of those is there, the close is held ONCE and the product
 * asks for the one concrete thing. They answer, and the close goes through whatever they said.
 *
 * The person sees a question. Never a form, never a rule read back to them.
 */

const A_NUMBER = /\b\d+([.,:]\d+)?%?\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|half|dozen)\b/i;
const A_DATE =
  /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(tomorrow|tonight|next (week|month|quarter|monday|tuesday|wednesday|thursday|friday)|end of (the )?(week|month|quarter|day)|by the \d+|this (week|month|quarter)|q[1-4])\b/i;
const A_DOCUMENT =
  /\b(doc|document|spreadsheet|sheet|deck|slide|report|brief|spec|proposal|plan|tracker|ticket|pr|pull request|commit|invoice|contract|email|thread|message|note|minutes|dashboard|link|file|attached|attachment|screenshot|recording|transcript)s?\b/i;

export type ConcreteThing = 'a number' | 'a date' | 'a document' | 'an attachment';

export function whatIsConcreteIn(lastTurn: string, attachedThisSession: boolean): ConcreteThing[] {
  const found: ConcreteThing[] = [];
  if (attachedThisSession) found.push('an attachment');
  if (A_NUMBER.test(lastTurn)) found.push('a number');
  if (A_DATE.test(lastTurn)) found.push('a date');
  if (A_DOCUMENT.test(lastTurn)) found.push('a document');
  return found;
}

/**
 * The one question. Product-written, the way the citation is: the model does not get to soften it
 * or turn it into three. It is short because it is the last thing they read before the report.
 */
export const THE_ONE_CONCRETE_THING =
  'One more before this closes. Put a date or a number on that, or name where it is written down.';

/** The line the model gets on the turn after the hold, so it does not ask a second time. */
export const THE_CLOSE_WAS_HELD =
  'THE CLOSE WAS HELD ONCE, by the product, for a date, a number or a document. They have now answered that. Whatever they gave, do not ask for it again: it is recorded as what they said. If you were closing, close now, in the shortest turn of the session, with the marker.';

/**
 * THE LAST THING THEY SAID, NOT THE LAST THING THEY TYPED. A closing turn is usually "no, we are good"
 * or "yes that's everything", which carries no date because it is not an answer to anything. The bar
 * reads back past those to the last turn with something in it.
 */
const AN_ACKNOWLEDGEMENT = /^\s*(no|yes|yeah|yep|ok|okay|sure|fine|good|done|that'?s (it|all|everything)|we are good|we're good|i'?m good|nothing (else|more)|no,? (we are|we're|that'?s) (good|it|all|fine)|nope|all good|ready|let'?s close( it)?)[\s.!,]*$/i;
export function lastSubstantiveTurn(personSaid: string[]): string {
  for (let i = personSaid.length - 1; i >= 0; i--) {
    const t = (personSaid[i] ?? '').trim();
    if (!t) continue;
    if (AN_ACKNOWLEDGEMENT.test(t)) continue;
    if (t.split(/\s+/).length <= 3 && !/\d/.test(t)) continue;
    return t;
  }
  return personSaid[personSaid.length - 1] ?? '';
}
