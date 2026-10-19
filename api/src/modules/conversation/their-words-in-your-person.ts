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
/*
 * AND THEIR SENTENCE SAID IN OTHER WORDS, IN THE FIRST PERSON (Drop Access run 1, item 30). Mercy said "I'll follow up with Esther on
 * Kawangware Fresh tomorrow to see if she has a budget." and on her next check-in Groundwork said, as itself, "I'm following up with
 * Esther on Kawangware Fresh tomorrow to see if Fresh has a budget." It was not a copy, word for word, so the turn above did not
 * see it. A sentence of the reply that opens with "I" and is about what one of their own first-person sentences is about (most of
 * its words are theirs: the same people, places and things) is their sentence in our mouth, and it is said back to them as theirs:
 * "You're following up with Esther ...". The product's own "I" ("I will ask you how it went", "I have one more question") shares
 * almost nothing with what they said and is left alone.
 */
const OPENS_IN_THE_FIRST_PERSON = /^\s*(?:I|I'm|I've|I'll|I'd|I am|I will|I was|My)\b/;
const CARRIES_NOTHING = new Set(['that', 'this', 'with', 'from', 'have', 'will', 'been', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'would', 'could', 'should', 'about', 'into', 'over', 'more', 'also', 'just', 'then', 'than', 'some', 'today', 'still', 'going', 'make', 'sure', 'want', 'need', 'know', 'think', 'your', 'yours']);
const stem = (w: string) => w.replace(/(?:ing|ed|es|s)$/, '');
const carriers = (t: string) => [...new Set(words(t).filter((w) => w.length >= 4 && !CARRIES_NOTHING.has(w)).map(stem))];
function aSentenceOfTheirsInOurMouth(sentence: string, personSaid: string[]): boolean {
  if (!OPENS_IN_THE_FIRST_PERSON.test(sentence)) return false;
  const ours = carriers(sentence);
  if (ours.length < 3) return false;
  for (const said of personSaid) {
    for (const theirs of (said ?? '').split(/(?<=[.!?])\s+/)) {
      if (!FIRST_PERSON.test(theirs)) continue;
      const t = new Set(carriers(theirs));
      const shared = ours.filter((w) => t.has(w)).length;
      if (shared >= 3 && shared / ours.length >= 0.6) return true;
    }
  }
  return false;
}

export function inYourPerson(sentence: string, personSaid: string[]): string {
  /* Sentence by sentence, keeping the spaces and line breaks between them. */
  let out = sentence.split(/((?<=[.!?])\s+)/).map((part) => {
    if (!part.trim() || !aSentenceOfTheirsInOurMouth(part, personSaid)) return part;
    const lead = part.match(/^\s*/)?.[0] ?? '';
    const body = turned(part.slice(lead.length));
    return lead + body.charAt(0).toUpperCase() + body.slice(1);
  }).join('');
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
  return aSentenceOfTheirsInsideOurs(out, personSaid);
}

/*
 * THEIR SENTENCE INSIDE OURS, SAID AS PART OF IT (Drop Access short run, item 4). Kevin read "You said Doing well means
 * consistently hitting my sales targets and bringing in new clients., then reported specific sales." Their sentence went in
 * whole, with its capital and its full stop, in the middle of ours. After "you said", "you mentioned" or "you told us", what
 * they said is reported: its first word in small letters (unless it is a name, which they write with a capital anywhere),
 * their "I" and "my" said as "you" and "your", and never a full stop before a comma. Words in quotation marks are left as
 * they are.
 */
const YOU_SAID = /\b([Yy]ou (?:said|mentioned|told us|told me|wrote|stated)(?: that)?) ([A-Z][a-z'’]+)\b/g;
function aNameTheyWrite(word: string, personSaid: string[]): boolean {
  if (/^I(?:['’].*)?$/.test(word)) return true;
  /* A word they write with a capital where it does not open a sentence is a name, and so is a name on the roster ("Joseph"). */
  if (personSaid.some((t) => new RegExp(`(?:[^.!?\\s]\\s+|,\\s*)${escape(word)}\\b`).test(String(t ?? '')) || new RegExp(`^${escape(word)}(?:\\s|$)`).test(String(t ?? '').trim()) && !/[.!?]\s*$/.test(String(t ?? '').trim()))) return true;
  /* Only a word that opens one of their own sentences is taken as their sentence's first word. */
  return !personSaid.some((t) => new RegExp(`(?:^|[.!?]\\s+)${escape(word)}\\s`).test(String(t ?? '')));
}
export function aSentenceOfTheirsInsideOurs(text: string, personSaid: string[]): string {
  let out = text.replace(YOU_SAID, (whole, lead: string, word: string, offset: number, all: string) => {
    const before = all.slice(0, offset);
    const inQuotes = (before.match(/"/g) ?? []).length % 2 === 1 || before.lastIndexOf('\u201c') > before.lastIndexOf('\u201d');
    if (inQuotes || aNameTheyWrite(word, personSaid)) return whole;
    return `${lead} ${word.charAt(0).toLowerCase()}${word.slice(1)}`;
  });
  /* Their "my" and "I" in what is reported, up to the end of the clause. */
  out = out.replace(/\b([Yy]ou (?:said|mentioned|told us|told me|wrote|stated)(?: that)? )([a-z][^,;:?!"“”]*?)(?=\.?,|[;:?!]|\.(?:\s|$)|$)/g, (_w, lead: string, clause: string) => lead + turned(clause));
  /* No full stop before a comma: "new clients., then" is "new clients, then". */
  return out.replace(/([A-Za-z]{2,})\.,(\s)/g, '$1,$2');
}
