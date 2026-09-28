/**
 * A TURN ASKS ONE THING, AND THE PERSON CAN SEE WHICH.
 *
 * The standard says it plainly: "One question at a time. Never two questions in one message." The
 * rule has been in the prompt for months and in a gate for weeks (one-question-per-turn), and the
 * gate only writes the second question down: see DELETES_WHAT_IT_FINDS in
 * nothing-invented-reaches-them. So it reached people. Counted over every Groundwork turn of runs 8,
 * 9, 10 and 12 of the twenty-four scenarios, 3,218 turns: 132 asked more than one question.
 *
 * WHAT THEY LOOKED LIKE, COUNTED, because the repair is different for each:
 *
 *   - The product's own "One more before this closes." line put under a reply that was still
 *     asking something. The model's question and ours, one above the other.
 *   - An example written as a question: "For instance, is that a fix, or an acknowledgement?" It is
 *     not a second ask, it is the help the standard wants under the first, with the wrong mark.
 *   - Alternatives written as a question: "Is it in the contract, a service level agreement, or
 *     somewhere else?" The same help, the same wrong mark.
 *   - A list with nothing asked in it: "A confirmation email, a specific meeting, a document?"
 *   - Two real questions, often the same one twice: "What specifically do you expect of Daniel
 *     here? What would you want him to be able to point at, at the end of this?"
 *
 * THE REPAIR KEEPS WHAT IS WORTH KEEPING. An example stays, said as an example, because it is the
 * part of the turn that makes the question answerable (see a-question-that-invents-a-shape-shows-one,
 * which asks for exactly these). A list stays, said as a list. A second real question goes: the
 * person answers the last thing they were asked, and the first ask is what gets lost.
 *
 * WHICH QUESTION STAYS. The product's own lines first, because they are why the check-in exists and
 * the model cannot be relied on to ask them: the question the lead confirmed word for word, the
 * question that says a date back to check it, the lead's decision question, and the close's "one
 * more" line. Otherwise the first question, for the reason one-question-per-turn gives: keeping it is
 * the only choice that cannot change what the turn is about.
 *
 * WHAT IS NOT A SECOND QUESTION. A question mark inside quotation marks is somebody's own words
 * said back to them, and a question the lead confirmed is one question however it is punctuated.
 * Neither is counted, and neither is ever edited.
 *
 * Shape and safety only. What to ask is still the model's; this decides how many.
 */

import { THE_LEADS_DECISION } from './the-close-is-held-once';

/** A piece of a reply, with the space after it, so the pieces join back exactly. */
type Piece = { text: string; mustAsk: boolean };

const OPEN_QUOTE = new Set(['"', '“']);
const CLOSE_FOR: Record<string, string> = { '"': '"', '“': '”' };

/** Offsets [start, end) of every span that is never split and never counted: quotations, and the product's own questions. */
function heldSpans(text: string, mustAsk: string[]): [number, number][] {
  /* A product question's own last mark is still where its sentence ends, so its span stops one short. */
  const spans: [number, number][] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!OPEN_QUOTE.has(ch)) continue;
    const close = text.indexOf(CLOSE_FOR[ch], i + 1);
    const line = text.indexOf('\n', i + 1);
    if (close < 0 || (line >= 0 && line < close)) continue;
    spans.push([i, close + 1]);
    i = close;
  }
  for (const q of mustAsk) {
    const want = (q ?? '').trim();
    if (!want) continue;
    let at = text.indexOf(want);
    while (at >= 0) {
      spans.push([at, at + want.length - 1]);
      at = text.indexOf(want, at + want.length);
    }
  }
  return spans;
}

const inside = (spans: [number, number][], at: number) => spans.some(([a, b]) => at >= a && at < b);

/** The reply cut into sentences, never inside a quotation or one of the product's own questions. */
function intoPieces(text: string, mustAsk: string[]): Piece[] {
  const spans = heldSpans(text, mustAsk);
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '\n') continue;
    if (inside(spans, i)) continue;
    let end = i + 1;
    while (end < text.length && '.!?'.includes(text[end]) && !inside(spans, end)) end++;
    /* A closing quotation mark straight after the terminator belongs to this sentence. */
    while (end < text.length && (text[end] === '"' || text[end] === '”')) end++;
    while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end++;
    out.push(text.slice(start, end));
    start = end;
    i = end - 1;
  }
  if (start < text.length) out.push(text.slice(start));
  const wanted = mustAsk.map((q) => (q ?? '').trim()).filter(Boolean);
  return out.filter((s) => s.length > 0).map((s) => ({ text: s, mustAsk: wanted.some((q) => s.includes(q)) || saysADateBackToCheckIt(s) }));
}

