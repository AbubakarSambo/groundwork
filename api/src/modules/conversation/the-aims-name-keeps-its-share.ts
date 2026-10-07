/**
 * AN AIM SAID AS A SHARE KEEPS ITS PERCENT SIGN AND ITS "UNDER" IN THE NAME (user journeys, F-4).
 *
 * The lead's plan said "Credit must stay under 35% of sales." and the model named the aim "Credit of sales" with the number 35. The percent
 * sign and the word "under" were gone, so the board asked "Will we keep credit of sales within 35 ..." and read "0 of 35", a count of
 * something nobody counts. The words the lead used are still in the plan, so the name is put back from the sentence they said it in.
 *
 * Only where the aim's number is said as a share in the lead's own words (35% or 35 per cent), the name does not already say it, and the
 * sentence it was said in carries the name's own first word. Nothing is invented: the new name is the lead's sentence, with "must stay"
 * and the like taken out so it reads as a name.
 */
const THE_FILLER = /\b(?:must|should|needs? to|has to|have to|will|shall)\s+(?:stay|be|remain|keep|come in|go|sit)\s+/i;
const NOT_A_WORD_THAT_NAMES = new Set(['the', 'and', 'for', 'our', 'with', 'from', 'that', 'this', 'of', 'to', 'in', 'on', 'a', 'an']);

const firstWordOf = (name: string): string | null =>
  name.toLowerCase().split(/[^a-z]+/).find((w) => w.length >= 4 && !NOT_A_WORD_THAT_NAMES.has(w)) ?? null;

export function theAimsNameKeepsItsShare<T extends { name: string; target: number | null }>(aims: T[], theirWords: string): T[] {
  const sentences = theirWords.split(/[.!?\n]+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return aims.map((a) => {
    if (a.target == null || /%|per ?cent/i.test(a.name)) return a;
    const first = firstWordOf(a.name);
    if (!first) return a;
    const said = new RegExp(`(?<![\\d.,])${a.target}\\s?(?:%|per ?cent)`, 'i');
    const sentence = sentences.find((s) => said.test(s) && s.toLowerCase().includes(first));
    if (!sentence) return a;
    /* The clause with the share in it, from the aim's own first word on, not the whole sentence around it. */
    const from = sentence.toLowerCase().indexOf(first);
    const clause = sentence.slice(from).replace(THE_FILLER, '').replace(/[,;:\s]+$/, '').trim();
    if (clause.length < 6 || clause.length > 80 || !said.test(clause)) return a;
    return { ...a, name: clause.charAt(0).toUpperCase() + clause.slice(1) };
  });
}
