/**
 * THE MODEL REWORDS. IT DOES NOT DECIDE, AND IT DOES NOT KNOW ANYTHING.
 *
 * Every lane computes its answer from records first. What reaches the model is that finished
 * answer and a style, and what comes back is the same answer said better - or, if anything at all
 * looks wrong with it, the original.
 *
 * The alternative shape, where the model is given the data and asked to answer, is the one that
 * invents a target of fourteen when the record says eleven. Nobody notices, because it reads
 * exactly like the true version.
 */

/**
 * Bump when the wording rules change, so a reply can be traced to the rules that produced it.
 *
 * v2 added the attribution rule, after a live reply turned "(you said end of the quarter)" into
 * "(due end of the quarter)". A small edit and a real drift: the product deliberately holds the
 * WORDS somebody used for a deadline and never a date inferred from them, and that reply asserted a
 * deadline the record does not have. Found by reading what came back rather than that it came back.
 */
import { PLAIN_WORDS, SPOKEN_TO_THE_READER } from '../conversation/plain-words';

/*
 * v4, 26 September 2026: the one wording rulebook arrived in this style. The cache key already
 * hashes the whole system prompt, so a changed style rewords everything anyway; the version is
 * bumped because it is what the assistant records against each reply, and a reply worded under the
 * old rules and one worded under the new should not both read as v3.
 */
export const STYLE_VERSION = 'v4';

/**
 * Kept as a versioned template separate from the engine, per §10.3 - so somebody can change how
 * this sounds without touching what it says.
 */
export const STYLE = `You are Groundwork, talking to somebody about their own work inside their company's own software.

You will be given a DRAFT that is already correct. Say the same thing better.

Rules:
- Keep every fact, number, name and date exactly as the draft has them. Change nothing factual.
- Do not add facts. If the draft does not say it, you do not know it.
- Keep attribution. If the draft says "you said X", it stays something they said. Never restate it as
  a fact about the work - "you said end of the quarter" must not become "due end of the quarter",
  because one is a record of what somebody told us and the other is a deadline we do not hold.
- Plain and direct. No gush, no scripted warmth, no "I'd be happy to".
- Never guess anybody's pronoun from their name. Where the draft does not say, write they and their; a key accounts rep called Chika was written up as "He is managing" by a guess (20 Sep 2026).
- British spelling. No em dashes. Straight quotes.
- Shorter than the draft where you can, never longer.
- If the draft is already the clearest way to say it, return it unchanged.
- Reply with the wording only. No preamble, no explanation, no quotes around it.

${PLAIN_WORDS}

${SPOKEN_TO_THE_READER}`;

/**
 * WHAT WOULD MAKE US KEEP THE DRAFT INSTEAD.
 *
 * The important one is the numbers. A target, a count, a date - these are where invention does real
 * damage and where nobody would catch it by reading, because a wrong number reads exactly like a
 * right one. So every digit-run in the composed text has to appear in the draft. It is a blunt
 * check and it is the one that matters: the model may reorder and reword freely, and the moment it
 * produces a number the record did not, we ship the record's own words.
 *
 * AND THE OTHER DIRECTION, WHICH THIS MISSED FOR LONGER THAN IT SHOULD HAVE.
 *
 * The rule was asymmetric by accident, not by design: a number the model INVENTED was refused, a
 * number it DROPPED went unnoticed. Both are the composer editing the record rather than wording it.
 * Driving the handoff lane found it - a draft reading "the onboarding rewrite - waiting, 2 days"
 * came back as "waiting on you for the onboarding rewrite", which is true, fluent, and quietly
 * missing the only part that made the answer worth asking for.
 *
 * A dropped fact is the harder one to catch by reading, because nothing looks wrong. There is no
 * cost to being strict here either: the fallback is the draft, which has the number in it.
 */
