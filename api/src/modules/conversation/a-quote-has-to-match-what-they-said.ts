/**
 * IF IT PUTS SOMEBODY'S WORDS IN QUOTATION MARKS, THEY HAVE TO BE THEIR WORDS.
 *
 * Seen live: a person wrote "Sam is waiting on me and I know it." and the reply quoted her back as
 * "Sam iss waiting on me and I know it." One letter, and it is the whole promise. This product's
 * claim is that it never puts words in anybody's mouth, and a quotation is the one place where the
 * words are explicitly theirs rather than the model's.
 *
 * The check is cheap because the truth is right there: everything the person has typed in this
 * conversation. A quoted phrase either appears in it or it does not.
 *
 * WHY THIS REWRITES RATHER THAN REJECTS. The sentence around the quote is usually good, and the
 * only thing wrong is the quotation marks - the model is paraphrasing while dressed as quoting. So
 * an unmatched quote loses its marks and stays as reported speech. Nothing is deleted, nobody is
 * told a colleague said something they did not, and the turn still reads.
 *
 * WHAT IS DELIBERATELY LEFT ALONE:
 *   - short fragments, under five words. "waiting on me" is an ordinary phrase, not a claim about
 *     what somebody said, and stripping those would strip half the product's normal speech.
 *   - anything the model quotes from a document or a brief, which is not in the person's turns and
 *     is not a claim about them either. Those keep their marks; this only guards the case where the
 *     model attributes words to the PERSON it is talking to.
 */
const SMART = /[‘’“”]/g;

/** Loose enough that punctuation and spacing never decide whether somebody was misquoted. */
function comparable(text: string): string {
  return text
    .replace(SMART, (m) => ('‘’'.includes(m) ? "'" : '"'))
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]/g, '')
    .toLowerCase()
    .trim();
}

/** Below this, a quoted run is a turn of phrase rather than an attributed statement. */
const LONG_ENOUGH_TO_BE_A_QUOTE = 5;

export function unmatchedQuotes(reply: string, whatTheySaid: string[]): string[] {
  const haystack = comparable(whatTheySaid.join(' • '));
  const out: string[] = [];
  for (const m of reply.replace(SMART, (x) => ('“”'.includes(x) ? '"' : "'")).matchAll(/"([^"]{2,400})"/g)) {
    const quoted = m[1].trim();
    if (quoted.split(/\s+/).length < LONG_ENOUGH_TO_BE_A_QUOTE) continue;
    if (!haystack.includes(comparable(quoted))) out.push(quoted);
  }
  return out;
}

/**
 * The quotation marks come off an unmatched quote, and everything else is left exactly as it was.
 */
export function withoutQuotesTheyDidNotSay(reply: string, whatTheySaid: string[]): string {
  let out = reply;
  for (const bad of unmatchedQuotes(reply, whatTheySaid)) {
    for (const [open, close] of [['"', '"'], ['“', '”']]) {
      out = out.split(`${open}${bad}${close}`).join(bad);
    }
  }
  return out;
}
