/**
 * THEIR WORDS, SAID BACK IN THE RIGHT PERSON.
 *
 * Run 11, the loan cohort, Aisha: "I am one payment behind." And the reply: "I am one payment
 * behind. The report is ready now." Then, a turn later, "I am one payment behind, and you will pay."
 * The model quoted her sentence back without turning it round, so the product said it was behind on
 * her loan. The judge scored the session 1 for how it felt to be on the other end of it, and it is
 * not hard to see why.
 *
 * NARROW ON PURPOSE. Only a span of the reply that is the person's own sentence, copied - three words
 * or more, in their order - and only its first-person pronouns are turned: I to you, my to your, am to
 * are. A reply that talks about the product itself ("I want to know what it shows") is not their
 * sentence and is left alone. Nothing is cut and nothing is added.
 */

const FIRST_PERSON = /\b(i|i'm|i've|i'll|i'd|me|my|mine|myself|am)\b/i;

const FLIP: [RegExp, string][] = [
  [/\bI am\b/g, 'you are'],
  [/\bI'm\b/g, "you're"],
  [/\bI've\b/g, "you've"],
  [/\bI'll\b/g, "you'll"],
  [/\bI'd\b/g, "you'd"],
  [/\bI was\b/g, 'you were'],
  [/\bam I\b/g, 'are you'],
  [/\bI\b/g, 'you'],
  [/\bmyself\b/gi, 'yourself'],
  [/\bmine\b/gi, 'yours'],
  [/\bmy\b/gi, 'your'],
  [/\bme\b/gi, 'you'],
];

const words = (t: string) => (t ?? '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function turned(span: string): string {
  let out = span;
  for (const [re, to] of FLIP) out = out.replace(re, to);
  return out;
}

/** Capital where the span opened the sentence, so "I am" at the start becomes "You are", not "you are". */
const capitalisedLike = (original: string, replaced: string) => (/^[A-Z]/.test(original) ? replaced.charAt(0).toUpperCase() + replaced.slice(1) : replaced);

/**
 * The sentence with any copied first-person span of theirs turned to the second person. Unchanged
 * where nothing they said appears in it, or what appears carries no first-person pronoun.
 */
export function inYourPerson(sentence: string, personSaid: string[]): string {
  let out = sentence;
  for (const said of personSaid) {
    for (const theirs of (said ?? '').split(/(?<=[.!?])\s+/)) {
      const ws = words(theirs);
      if (ws.length < 3 || !FIRST_PERSON.test(theirs)) continue;
      const re = new RegExp(`\\b${ws.map(escape).join(`[^a-z0-9]+`)}\\b`, 'i');
      const m = re.exec(out);
      if (!m) continue;
      /*
       * THEIR WORDS IN QUOTATION MARKS STAY THEIRS (release check, 9 October). "Would you like me to write down "I will ask Grace
       * ..." as something you will do?" quotes them exactly, as the prompt asks; turning it read "write down "You will ask Grace
       * ...". A span inside quotation marks is left as they said it.
       */
      const before = out.slice(0, m.index);
      const openStraight = (before.match(/"/g) ?? []).length % 2 === 1;
      const openCurly = before.lastIndexOf('\u201c') > before.lastIndexOf('\u201d');
      if (openStraight || openCurly) continue;
      /* A capital only where the span opens a sentence: "write down You will ask" is not a sentence. */
      const opensASentence = /(^|[.!?]\s+)$/.test(before);
      const flipped = turned(m[0]);
      /* "I am one payment behind" copied is theirs; "I am here to help" is the product's own I. Only turn what is theirs. */
      out = before + (opensASentence ? capitalisedLike(m[0], flipped) : flipped) + out.slice(m.index + m[0].length);
    }
  }
  return out;
}
