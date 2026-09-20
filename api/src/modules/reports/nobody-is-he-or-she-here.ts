/**
 * NOBODY IS "HE" OR "SHE" IN A SENTENCE ABOUT THEM UNLESS THEY SAID SO.
 *
 * Adversarial run 2, 20 Sep 2026: the session report's one-sentence summaries called Chika, Bola and
 * Grace "he". The prompt says "third person"; the model picked a pronoun from the name. The STYLE
 * rule against guessing pronouns reached the wording passes and not this one, and a rule is the wrong
 * tool anyway: this is the sentence about a person that their lead reads first.
 *
 * So the pronoun comes out in code. A sentence that opens "He reports..." opens "Reports..."; a
 * pronoun further in becomes they/their/them, with the verb moved to match where English needs it.
 * Nothing is added; a wrong guess is replaced by no guess.
 */
export function withoutAGuessedPronoun(sentence: string): string {
  let s = (sentence ?? '').trim();
  if (!s) return s;
  /* The opener: "He reports" -> "Reports". */
  s = s.replace(/^(He|She)\s+(\w)/, (_m, _p, c: string) => c.toUpperCase());
  /* Verb agreement first, then the bare pronouns. */
  s = s
    .replace(/\b(he|she) is\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They are' : 'they are'))
    .replace(/\b(he|she) has\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They have' : 'they have'))
    .replace(/\b(he|she) was\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They were' : 'they were'))
    .replace(/\b(he|she) does\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They do' : 'they do'))
    .replace(/\b(he|she)'s\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They have' : 'they have'))
    .replace(/\bHe\b|\bShe\b/g, 'They')
    .replace(/\bhe\b|\bshe\b/g, 'they')
    .replace(/\bHis\b|\bHer\b(?=\s+\w)/g, 'Their')
    .replace(/\bhis\b/g, 'their')
    .replace(/\bher\b(?=\s+(?:own|\w+ing|\w+s\b|[a-z]+))/g, 'their')
    .replace(/\bhimself\b|\bherself\b/g, 'themselves')
    .replace(/\bhim\b/g, 'them');
  return s;
}