export function safeToUse(draft: string, composed: string | null | undefined, mustKeep: string[] = []): boolean {
  const text = (composed ?? '').trim();
  if (!text) return false;

  /* Something has gone wrong at the provider, or the model has started explaining itself. */
  if (text.length > draft.length * 1.6 + 120) return false;
  if (/^(sure|certainly|of course|here'?s|i'?d be happy)/i.test(text)) return false;

  const inDraft = new Set((draft.match(/\d+/g) ?? []));
  const inText = new Set((text.match(/\d+/g) ?? []));

  /* Invented: a number the record never produced. */
  for (const n of inText) {
    if (!inDraft.has(n)) return false;
  }
  /* Dropped: a number the record produced and the sentence quietly lost. */
  for (const n of inDraft) {
    if (!inText.has(n)) return false;
  }

  /*
   * AND NO PROPER NOUN THE RECORD DID NOT PRODUCE. This one is not hypothetical.
   *
   * Driving the handoff lane returned "Onboarding rewrite (Renewal push), from Alex Smith - blocked
   * for 2 days". There is no Alex Smith. The draft contained no name at all. The composer invented a
   * person and attributed to them the holding-up of somebody else's work, in the one lane whose
   * entire subject is who is waiting on whom - and it passed every check here, because it kept the
   * number. It happened once in five identical requests, which is the worst frequency: never in a
   * demo, eventually in front of somebody.
   *
   * A capitalised word mid-sentence is a name, a product, a team or a place. Every one of those that
   * belongs in the answer is already in the draft, because the draft is the record. One that is not
   * came from the model, and there is no such thing as a harmless invented name in a product whose
   * subject is what people said about each other.
   *
   * Sentence-initial words are exempt because English capitalises them regardless - which does leave
   * a gap, and the gap is bounded by the draft being the fallback rather than by anybody's care.
   */
  const draftWords = new Set(draft.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []);

  /*
   * AND ANYTHING THE CALLER SAID MUST SURVIVE, WHICH THE CALLER NAMES.
   *
   * The mirror of the invented-name rule, and it was missing for the same reason the number rule was
   * asymmetric: an invented name is obviously wrong, and a dropped one looks like good editing. It
   * cost an answer once - asked "what is my role", the draft's "Still to do for Engineer:" came back
   * as "Your next steps:", which is better English and deletes the answer.
   *
   * WHY THE CALLER NAMES IT rather than this working it out: I tried to infer "the name the draft is
   * about" from capitalisation, and it immediately refused a good rewording of a draft whose list
   * items began "Reduce onboarding..." - an ordinary verb at the start of a line is indistinguishable
   * from a name to anything looking at shape alone. The lane knows what its answer is about; nothing
   * here does. Guessing would trade a fault on almost no replies for a fallback on many.
   */
  for (const required of mustKeep) {
    if (required && !text.includes(required)) return false;
  }

  /*
   * AND A QUOTATION IS WHAT THE RECORD SAID, LETTER FOR LETTER (week 17).
   *
   * Anything in quotation marks in the wording has to be somewhere in the draft exactly as it is
   * written there. Rewording may move a quote, never change it: a line put in somebody's mouth by
   * tidying it is invented testimony, and reads exactly like the true version. Straight and curly
   * marks are both read; an apostrophe inside a word is not a quotation mark.
   */
  for (const m of text.matchAll(/"([^"\n]{2,})"|\u201c([^\u201d\n]{2,})\u201d/g)) {
    const quoted = (m[1] ?? m[2]).trim();
    if (!draft.includes(quoted)) return false;
  }

  /*
   * AND THE PRODUCT'S OWN REASONING IS NEVER PUT IN THE READER'S MOUTH.
   *
   * Read on a participant's own report, 20 Sep 2026: "You described how a sales representative
   * feels like a failure because of an internal clock that is out of sync with the buyer's
   * process" - the role map's protect-against paragraph, reworded as something he had said. And
   * "you say that something read once is an incident and read across sessions becomes what people
   * expect of you" - the coaching note's rationale, as his words. He said neither. A wording that
   * introduces "you said / you described / you say" where the draft had no such attribution is the
   * wording inventing testimony, which is the one thing this product cannot do.
   */
  /* "you expect that no pattern will emerge from work like this" (run 6, 20 Sep 2026): a belief, not a word, put in the reader's mouth. */
  const ATTRIBUTES_TO_THE_READER = /\byou(?:'ve| have)? (said|say|says|described|describe|mentioned|mention|told|tell|reported|report|admitted|admit|explained|explain|noted|note|stated|state|wrote|write|expect|expected|believe|believed|think|thought|feel|felt|hope|hoped|assume|assumed|acknowledge|acknowledged|agree|agreed)\b/i;
  /* Counted, not only looked for (5 October 2026, release round): a draft that held one real "you said" let a second, invented one
     through ("You are in session 4 of 6 for this work, and you say that nothing has come up often enough yet to be called a pattern."). */
  const attributions = (s: string) => (s.match(new RegExp(ATTRIBUTES_TO_THE_READER.source, 'gi')) ?? []).length;
  if (attributions(text) > attributions(draft)) return false;
  /* Not splitting on a colon: "the client name: Alex Smith" would put an invented name in first
     position, where the sentence-start exemption lets it through. The conversation guard was
     written with the colon in and its own test caught it there. */
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  for (const sentence of sentences) {
    const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    for (const w of words.slice(1)) {
      if (!/^[A-Z][a-z]/.test(w)) continue;
      if (!draftWords.has(w.toLowerCase())) return false;
    }
  }
  return true;
}

/** The draft handed over as data, fenced and labelled, never interleaved with the instructions. */
export function composePrompt(draft: string): string {
  return `<draft>\n${draft}\n</draft>`;
}

/**
 * The role name out of an onboarding reply, so the composer cannot drop it.
 *
 * Read back out of the draft rather than threaded through as a second argument, because the draft is
 * the single thing the composer is given - and a "must keep" list built from anything else could
 * name a word that is not in the draft at all, which would refuse every composition forever.
 */
export function roleNameIn(reply: { blocks: { type: string; body?: string }[] }): string[] {
  const first = reply.blocks[0];
  if (!first || first.type !== 'text' || !first.body) return [];
  const m = first.body.match(/^You are down as (.+?)\./);
  return m ? [m[1]] : [];
}
