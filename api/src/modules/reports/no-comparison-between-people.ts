/**
 * NO READER IS SENT A COMPARISON BETWEEN PEOPLE (Hafsah, 7 October 2026, from B-110).
 *
 * "Significantly fewer and less specific entries than others on the same ground", "one party gave much less detail than the rest", "behind the
 * team", "the least engaged": each ranks a person against others, and each is the same fault as handing somebody a rating. The report's
 * model is asked to note thin or missing accounts, and what it writes there can read as a comparison, so the sentence is taken out HERE, where
 * the report is served, whoever wrote it. Counts of who has answered ("two of six have checked in") are participation, not comparison, and stay.
 *
 * Only the product's and the model's own sentences are read. What a person said, word for word, is never touched.
 */
const THAN_THE_OTHERS = '(?:the\\s+)?(?:others?|rest(?:\\s+of\\s+(?:the\\s+)?(?:team|group|people))?|other\\s+(?:people|parties|party|participants|members)|everyone\\s+else|everybody\\s+else|colleagues|(?:their|his|her)\\s+(?:peers|colleagues)|(?:the\\s+)?(?:team|group)(?:\\s+average)?|any\\s+other\\s+\\w+|the\\s+other\\s+\\w+)';

export const A_COMPARISON_BETWEEN_PEOPLE: RegExp[] = [
  new RegExp(`\\b(?:fewer|less|more|thinner|vaguer|shorter|longer|slower|faster|weaker|stronger|lower|higher|better|worse|much\\s+\\w+)\\b[^.!?\\n]{0,80}\\bthan\\s+${THAN_THE_OTHERS}`, 'i'),
  new RegExp(`\\b(?:compared\\s+(?:with|to)|relative\\s+to|against|in\\s+comparison\\s+(?:with|to))\\s+${THAN_THE_OTHERS}`, 'i'),
  new RegExp(`\\b(?:below|above|under|over|behind|ahead\\s+of|lagging|trailing|beyond)\\s+(?:the\\s+)?(?:team|group|rest|others|average|everyone\\s+else)`, 'i'),
  /\b(?:the\s+)?(?:most|least|highest|lowest|best|worst)\s+(?:active|engaged|specific|responsive|detailed|vague|forthcoming|communicative|committed|reliable)\b/i,
  /\b(?:significantly|noticeably|markedly)\s+(?:fewer|less|more|thinner)\b[^.!?\n]{0,60}\b(?:entries|exchanges|detail|specific|records?)\b/i,
];

const SENTENCE = /[^.!?\n]+(?:[.!?]+(?=\s|$)|$)|\n+/g;

/** The sentence kept, or null when it ranks somebody against others. */
export function aSentenceWithoutComparison(sentence: string): string | null {
  return A_COMPARISON_BETWEEN_PEOPLE.some((r) => r.test(sentence)) ? null : sentence;
}

/** A text with every sentence that compares people removed; the rest is exactly as it was. */
export function withoutComparisons(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  if (!A_COMPARISON_BETWEEN_PEOPLE.some((r) => r.test(text))) return text;
  const kept = (text.match(SENTENCE) ?? [text]).filter((s) => /^\n+$/.test(s) || aSentenceWithoutComparison(s) !== null);
  return kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
}

/** The fields of a served report that are the product's or the model's words about the people in it, never a person's own. */
const WORDS_ABOUT_PEOPLE = ['sharedPicture', 'theOpening', 'centralQuestion', 'theConversationWorthHaving', 'agreements', 'divergences', 'inferences', 'findings', 'whereThingsStand', 'session2Focus', 'engagement', 'theJudgement', 'sections'];
/** Inside those, a person's own words: left as they are. */
const THEIR_OWN_WORDS = new Set(['said', 'quote', 'quotes', 'saidWordForWord', 'lines', 'whatTheySaid', 'whatEachPersonSaid', 'view', 'positions']);

function walk(value: any, key = ''): any {
  if (typeof value === 'string') return withoutComparisons(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, key)).filter((v) => !(typeof v === 'string' && v === ''));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = THEIR_OWN_WORDS.has(k) ? v : walk(v, k);
    return out;
  }
  return value;
}

/** A served report with no sentence in it that ranks one person against others. */
export function withoutComparisonsBetweenPeople<T extends Record<string, any>>(report: T): T {
  if (!report || typeof report !== 'object') return report;
  const out: Record<string, any> = { ...report };
  for (const k of WORDS_ABOUT_PEOPLE) if (k in out) out[k] = walk(out[k], k);
  return out as T;
}

/** Words that are somebody's own, wherever they sit in what is served. */
const WORDS_THAT_ARE_THEIRS = new Set([...THEIR_OWN_WORDS, 'words', 'wordForWord', 'verbatim', 'turns', 'answer', 'answers', 'content']);

function walkAnywhere(value: any): any {
  if (typeof value === 'string') return withoutComparisons(value);
  if (Array.isArray(value)) return value.map(walkAnywhere);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = WORDS_THAT_ARE_THEIRS.has(k) ? v : walkAnywhere(v);
    return out;
  }
  return value;
}

/** Anything served to a reader (a board, an answer in Ask): every sentence of the product's own that ranks one person against others is taken out. */
export function withoutComparisonsAnywhere<T>(served: T): T {
  return walkAnywhere(served) as T;
}
