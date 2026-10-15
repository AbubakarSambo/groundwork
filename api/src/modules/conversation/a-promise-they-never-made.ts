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

import { A_CLOSE_THAT_CLAIMS_NOTHING, isAFragment } from './a-cut-never-leaves-a-fragment';

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

/*
 * "WHAT YOU SAID IS NOW IN THE RECORD" TELLS THEM NOTHING THEY SAID.
 *
 * run-7, the crisis scenario. Elena Rossi's close was "What you said is now in the record, and the
 * report will be ready for you. Speak soon." The first sentence matched "you said", nothing in it
 * was hers, so it was cut as an invented promise, and what she read as her last turn was "Speak
 * soon." "What you said" there is a noun phrase, the same as "your answers". It attributes nothing
 * to her. So a "you said", "you told us", "you shared" or "you mentioned" that is only the object
 * of "what", "everything", "anything", "all" or "whatever" is taken out before the sentence is
 * read. "You said you would send the rota by Friday" is still read, and still cut.
 */
const WHAT_YOU_SAID_AS_A_NOUN =
  /\b(?:what|everything|anything|all(?: that)?|whatever)\s+you(?:'ve| have)?\s+(?:said|told (?:me|us)|shared|mentioned)\b/gi;

/** The sentences in a reply that tell somebody what they themselves said. */
export function whatItSaysTheySaid(reply: string): string[] {
  return (reply.match(/[^.!?\n]*[.!?]?/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => {
      const read = s.replace(WHAT_YOU_SAID_AS_A_NOUN, ' ');
      return /\byou (said|told me|mentioned|committed|promised|agreed)\b/i.test(read)
        /* "You will send the rota by Friday" is a commitment recited as theirs, the same as "you said you
           would": a farmer who had said nothing about a rota read it at her close (run 6, 21 Sep 2026). */
        || /^(?:so |and )?you (?:will|are going to|have agreed to|have committed to)\b/i.test(read.trim())
        /* "That you will send the rota by Friday is also noted" went to a rep who had said nothing about a rota: the
           pack's own example sentence, recited as his (run 10, 21 Sep 2026). */
        || /\bthat you (?:will|are going to|would|have agreed to)\b/i.test(read);
    });
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
    const shared = said.filter((w) => ground.has(w)).length;
    if (!shared) return sentence;
    /* ONE SHARED WORD IS NOT A RECALL. "Last time you mentioned you had signed N30m worth of contracts" shared
       "n30m" with a woman who had said her target was N30m and nothing about contracts (run 10). A recall of
       four or more carrying words needs two of them to be hers. A restatement of a plan in other words
       ("you will keep the diesel paid") is not held to that; paraphrase is allowed there. */
    const isARecall = /\b(last (?:time|session|week)|previously|earlier|before,? you|you (?:said|mentioned|told me))\b/i.test(sentence);
    if (isARecall && said.length >= 4 && shared < 2) return sentence;
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

/*
 * A CLOSE IS NEVER CUT DOWN TO TWO WORDS.
 *
 * The same run-7 close: once the first sentence was cut, "Speak soon." was all that was left, and
 * that is what Elena read at the end of her check-in. On the closing turn a cut that leaves a
 * fragment is replaced with the plain close. The fragment test and the close are shared with every
 * other cut - see a-cut-never-leaves-a-fragment.
 */
export { A_CLOSE_THAT_CLAIMS_NOTHING };

/**
 * What to send once the promise is cut. `closing` is whether this is the last turn; only then is
 * the plain close used. Mid-conversation the cut stands as it always has, where anything is left.
 * The text before the cut is never restored: it is the invention.
 */
export function whatIsLeftToSend(reply: string, sentence: string, closing: boolean): string | null {
  const cut = withoutThePromise(reply, sentence);
  if (closing && isAFragment(cut)) return A_CLOSE_THAT_CLAIMS_NOTHING;
  return cut.trim() ? cut : null;
}
