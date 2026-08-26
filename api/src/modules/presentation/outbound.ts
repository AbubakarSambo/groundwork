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
  const DETERMINER = /\b(the|this|that|these|those|a|an|your|their|our|my|its|each|every|no|any|some|another|both|all)\s+(\w+\s+)?(ground)(s?)\b(\s+\w+)?/gi;

  out = out.replace(DETERMINER, (match, det: string, adj: string | undefined, word: string, plural: string, after: string | undefined) => {
    const next = (after ?? '').trim().toLowerCase();
    /** Compounds where the determiner is real but the noun still is not ours. */
    if (['floor', 'level', 'rules', 'rule', 'truth', 'zero', 'water', 'cover', 'staff', 'for'].includes(next)) {
      return match;
    }
    const replacement = plural ? 'check-ins' : 'check-in';
    const cased = /^[A-Z]/.test(word) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
    return `${det} ${adj ?? ''}${cased}${after ?? ''}`;
  });

  return out;
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
  /** Collapse whatever the removals left behind, without touching paragraph breaks. */
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

/** Did this text carry a close marker? Callers that branch on session end still need to know. */
export function hadCloseMarker(text: string | null | undefined): boolean {
  return !!text && stripCloseMarker(text).hadMarker;
}