/** How many question marks a piece carries that are not inside quotation marks. */
function marksIn(piece: string): number {
  const spans = heldSpans(piece, []);
  let n = 0;
  for (let i = 0; i < piece.length; i++) if (piece[i] === '?' && !inside(spans, i)) n++;
  return n;
}

const asks = (p: Piece) => p.mustAsk || marksIn(p.text) > 0;

/**
 * THE DATE, SAID BACK TO BE CHECKED. "When you say the end of the year, do you mean 31 December
 * 2026?" is the product's reading of their words (see a-period-is-not-a-day), and it is asked
 * whatever else the turn asks, because a date nobody checked becomes the record's date.
 */
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
export function saysADateBackToCheckIt(sentence: string): boolean {
  return new RegExp(`\\bdo you mean\\b[^?]*\\b\\d{1,2}(?:st|nd|rd|th)? ${MONTH}\\b[^?]*\\?`).test(sentence ?? '');
}

/** The number of questions a person is being asked. Quoted words and the product's own questions count as what they are. */
export function howManyQuestions(text: string, mustAsk: string[] = []): number {
  return intoPieces(text ?? '', [...mustAsk, THE_LEADS_DECISION]).filter(asks).length;
}

export function asksMoreThanOneThing(text: string, mustAsk: string[] = []): boolean {
  return howManyQuestions(text, mustAsk) > 1;
}

