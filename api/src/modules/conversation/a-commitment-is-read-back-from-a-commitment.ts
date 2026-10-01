/**
 * "YOU SAID YOU WOULD TRACK THE INTEGRATION PROJECT'S STATUS." RAVI HAD SAID NO SUCH THING.
 *
 * Read in the 1 October review. Ravi Menon, away for four weeks, said the integration project was on track
 * because he had been told so, and that the customer-issue loop had been slow. Groundwork closed with
 * "You said you would track the integration project's status and the customer issue feedback loop."
 * Maria, the new manager, said "I'm sure he understands the general expectations" and was read back
 * "You said you will confirm general expectations with Daniel." Neither committed to anything.
 *
 * WHY THE NET THAT WAS THERE LET IT THROUGH. a-promise-they-never-made lets a sentence stand when ONE
 * content word is shared with anything they said. Ravi said "integration project" and "customer issues",
 * so "track the integration project" shared words and passed. The words were his. The commitment was not.
 *
 * THE RULE. A sentence that reads a commitment back to somebody ("you said you would...", "you will...")
 * stands only where it comes from a commitment: a commitment row of that person from an earlier session,
 * or a sentence in what they said in which THEY commit ("I will", "I'll", "I am going to", "I plan to")
 * and which shares the verb, or at least two of the things, with the sentence read back. Sharing a topic
 * is not a commitment. Otherwise the sentence is cut, the same way an invented promise is.
 */

import { whatItSaysTheySaid } from './a-promise-they-never-made';

/** The shape of "you would / will / are going to <verb>", with the verb that follows. */
const A_COMMITMENT_READ_BACK =
  /\b(?:you(?:'ll| will| would| are going to|'re going to| shall| plan to| intend to)|(?:committed|promised|agreed|planned|intended)\s+to|that you (?:will|would|are going to))\s+(?:also\s+|then\s+|definitely\s+|still\s+)?(?:be\s+)?([a-z][a-z'-]+)/i;

/** Where THEY commit, in their own words. */
const THEY_COMMIT = /\b(?:I|we)\s*(?:'ll|'d|will|would|shall|am going to|'m going to|are going to|'re going to|plan to|am planning to|intend to|promise to|am committed to|have to|need to|must|should|can|could)\b|\b(?:I|we)\s+(?:will|'ll)\b|\blet me\b|\bI(?:'ll| will) be\b/i;

const CARRIES_NOTHING = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'they', 'their', 'them', 'have', 'been', 'will', 'would', 'about', 'said', 'also', 'into', 'then', 'what', 'when', 'some', 'more']);

const stemOf = (w: string) => w.toLowerCase().replace(/(?:ing|ed|es|s|e)$/, '').replace(/(.)\1$/, '$1');
const wordsOf = (s: string): string[] => (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).map((w) => w.replace(/'s$/, ''));
const carriers = (s: string) => wordsOf(s).filter((w) => !CARRIES_NOTHING.has(w));

const clausesOf = (text: string): string[] => (text ?? '').split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);

/**
 * The sentences that read a commitment back to this person where nothing they said or committed to supports it.
 * `theirWords` is what they said (this session and before). `commitmentRows` is their commitment rows from earlier sessions.
 */
export function commitmentsTheyNeverMade(reply: string, theirWords: string[], commitmentRows: string[]): string[] {
  const theirCommitments = [...commitmentRows, ...theirWords.flatMap(clausesOf).filter((c) => THEY_COMMIT.test(c))];
  const out: string[] = [];
  for (const sentence of whatItSaysTheySaid(reply)) {
    const m = A_COMMITMENT_READ_BACK.exec(sentence) ?? /^(?:so |and )?you(?:'ll)?\s+(?:will\s+)?([a-z][a-z'-]+)/i.exec(sentence);
    if (!m) continue;
    /* "You said you would" with no forward verb is not a commitment recital ("you said you were away"). */
    if (!/\b(?:would|will|'ll|going to|shall|plan to|intend to|committed to|promised to|agreed to|planned to)\b/i.test(sentence)) continue;
    const verb = stemOf(m[1]);
    const mine = carriers(sentence).filter((w) => !['said', 'told', 'mentioned', 'committed', 'promised', 'agreed', 'planned', 'intended'].includes(w));
    const supported = theirCommitments.some((c) => {
      const theirs = wordsOf(c);
      if (theirs.some((w) => stemOf(w) === verb)) return true;
      const shared = new Set(mine.filter((w) => theirs.includes(w)));
      return shared.size >= 2;
    });
    if (!supported) out.push(sentence);
  }
  return out;
}
