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

/**
 * THE OTHER HOLD: the session is closing with something it was for never raised. Product-written,
 * in the owed list's own words ("how it is actually going", "what they need from other people"),
 * so it is one plain line and not a question about something else.
 */
/* The owed list is written about them ("what they are working on"); a line is said to them. First
   sentence only: the rest of an owed line is guidance for the model, not for the person. */
export const saidToThem = (what: string): string => {
  const first = ((what ?? '').trim().split(/(?<=[.?!])\s+/)[0] ?? '').replace(/[.?!]+$/, '');
  const toYou = first
    .replace(/\bthemselves\b/gi, 'yourself')
    .replace(/\btheirs\b/gi, 'yours')
    .replace(/\btheir\b/gi, 'your')
    .replace(/\bthey are\b/gi, 'you are')
    .replace(/\bthey\b/gi, 'you')
    .replace(/\bthem\b/gi, 'you');
  return toYou.length > 120 ? `${toYou.slice(0, 117).trimEnd()}...` : toYou;
};

export const theOneThingNeverAsked = (what: string): string =>
  `One more before this closes, because it is what this check-in is for: ${saidToThem(what)}.`;

/**
 * WHEN THE MODEL WILL NOT LET A QUESTION GO, THE PRODUCT MOVES THE CONVERSATION ON. Smoke run, 20 Sep
 * 2026: "how many acres" was asked five times in five wordings, the third-ask guard fired, the retry
 * asked it again, and the fallback shipped it because there was nothing else in the reply. This is
 * what ships instead: the answer taken as given, and the next thing the check-in is for.
 */
export const takenAsSaidAndOn = (next: string | null): string =>
  next ? `That goes down as you put it. Something else this check-in is for: ${saidToThem(next)}.` : 'That goes down as you put it.';

/** The line the model gets on the turn after the hold, so it does not ask a second time. */
export const THE_CLOSE_WAS_HELD =
  'THE CLOSE WAS HELD ONCE, by the product, for a date, a number or a document. They have now answered that. Whatever they gave, do not ask for it again: it is recorded as what they said. If you were closing, close now, in the shortest turn of the session, with the marker.';

/**
 * THE LAST THING THEY SAID, NOT THE LAST THING THEY TYPED. A closing turn is usually "no, we are good"
 * or "yes that's everything", which carries no date because it is not an answer to anything. The bar
 * reads back past those to the last turn with something in it.
 */
const AN_ACKNOWLEDGEMENT = /^\s*(?:(?:no|yes|yeah|yep|ok|okay|sure|fine|good|great|perfect|done|understood|noted|alright|right|that'?s (?:it|all|everything)|we are good|we're good|i'?m good|nothing (?:else|more)|no,? (?:we are|we're|that'?s) (?:good|it|all|fine)|nope|all good|ready|let'?s close(?: it)?|thank you|thanks)[\s.!,]*){1,3}$/i;
export const isAnAcknowledgement = (turn: string): boolean => AN_ACKNOWLEDGEMENT.test((turn ?? '').trim());

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

/**
 * A GOODBYE THAT WAS REFUSED HAS TO COME OUT.
 *
 * Live, the last thing a lead read in session 2 was both endings at once:
 *
 *   "Your report is ready now, and nothing in it needs acting on today. Speak soon.
 *
 *    One more before this closes. Put a date or a number on that, or name where it is written down."
 *
 * The product held the close and appended its question to a reply that had already said goodbye,
 * handed the report over and wished her well. It reads as the product changing its mind mid
 * sentence, and it is worse than either half alone: somebody who reads the first paragraph and
 * stops has been told the session is over when it is not.
 *
 * The hold was right. The goodbye is what is wrong, and it is wrong because the model wrote it
 * before the product had ruled - the model cannot know, and should not have to. So the farewell
 * comes out here, at the moment the close is refused, and only then. What the goodbye was wrapped
 * around - anything they actually said - is left where it is.
 */
const A_FAREWELL =
  /(\bspeak soon\b|\bsee you (in|next|soon|then)\b|\btalk soon\b|\buntil next time\b|\byour report is (ready|yours|now yours)\b|\bthe report is yours\b|\bnothing in it needs acting on\b|\bnothing to act on\b|\bthat is everything for (today|now)\b|\bwe are done here\b|\bthanks for your time\b)/i;

/**
 * A GOODBYE WITHOUT THE MARKER IS STILL A CLOSE. Smoke run, 20 Sep 2026: "Your report is ready now,
 * and nothing in it needs acting on today. Speak soon." shipped as an ordinary turn because the model
 * left the marker off, so the product never ruled on the close, the person said "Ok, thank you", and
 * got "That did not come out right" with a hold underneath. The farewell IS the signal.
 */
export const saysGoodbye = (reply: string): boolean => A_FAREWELL.test(reply ?? '') && !/\?\s*$/.test((reply ?? '').trim());

export function withoutTheGoodbye(reply: string): string {
  const kept = (reply.match(/[^.!?\n]+[.!?]*|\n+/g) ?? [])
    .filter((piece) => !A_FAREWELL.test(piece));
  const out = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  /* Never hand back nothing. A reply that was ALL farewell is a close that the product refused, and
     the question it is about to append stands on its own better than an empty turn does. */
  return out;
}

/**
 * NOBODY IN A ONE-TIME SESSION OWES HOMEWORK. The engine's close rule - "what will you do about
 * this, and by when?" - reached the convener of a discovery session in run 4 (20 Sep 2026) after her
 * plan's questions were done, and the judge scored her session 1 for it: a strategy conversation that
 * ended on a personal to-do. The pack says not to ask it; the sentence is cut in code.
 */
const HOMEWORK = /\b(what will you do about (?:this|that|it),? and by when|what is the (?:first|next|one) thing you will do(?: about (?:this|that|it))?,? and (?:by )?when|before we close:? what will you do)\b[^.!?]*[.!?]?/gi;

export function withoutTheHomework(reply: string): { text: string; cut: boolean } {
  const text = (reply ?? '');
  if (!HOMEWORK.test(text)) return { text, cut: false };
  HOMEWORK.lastIndex = 0;
  const kept = text.replace(HOMEWORK, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text: kept || text, cut: !!kept };
}
