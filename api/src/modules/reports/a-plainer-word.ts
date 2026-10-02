/**
 * A PLAINER WORD, WHERE THE PRODUCT WROTE A HARDER ONE (screens request 117, part 10).
 *
 * The fifth review of the sales board read, in a difference the written report described, "what document
 * signifies that a shop is successfully signed". "Signifies" is a word people with basic English stop at;
 * "means" says the same. The report is written in labels and named for each reader by `withNames`, which
 * every served report sentence passes through, so the word is changed there, once, for every reader and for
 * report text stored before this change as well as after.
 *
 * NEVER INSIDE A QUOTATION. `withNames` hands this only the text outside quotation marks, so a person who
 * said "signifies" is still quoted saying it (decision 18: people's own words are never changed).
 */
const PLAINER: [RegExp, string][] = [
  [/\bsignifies\b/g, 'means'],
  [/\bSignifies\b/g, 'Means'],
  [/\bsignify\b/g, 'mean'],
  [/\bSignify\b/g, 'Mean'],
  [/\bsignified\b/g, 'meant'],
  [/\bSignified\b/g, 'Meant'],
  [/\bsignifying\b/g, 'meaning'],
  [/\bSignifying\b/g, 'Meaning'],
];

export function aPlainerWord(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [hard, plain] of PLAINER) out = out.replace(hard, plain);
  return out;
}