/* Words a sentence opens with when it is asking, not listing. */
const ASKING = /^(?:what|what's|how|which|who|whose|whom|when|where|why|is|are|was|were|do|does|did|have|has|had|can|could|would|will|should|shall|may|might|must|and|but|or|so|then|if)\b/i;
/* Words a sentence opens with when it is a claim about somebody. Said without its question mark it would read as a fact. */
const A_CLAIM = /^(?:they|he|she|it|we|you|i|there|this|that|these|those)\b/i;
const AN_EXAMPLE = /^(for instance|for example|e\.g\.|such as|something like|like|say)\s*[,:]?\s*/i;
/* "Is it" and its kin in front of a list: the list is the example, the two words are the only thing making it a question. */
const IS_IT = /^(?:is it|is that|is this|is there|are there|was it|was that|was there|would it be|could it be|would that be|might it be)\s+(?:,?\s*(?:for instance|for example),?\s+)?/i;

/* A wh-word anywhere in it: "For the remaining applications, how many are in the pipeline?" is still asking. */
const STILL_ASKING = /\b(?:what|what's|how|which|who|whose|whom|when|where|why)\b/i;
const aList = (s: string) => / or /i.test(s) || (s.match(/,/g) ?? []).length >= 2;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * AN EXTRA QUESTION SAID AS WHAT IT IS, OR NOTHING.
 *
 * Returns the sentence as a statement where it was an example or a list with a question mark on
 * it, and null where it was a real question, which goes. Only ever the full stop changes, and the
 * two or three words that made a list into a question: nothing is reworded.
 */
export function asAnExample(sentence: string, alreadyGaveAnExample = false): string | null {
  const lead = sentence.match(/^\s*/)?.[0] ?? '';
  const tail = sentence.match(/\?[\s"”]*$/)?.[0] ?? '';
  if (!tail) return null;
  const space = tail.slice(1);
  let body = sentence.slice(lead.length, sentence.length - tail.length).trim();
  if (!body || marksIn(body) > 0) return null;

  const example = body.match(AN_EXAMPLE);
  if (example) {
    let rest = body.slice(example[0].length).replace(IS_IT, '');
    if (!rest || ASKING.test(rest) || A_CLAIM.test(rest) || STILL_ASKING.test(rest)) return null;
    rest = rest.charAt(0).toLowerCase() + rest.slice(1);
    return `${lead}${capital(example[1])}, ${rest}.${space}`;
  }
  const isIt = body.match(IS_IT);
  if (isIt) {
    const rest = body.slice(isIt[0].length);
    if (!rest || !aList(rest) || ASKING.test(rest) || A_CLAIM.test(rest) || STILL_ASKING.test(rest)) return null;
    return `${lead}${alreadyGaveAnExample ? '' : 'For instance, '}${alreadyGaveAnExample ? capital(rest) : rest.charAt(0).toLowerCase() + rest.slice(1)}.${space}`;
  }
  /* "Even a note from the committee?" / "A confirmation email, a meeting, a document?" */
  if (STILL_ASKING.test(body)) return null;
  if (/^even\b/i.test(body)) return `${lead}${body}.${space}`;
  if (ASKING.test(body) || A_CLAIM.test(body) || !aList(body)) return null;
  body = alreadyGaveAnExample ? body : `For instance, ${body.charAt(0).toLowerCase()}${body.slice(1)}`;
  return `${lead}${capital(body)}.${space}`;
}

export type OneThing = {
  text: string;
  changed: boolean;
  /** What happened to each extra question, for the log. Counts, never the words. */
  saidAsAnExample: number;
  leftOut: number;
};

/**
 * THE REPLY WITH ONE QUESTION IN IT.
 *
 * `mustAsk` is the product's own question sentences for this turn: the lead's confirmed questions
 * and the close's "one more" line. Where more than one of those is present the last is kept, since
 * the last is the one the product put there most recently and it is the one the person is looking
 * at when they start to type.
 */
export function oneThingAsked(reply: string, mustAsk: string[] = []): OneThing {
  const text = reply ?? '';
  const pieces = intoPieces(text, [...mustAsk, THE_LEADS_DECISION]);
  const asking = pieces.filter(asks);
  if (asking.length <= 1) return { text, changed: false, saidAsAnExample: 0, leftOut: 0 };

  const ours = asking.filter((p) => p.mustAsk);
  const keep = ours.length ? ours[ours.length - 1] : asking[0];
  let saidAsAnExample = 0;
  let leftOut = 0;
  let gaveAnExample = pieces.some((p) => !asks(p) && /\b(for instance|for example|such as|something like)\b/i.test(p.text));
  const out: string[] = [];
  for (const p of pieces) {
    if (p === keep || !asks(p)) { out.push(p.text); continue; }
    const said = asAnExample(p.text, gaveAnExample);
    if (said) {
      out.push(said);
      saidAsAnExample++;
      gaveAnExample = true;
    } else {
      leftOut++;
    }
  }
  const joined = out.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: joined, changed: joined !== text.trim(), saidAsAnExample, leftOut };
}

/**
 * WHETHER ASKING THE MODEL AGAIN COULD DO BETTER THAN THE REPAIR.
 *
 * Only where a real question would be left out. An example said as an example loses nothing, so
 * paying a second model call for it, on the turn somebody is waiting for, buys nothing. That was
 * measured once already: see needsAFreshAsk in nothing-invented-reaches-them.
 */
export function wouldLeaveAQuestionOut(reply: string, mustAsk: string[] = []): boolean {
  return oneThingAsked(reply, mustAsk).leftOut > 0;
}

/**
 * THE CLOSE'S "ONE MORE" LINE, UNDER WHAT THE MODEL WROTE.
 *
 * The product holds a close once and asks the thing the check-in is for (see mayClose). That line
 * was put under the model's reply as it stood, and the model's reply was often still asking: "What
 * is the single biggest reason for any deals that are currently stalled? One more before this
 * closes. How is it actually going?" Two questions, and the person answers the second.
 *
 * The product's line is the one that stays. What the model said stays; what it asked goes, or is
 * said as an example where it was one.
 */
export function withTheOneMoreLine(before: string, ask: string): string {
  const said = (before ?? '').trim();
  if (!said) return ask;
  return oneThingAsked(`${said}\n\n${ask}`, [ask]).text;
}

/**
 * WHAT THE MODEL IS TOLD WHEN IT ASKED TWO THINGS. The rule named, and the way out shown: one
 * question, with any example inside a statement.
 */
export const ASK_ONE_THING = `YOUR LAST REPLY ASKED MORE THAN ONE QUESTION. A person answers the last thing they are asked, so the first question gets lost, and a message with two questions reads as a list to work through.

Write the reply again with exactly one question mark in it. Keep the question that matters most. If you want to give examples of the kind of answer you mean, put them in a sentence of their own that is not a question, for instance: "For instance, a signed order or a delivery note." Do not ask the same thing a second time in other words.`;
