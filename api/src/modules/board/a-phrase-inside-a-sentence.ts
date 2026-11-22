/**
 * A PHRASE SAID INSIDE THE PRODUCT'S OWN SENTENCE (21 November 2026). The same small function was written seven times, in the board,
 * its blockers, the switchboard's sections and four report writers, each with its own list of opening words, so one place said "the
 * buyer" and another "The buyer" in the middle of a sentence ("Chidi and you see How progress against the team's target ... is
 * described differently"). It is written once here, and every writer reads it.
 *
 * The phrase loses its closing stop, and an opening word that only starts it because it came first (an article, a question word, a
 * pronoun) is put in lower case. A name ("Quickmart", "Naivas") is left as it is.
 */
const AN_ORDINARY_OPENING = /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|These|Those|Our|Their|His|Her|Its|He|She|It|They|There)\b/;

export const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return AN_ORDINARY_OPENING.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};
