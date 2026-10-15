/**
 * THE SAME SENTENCE, THREE TIMES IN ONE MAIL (after-piece check, 8 October). The report-ready mail to a lead opened with the first thing still open, then
 * gave "a conversation worth having", then "what I would do first", and the report had written all three from one finding, so the lead read it three times.
 * Two lines say the same thing when most of the words that carry meaning in the shorter one are in the other. The second is then left out: it adds nothing.
 */
const LITTLE_WORDS = new Set([
  'the', 'and', 'but', 'for', 'that', 'this', 'with', 'what', 'who', 'how', 'why', 'when', 'where', 'which', 'are', 'was', 'were', 'has', 'have', 'had', 'not',
  'can', 'could', 'would', 'should', 'will', 'their', 'there', 'they', 'them', 'from', 'into', 'each', 'one', 'all', 'any', 'out', 'about', 'than', 'then', 'here',
  'first', 'still', 'open', 'team', 'people', 'say', 'said', 'does', 'did', 'its', 'our', 'your', 'you', 'is', 'in', 'of', 'to', 'a', 'an', 'on', 'it', 'be', 'as', 'at', 'by', 'or',
]);

const wordsOf = (t: string): Set<string> => new Set(
  String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !LITTLE_WORDS.has(w)).map((w) => w.replace(/s$/, '')),
);

export function saysTheSame(a: string, b: string): boolean {
  const x = wordsOf(a);
  const y = wordsOf(b);
  if (x.size < 5 || y.size < 5) return false;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared += 1;
  return shared >= 5 && shared / Math.min(x.size, y.size) >= 0.8;
}

/** The lines, each kept only if no line before it says the same. */
export function withoutRepeats(lines: string[]): string[] {
  const kept: string[] = [];
  for (const l of lines) if (!kept.some((k) => saysTheSame(k, l))) kept.push(l);
  return kept;
}
