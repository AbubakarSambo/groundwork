import { stripCloseMarker } from '../conversation/prompt-library';
import { withoutDashes } from '../reports/forensic-voice';
import { houseStyle } from '../conversation/anthropic.service';

/**
 * THE ONE PLACE ANYTHING CROSSES FROM THE SYSTEM TO A PERSON.
 *
 * Four transforms already existed and each was applied on some paths and not others. Counted
 * across the four services that emit human-facing text:
 *
 *                        conversation  entry  reports  board
 *   stripCloseMarker            4        0       0       0
 *   VOCABULARY_RULE             2        0       0       0
 *   withNames                   0        0       3       2
 *   withoutDashes               0        0       2       0
 *   houseStyle                  2        0       0       0
 *
 * FIVE, and two of them ANSWER THE SAME QUESTION DIFFERENTLY. `houseStyle` turns an em dash into a
 * hyphen; `withoutDashes` turns it into a comma. Which one a sentence met depended on which service
 * produced it, so the product had two typographic conventions and no way to notice.
 *
 * `entry.service.ts` applied NONE of them, which is why every visible leak in the screenshots was
 * on `/start` - the first thirty seconds of the product and the least defended path in it. A
 * reader saw `[[SESSION_COMPLETE]]` printed in a chat bubble and `**Outreach:**` with its asterisks
 * intact, because the authenticated check-in strips both and the anonymous one never learned how.
 *
 * The pattern is the one both earlier audits named: two places that must agree, each correct
 * alone, nothing reconciling them. Fixing the strings would have closed two instances and left
 * the seam missing. This is the seam.
 *
 * WHAT BELONGS HERE: anything that is true of every human-facing string regardless of which
 * feature produced it. WHAT DOES NOT: judgement calls about wording, which belong in prompts.
 */

/** A control marker the model is told to emit. Never a thing a person should read. */
const CONTROL_MARKERS = [/\[\[[A-Z_]+\]\]/g];

/**
 * MARKDOWN IS STRIPPED, NOT RENDERED, AND THAT IS A DELIBERATE CHOICE.
 *
 * The model is asked for structure and emits `**Outreach:**` and numbered lists. Neither chat page
 * renders markdown, so the asterisks reached the screen. The alternatives were to render it in the
 * client or remove it here; removing it wins for now because rendering model output as markup
 * opens a surface that has to be sanitised, and "Outreach: a list of contacts" reads correctly
 * with no emphasis at all. If rich text is wanted later, this is the single place that changes.
 */
