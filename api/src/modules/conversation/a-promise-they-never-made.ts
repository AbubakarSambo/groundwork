/**
 * "YOU SAID YOU WOULD SEND THE ROTA BY FRIDAY." SHE NEVER MENTIONED A ROTA.
 *
 * Read on a live session 2 about tea sales in Abuja. Nothing in the check-in, in either session,
 * in the record or in any document contains the word rota. The sentence came out of the engine's
 * own worked example of a closing turn, copied whole:
 *
 *   prompt-library.ts  "You said you will send the rota by Friday. Your report is ready now, and
 *                       nothing in it needs acting on today. Speak soon."
 *
 * The example is there to show the SHAPE of a close - one thing they said they would do, then the
 * report, then goodbye. It was read as content. This is the worst class of fault this product has:
 * not a clumsy sentence, a commitment attributed to somebody who never made it, in the last thing
 * they read before the session ends and the report goes out.
 *
 * WHY THE GATES ALREADY THERE MISSED IT. `withoutQuotesTheyDidNotSay` checks quotation marks and
 * this has none. The invention gate checks names, figures and documents; "the rota" is none of
 * those. A claim about somebody does not need quote marks to be a quote.
 *
 * THE TEST, AND WHY IT IS SET WHERE IT IS. An attribution is invented when NOTHING in it was said -
 * not one content word, anywhere in what this person has said or in what is on their record. One
 * word of overlap is enough to let it through ("you said you would speak to the Wuse distributor"
 * passes on Wuse), because the cost of being wrong here is cutting a true sentence out of a close,
 * and the cost the other way is what she read above. Total disconnection is rare and unambiguous.
 *
 * CUT, NOT ASKED AGAIN. Every other guard here regenerates. This one does not: a model that has
 * just invented a commitment is not the thing to ask for a better commitment, and the close reads
 * perfectly well without its first sentence - the engine's own rule says to skip that sentence when
 * the session added nothing.
 */

/** Words that carry no subject of their own, so overlap on one of them means nothing. */
const CARRIES_NOTHING = new Set([
  'said', 'told', 'mentioned', 'committed', 'promised', 'would', 'will', 'going', 'send', 'sending',
  'give', 'giving', 'have', 'that', 'this', 'with', 'from', 'your', 'you', 'the', 'and', 'for',
  'about', 'before', 'after', 'next', 'last', 'thing', 'things', 'something', 'anything', 'them',
  'they', 'their', 'then', 'been', 'over', 'into', 'once', 'also', 'more', 'most', 'when', 'what',
]);

const wordsIn = (s: string): string[] =>
  (s.toLowerCase().match(/[a-z][a-z'-]{2,}|\d[\d,.]*/g) ?? []).map((w) => w.replace(/[',.]+$/, ''));

const carries = (w: string) => w.length >= 3 && !CARRIES_NOTHING.has(w);

/** The sentences in a reply that tell somebody what they themselves said. */
export function whatItSaysTheySaid(reply: string): string[] {
  return (reply.match(/[^.!?\n]*[.!?]?/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /\byou (said|told me|mentioned|committed|promised|agreed)\b/i.test(s));
}

/**
 * The attribution that nothing supports, or null where every one of them has something behind it.
 *
 * `theirs` is everything this person has said and everything already on their record - both,
 * because a promise made in session 1 is properly recalled in session 2 and is not an invention.
 */
export function aPromiseTheyNeverMade(reply: string, theirs: string[]): string | null {
  const ground = new Set(theirs.flatMap(wordsIn));
  for (const sentence of whatItSaysTheySaid(reply)) {
    const said = wordsIn(sentence).filter(carries);
    if (!said.length) continue;
    if (!said.some((w) => ground.has(w))) return sentence;
  }
  return null;
}

/** The reply with that sentence gone, and the spacing left readable. */
export function withoutThePromise(reply: string, sentence: string): string {
  return reply
    .split(sentence)
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+/gm, '')
    .trim();
}
