/**
 * A NUMBER WRITTEN AS A WORD IS A NUMBER.
 *
 * Run 8, the sales scenario. Kwame's record held, in order:
 *
 *   session 2  "All 22 facilities were pretty smooth, most of them just needed a little nudge."
 *   session 3  "I have three approved facilities already."
 *
 * Where he says he stands was read as the latest progress line with a DIGIT in it, so "three" lost
 * to "22", his finding said 22 facilities had gone smoothly, and the judgement praised him for
 * beating a target of 14. The right answer is the opposite: he counts applications, not approvals,
 * and three approved is where he is. The board had learnt the same lesson a day earlier about a rice
 * miller's "Forty tonnes a week."
 *
 * One rule, here, so the report and the board cannot drift apart on what counts as a number.
 */
export const WORD_VALUES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1_000_000, dozen: 12,
};
const A_NUMBER_WORD = new RegExp(`\\b(?:${Object.keys(WORD_VALUES).join('|')})\\b`, 'gi');

export function carriesANumber(text: string | null | undefined): boolean {
  const t = text ?? '';
  A_NUMBER_WORD.lastIndex = 0;
  return /\d/.test(t) || A_NUMBER_WORD.test(t);
}

/**
 * The numbers a line carries, digits and words alike, one value per figure as it was written.
 * "twenty two" is read as 20 and 2 rather than 22: this is for telling two lines' figures apart,
 * and two lines that disagree still disagree when both are read the same way.
 */
export function theNumbersIn(text: string | null | undefined): number[] {
  const t = text ?? '';
  const out: number[] = [];
  for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) out.push(Number(m[0].replace(/,/g, '')));
  for (const m of t.matchAll(A_NUMBER_WORD)) out.push(WORD_VALUES[m[0].toLowerCase()]);
  return out.filter((n) => Number.isFinite(n));
}