function withoutMarkdown(text: string): string {
  return text
    /** Bold and italic, including the `**Label:**` form the reports use most. */
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s.,;:!?)]|$)/g, '$1$2')
    /** `__bold__`, but never inside a snake_case word. */
    .replace(/(^|\s)__(.+?)__(?=\s|$)/gs, '$1$2')
    /** Headings, which a chat bubble has no use for. */
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    /** Bullet markers. The line itself stays. */
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    /** Inline code fences around a phrase, keeping the phrase. */
    .replace(/`([^`\n]+)`/g, '$1');
}

/**
 * Make a string fit to be read by a person.
 *
 * Order matters. Markers go first so a marker adjacent to markup cannot survive by hiding inside
 * it, and the dash pass runs last so any dash introduced by removing markup is caught too.
 */
/**
 * THE WORD THE MODEL SAYS BACK. W-UX-1, the half that was never done.
 *
 * The product's own vocabulary guard scans the CLIENT tree, so every string a person can type was
 * fixed and nothing checked what the model says. Seen in a live session: the assistant's own reply
 * read "confirm the renewal ground", on a screen where every button, tab and email says check-in.
 *
 * AN INSTRUCTION WAS ALREADY THERE AND ALREADY FAILING. `VOCABULARY_RULE` tells the model this in
 * plain words, in the prompt. It leaks anyway, and it will keep leaking: "ground" is an ordinary
 * English word and the model has no memory of which sense this product forbids.
 *
 * So it is fixed at the boundary every reply already passes through, where it is arithmetic rather
 * than compliance.
 *
 * WHAT IS DELIBERATELY NOT TOUCHED:
 *   - "Groundwork", the product's name. It contains the word and must survive intact.
 *   - "background", "playground", "on the ground", "ground floor", "groundless" - ordinary English
 *     where the word is not naming this object. A word-boundary match with the compounds excluded.
 *   - "grounded"/"grounding", which the interview uses in its ordinary sense.
 *
 * The replacement keeps the sentence's grammar: "the ground" becomes "the check-in", "grounds"
 * becomes "check-ins", and the capital is preserved so a sentence-opening "Ground" is not lowercased
 * mid-repair.
 */
export function oneWordForTheThing(text: string): string {
  /**
   * THE BRAND NEEDS NO SPECIAL HANDLING, and it did in an earlier version of this. "Groundwork" has
   * no word boundary after "Ground", so `\bground\b` cannot match inside it - the escape-and-restore
   * dance that used to sit here protected nothing, and a mutation proving it could be deleted with
   * every test still green is how it was found. The test for it stays: the invariant is real even
   * though the mechanism was not.
   */
  let out = text;

  /**
   * ONLY WHERE A DETERMINER GOVERNS IT, which is what makes it the product's noun rather than
   * ordinary English.
   *
   * A blanket word swap was tried first and it corrupted real sentences: "we covered a lot of
   * ground", "they gained ground on the backlog". Each one is fixable with another exclusion, and
   * that list has no end - "ground" is an ordinary English word.
   *
   * THIS TEXT QUOTES PEOPLE. A wrong replacement does not read oddly, it puts words in somebody's
   * mouth inside their own record, which is the one thing this product must never do. So the rule is
   * narrow on purpose: "the renewal ground" converts, "gained ground" does not, and the cost of the
   * narrowness is that a bare "Ground closed." is left as it is.
   */
  /**
   * UP TO THREE WORDS BETWEEN THE DETERMINER AND THE NOUN, and quotes count as part of a word.
   *
   * The first version allowed one plain word, so it caught "the renewal ground" and missed
   * `the "New hire" ground` - which is exactly what the setup chat said the first time it was
   * watched, quotation marks and all. A name sitting between the two is the commonest way this
   * phrase actually occurs.
   */
  const DETERMINER = /\b(the|this|that|these|those|a|an|your|their|our|my|its|each|every|no|any|some|another|both|all)\s+((?:[\w'"\u2018\u2019\u201c\u201d-]+\s+){0,3})(ground)(s?)\b(\s+\w+)?/gi;

  out = out.replace(DETERMINER, (match, det: string, adj: string | undefined, word: string, plural: string, after: string | undefined) => {
    const next = (after ?? '').trim().toLowerCase();
    /** Compounds where the determiner is real but the noun still is not ours. */
    if (['floor', 'level', 'rules', 'rule', 'truth', 'zero', 'water', 'cover', 'staff', 'for'].includes(next)) {
      return match;
    }
    /**
     * "OF GROUND" IS ALWAYS THE EVERYDAY SENSE, whatever determiner started the phrase.
     *
     * Widening the gap to three words to catch `the "New hire" ground` also swept up "a lot of
     * ground" - "a" is a determiner and "lot of" fits the gap - which turned somebody's own words
     * into "a lot of check-in". This text quotes people, so that is not a cosmetic error.
     */
    if (/\bof\s*$/i.test(adj ?? '')) return match;
    const replacement = plural ? 'check-ins' : 'check-in';
    const cased = /^[A-Z]/.test(word) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
    return `${det} ${adj ?? ''}${cased}${after ?? ''}`;
  });

  return out;
}

/**
 * THE ENGINE DOES NOT NARRATE THE RECORD.
 *
 * The prompt has forbidden this at length for a long time, in its own words: never say "that is now
 * in your record", "your record now shows", "noted in your record", or any variant that narrates the
 * act of recording, because "that is software describing its own database write. A person does not
 * do it."
 *
 * The rule is right and it was unenforced. Driving five scenarios through the live engine produced
 * three violations in two of them:
 *
 *   "Your record shows you see this as a capacity management issue, not a capability one."
 *   "I've noted that."
 *   "That's a specific reason, and it's now in the record: ..."
 *
 * A rule that lives only in wording holds until the model is tired. This is the same seam the
 * house-style pass already uses, so every reply goes through it - streaming and not - and the
 * instruction stays where it is, because a model that never needed correcting is better than one
 * corrected after the fact.
 *
 * IT STRIPS THE CLAUSE, NOT THE SENTENCE. "Your record shows you see this as X" carries a real
 * observation behind the narration; deleting the sentence would lose it. The lead-in goes and what
 * follows is kept, capitalised. A sentence that is nothing but narration - "I've noted that." -
 * leaves nothing behind and is dropped whole.
 *
 * There is a second reason beyond the ban. The adversarial suite checks that an unverified claim is
 * never handed back as established fact, and it recognises attribution in the forms a person uses -
 * "when you say", "your claim that". "Your record shows X" is attribution too, in substance, and is
 * not in that list, so the phrase fails a check it does not deserve to fail. Removing the phrase
 * resolves both without teaching the suite to accept something the product forbids.
 */
/**
 * MID-SENTENCE TOO, WHICH IS WHERE IT WAS ACTUALLY HIDING.
 *
 * This only fired at the start of a sentence, so "That's a specific reason, and it's now in the
 * record:" sailed through - the narration sat after a comma, which is exactly where a model puts it
 * when the sentence has already begun. Fifty-one per cent of turns on the local database mentioned
 * the record to the person whose work it was; this had been catching the tidy ones.
 */
const NARRATION_LEAD_IN =
  /(?:^|(?<=[.!?]\s)|(?<=,\s))(?:and\s+)?(?:that(?:'s| is)\s+(?:now\s+)?(?:a\s+critical\s+entry|(?:in|on)\s+(?:your|the)\s+record)|it(?:'s| is)\s+now\s+(?:in|on)\s+the\s+record|your\s+record(?:\s+\w+){0,3}\s+(?:shows|reflects|says)(?:\s+that)?|noted\s+in\s+your\s+record|i(?:'ve| have)\s+noted(?:\s+that)?|that\s+gap\s+is\s+now\s+in\s+your\s+record)\b[\s,:—-]*/gi;

/**
 * THE SAME NARRATION, ARRIVING AT THE END OF THE SENTENCE INSTEAD OF THE START.
 *
 * `NARRATION_LEAD_IN` catches "That's now on the record, and..." because it expects the announcement
 * to LEAD. Live, this came back:
 *
 *   "That Zainab has not been told is now on the record."
 *
 * Same announcement, at the tail, with the actual content wedged in the middle - so the lead-in
 * pattern matched nothing and the whole sentence went out. Her reading of it: "seems like legal
 * terms in a court".
 *
 * She is right, and it is worse than stiff. Telling somebody their colleague's failure has been
 * entered into a record is the sentence that makes a person stop being candid - which is the one
 * thing this product cannot afford, since candour is the entire input. What she wants said instead
 * is what it is FOR: "has been noted and this helps with context on how you might proceed."
 *
 * KEPT, NOT DROPPED. The clause carries the finding - Zainab has not been told - so removing the
 * sentence would remove the substance with the ceremony. The tail goes and the clause becomes the
 * sentence.
 */
const NARRATION_TAIL =
  /^\s*(?:and\s+)?that\s+(?<clause>.+?)\s+(?:is|are|goes|go|has\s+been(?:\s+\w+)?|have\s+been(?:\s+\w+)?)\s+(?:now\s+)?(?:in|on|onto|into)\s+(?:your|the)\s+record\b[\s.!]*$/i;

/** The tail form, rewritten to the clause it was wrapped around. Returns null when it does not apply. */
export function unwrapRecordNarration(sentence: string): string | null {
  const m = NARRATION_TAIL.exec(sentence.trim());
  const clause = m?.groups?.clause?.trim();
  if (!clause) return null;
  const t = clause.charAt(0).toUpperCase() + clause.slice(1);
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

export function withoutRecordNarration(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.map((sentence) => {
    /* The tail form first: it rewrites the whole sentence, so a lead-in pass over it would be
       looking at a string this is about to replace. */
    const unwrapped = unwrapRecordNarration(sentence);
    if (unwrapped) return unwrapped;
    const cleaned = sentence.replace(NARRATION_LEAD_IN, '');
    if (cleaned.trim() === sentence.trim()) return sentence;
    /* Nothing but the narration: the sentence existed only to announce the write. */
    if (!/[a-z0-9]/i.test(cleaned)) return '';
    /* What followed the lead-in is the real content. It now starts the sentence. */
    const t = cleaned.trimStart();
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  return kept.filter((s) => s.trim() !== '').join(' ');
}

/**
 * THE SENTENCE THAT ONLY MARKS THE ANSWER.
 *
 * "That's a specific example, which is helpful." "That's a really important distinction." "Thank
 * you for starting with that." A quarter of turns on the local database opened this way, and it is
 * the single habit that made the product feel like an examiner: your answer is graded, then the
 * next question is put.
 *
 * ONLY WHEN THE SENTENCE IS NOTHING ELSE, which is the same rule the narration stripper follows and
 * for the same reason. "Eighteen percent of recurring revenue is a clear and specific impact" is
 * also a grade, and it carries the eighteen per cent - dropping it would delete what the person
 * said in order to fix how it was received. Those are the character sketch's job, not this one.
 *
 * So this removes the sentences that are pure mark and nothing more, and leaves anything with
 * content in it alone even when the framing is wrong.
 */
const A_MARK_AND_NOTHING_ELSE =
  /^(?:and\s+)?(?:that(?:'s| is)\s+the kind of (?:honesty|candour|candor|clarity|insight|self-awareness|openness|precision|rigour|rigor|courage|maturity)(?:[\s,]+\w+){0,8}|that(?:'s| is)\s+(?:a\s+|an\s+)?(?:really\s+|very\s+|quite\s+)?(?:\w+\s+and\s+)?(?:specific|clear|crisp|helpful|useful|important|good|great|strong|excellent|valuable|significant|striking|thorough|detailed)(?:[\s,]+\w+){0,5}|thank you for(?:[\s,]+\w+){0,6}|well put|nicely put|good\s+answer)\s*[.!]?$/i;

export function withoutTheMark(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((sentence) => {
    const bare = sentence.trim().replace(/^["']|["']$/g, '');
    return !A_MARK_AND_NOTHING_ELSE.test(bare);
  });
  /* If every sentence was a mark, the turn said nothing - keep it rather than send an empty one. */
  return kept.length ? kept.join(' ') : text;
}

export function forHumans(text: string | null | undefined): string {
  if (!text) return '';
  let out = stripCloseMarker(text).text;
  for (const m of CONTROL_MARKERS) out = out.replace(m, '');
  out = withoutMarkdown(out);
  /**
   * ONE ANSWER ON THE DASH, AND IT IS THE COMMA.
   *
   * `withoutDashes` runs before `houseStyle` deliberately. A dash between clauses is punctuation
   * doing a comma's job, so a comma is the honest replacement and a hyphen just relocates the
   * problem - "the queue - the only thing measured" reads as a false compound. By the time
   * houseStyle sees the text there is no em dash left for it to hyphenate, so its remaining work
   * is the part nobody disagreed about: curly quotes, ellipses and non-breaking spaces.
   */
  out = withoutDashes(out);
  out = houseStyle(out);
  /** After houseStyle, so a replaced word still gets the house's quotes and spacing. */
  out = oneWordForTheThing(out);
  out = withoutQuotedQuestions(out);
  out = withoutRecordNarration(out);
  /** After the narration strip: a mark and a narration often share the same sentence. */
  out = withoutTheMark(out);
  /** Collapse whatever the removals left behind, without touching paragraph breaks. */
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

/** Did this text carry a close marker? Callers that branch on session end still need to know. */
export function hadCloseMarker(text: string | null | undefined): boolean {
  return !!text && stripCloseMarker(text).hadMarker;
}

/**
 * A QUESTION THE ENGINE IS ASKING IS NOT A QUOTATION.
 *
 * Every scenario pack writes its example questions in quotes - `"What do you want to get out of this
 * role?"` - because that is how you show somebody a form of words. The model copies the punctuation
 * along with the question, so replies arrive as:
 *
 *   The data shows two paying clients. "In your own words, what are you trying to achieve?"
 *
 * which reads as though it is quoting somebody. It is asking. Nobody said it.
 *
 * Found by driving a seeded check-in, and it is not new - it will have been in every reply whose
 * scenario pack quotes its questions. Narrow on purpose: only a whole sentence wrapped end to end in
 * straight or curly quotes, so a genuine quotation inside a sentence is untouched.
 */
export function withoutQuotedQuestions(text: string): string {
  const unwrapped = text.replace(
    /(^|[\n.!?]\s*)["\u201C]([^"\u201C\u201D\n]{8,})["\u201D](?=\s*($|[\n]))/g,
    (_m, lead, inner) => `${lead}${inner}`,
  );

  /*
   * AND THE MALFORMED CASE, WHICH IS THE COMMON ONE.
   *
   * Driving it produced this, verbatim:
   *
   *   ... for the quarter. "What are you focused on?"
   *   "We can dig into those numbers. First, let's get your objectives down. "What are you focused on?"
   *
   * An opening quote that never closes, then another. The pair-matcher above cannot see it, because
   * there is no pair. A reply whose quote marks do not balance is already broken punctuation, and
   * removing them all reads better than leaving a dangling one halfway through a sentence.
   *
   * The cost is a genuine quotation losing its marks in a reply that was already malformed. That is
   * the right way round: somebody's words shown without quotes still say what they said, while a
   * stray quote makes the engine look like it is reporting speech nobody made.
   */
  const straight = (unwrapped.match(/"/g) ?? []).length;
  if (straight % 2 === 1) return unwrapped.replace(/"/g, '');
  return unwrapped;
}
