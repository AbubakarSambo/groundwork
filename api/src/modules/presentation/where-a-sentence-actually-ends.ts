/**
 * SPLITTING ON A FULL STOP FOLLOWED BY A SPACE IS NOT SENTENCE SPLITTING.
 *
 * Three separate live faults, all the same line of code copied into three files:
 *
 *   1. A graded opener survived the stripper that exists to remove it. The reply was
 *      `"Pipeline is strong, I should hit my number." That's a good start. To make sure...` and
 *      the naive split looks for a stop followed by whitespace. After `number.` comes a closing
 *      quote, not a space, so the boundary was missed, the mark stayed glued to the quotation, and
 *      the pattern - which matches a sentence that is nothing but a mark - had a whole paragraph to
 *      test instead of a sentence.
 *
 *   2. A reply about ten salespeople came out mangled, with whole lines missing and fragments like
 *      "5) = 6.5" left behind. Decimals: "0.5 years" is split after "0." and the half-sentences
 *      that result are then dropped by the very filters meant to protect the reader.
 *
 *   3. The same in the missing-word guard, which tests each sentence's opening. Given a sentence
 *      that was actually two, it tested the wrong opening.
 *
 * None of these is exotic. A product about what people said, holding numbers and quoting them back,
 * meets decimals and closing quotes constantly.
 *
 * WHAT THIS DOES NOT TRY TO BE. Not a parser. It handles the three shapes that actually broke:
 * terminal punctuation carrying a closing quote or bracket, decimals, and the handful of
 * abbreviations that end in a stop mid-sentence. Anything cleverer would start refusing sentences
 * that are fine, which is how the last one got the reputation it has.
 */

/** Abbreviations that end in a stop and almost never end a sentence. */
const NOT_THE_END = [
  'approx', 'e.g', 'i.e', 'etc', 'vs', 'no', 'fig', 'cf', 'al', 'inc', 'ltd', 'co',
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul',
  'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
];

/**
 * A boundary is terminal punctuation, plus any closing quotes or brackets riding on it, followed by
 * whitespace - and not a decimal point or a known abbreviation.
 */
export function sentencesIn(text: string): string[] {
  if (!text?.trim()) return [];
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;

    /* A stop between two digits is a decimal, not an ending. */
    if (ch === '.' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue;

    /* Take any closing quotes or brackets that belong to this sentence. */
    let end = i + 1;
    while (end < text.length && /["'”’)\]]/.test(text[end])) end += 1;

    /* The boundary only counts if whitespace or the end of the text follows. */
    const after = text.slice(end);
    if (after && !/^\s/.test(after)) continue;

    const piece = text.slice(start, end);
    const lastWord = (piece.match(/([A-Za-z.]+)\.$/)?.[1] ?? '').toLowerCase().replace(/\.$/, '');
    if (ch === '.' && NOT_THE_END.includes(lastWord)) continue;

    if (piece.trim()) out.push(piece.trim());
    start = end;
    i = end - 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
