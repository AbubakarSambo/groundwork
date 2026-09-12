/**
 * THE PRODUCT WROTE DOWN A GUESS AS THOUGH SOMEBODY HAD COUNTED.
 *
 * Watched on a live check-in, a salesperson being read against a target of 35:
 *
 *   PERSON:  "I am tracking well, about a third of the way there I would say."
 *   GROUND:  "The system showing it is a clear measure for the 35 units. You're a third of the way
 *            there."
 *
 * He hedged twice - "about", "I would say" - and the reply took both off. What went on the record,
 * and from there onto a page his chief of staff reads to decide what to do about him, is a flat
 * assertion that he is a third of the way to 35. Nobody counted anything. He said roughly.
 *
 * THIS IS THE WORST THING THE PRODUCT CAN DO. Everything else it gets wrong is a missing feature.
 * This is the record holding a sentence the person did not say, in a place where being wrong about
 * somebody costs them something. The whole promise is that what is written down is what was said.
 *
 * WHY IT IS CODE AND NOT A RULE IN THE PROMPT. There is already a rule about not inventing, and it
 * lost - it is one of 273 imperatives in a 927-line instruction, and the model was agreeing with a
 * person, which is the strongest pull there is. A guard that reads the two turns and refuses does
 * not care how the prompt is feeling.
 *
 * IT IS DELIBERATELY NARROW. It fires only where the person hedged a QUANTITY and the reply states
 * that same quantity flatly. Not every hedge, not every number: a person who says "about a third"
 * and gets back "about a third" is fine, and so is a reply that asks about the third.
 */

/** The words people put round a number when they are not sure of it. */
const HEDGES = [
  'about', 'around', 'roughly', 'approximately', 'circa', 'ish', 'or so',
  'i think', 'i would say', "i'd say", 'i guess', 'probably', 'maybe', 'perhaps',
  'more or less', 'give or take', 'somewhere', 'thereabouts', 'nearly', 'almost',
  'close to', 'pretty much', 'a bit', 'sort of', 'kind of',
];

/**
 * A quantity, in the shapes people actually say them: a bare number, a fraction in words, a
 * percentage, or a share. Deliberately not every numeral - a date or an OPS-902 is not a quantity.
 */
/*
 * NO TRAILING \b. A per-cent sign is not a word character, so "30%" followed by a space has no
 * boundary after it and the pattern fell through to the bare-number branch, capturing "30" and
 * losing the unit. The alternatives are each anchored well enough on their own.
 */
/*
 * AND NOTHING GLUED TO A WORD OR A HYPHEN. "tracked in ticket OPS-902" has a word boundary before
 * the 902, so the bare-number branch read a ticket reference as a quantity of something - on the
 * very check-in this was written from. A number that is part of an identifier is not a count.
 */
const QUANTITY = /(?<![\w-])(\d+(?:\.\d+)?\s*(?:%|per ?cent|percent)|\d+(?:\.\d+)?\s*(?:of|out of)\s*\d+|(?:a |one )?(?:third|quarter|half|fifth|tenth)|\d+(?:\.\d+)?)/gi;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** The quantities in a piece of text, as written. */
export function quantitiesIn(text: string): string[] {
  return (norm(text).match(QUANTITY) ?? []).map((m) => m.trim());
}

/**
 * Was this quantity hedged where they said it?
 *
 * The hedge has to be near the number, in the same sentence. A person can say "I'm not sure about
 * the pipeline" in one breath and "I closed 4" in the next, and the 4 is not a guess.
 */
export function wasHedged(personTurn: string, quantity: string): boolean {
  const t = norm(personTurn);
  for (const sentence of t.split(/(?<=[.!?])\s+|\n+/)) {
    if (!sentence.includes(quantity)) continue;
    if (HEDGES.some((h) => sentence.includes(h))) return true;
  }
  return false;
}

/** Did the reply state this quantity without carrying any hedge of its own? */
export function statedFlatly(reply: string, quantity: string): boolean {
  const r = norm(reply);
  for (const sentence of r.split(/(?<=[.!?])\s+|\n+/)) {
    if (!sentence.includes(quantity)) continue;
    /* A question about the number is not an assertion of it, and neither is a hedged restatement. */
    if (sentence.trimEnd().endsWith('?')) continue;
    if (HEDGES.some((h) => sentence.includes(h))) continue;
    return true;
  }
  return false;
}

/**
 * The quantity this reply hardened, if any. One is enough to send it back.
 */
export function hardenedAGuess(personTurn: string, reply: string): string | null {
  if (!personTurn?.trim() || !reply?.trim()) return null;
  for (const q of quantitiesIn(personTurn)) {
    if (wasHedged(personTurn, q) && statedFlatly(reply, q)) return q;
  }
  return null;
}

/**
 * WHAT TO SAY INSTEAD, which is not "add the word about".
 *
 * Putting the hedge back would keep a number nobody counted at the centre of the turn. The useful
 * move is the one a good manager makes: take the estimate as an estimate and ask what it is an
 * estimate OF. That is also the only way the number ever becomes real.
 */
export const DO_NOT_HARDEN_IT = (quantity: string): string =>
  `Your last reply stated "${quantity}" as a fact. They did not say it as one - they hedged it. ` +
  'Never restate somebody\'s estimate as though they had counted it: what goes on the record is ' +
  'what they said, and they said roughly. Say the same thing again, keeping it as their estimate, ' +
  'and ask what the actual figure is and where it can be seen.';
