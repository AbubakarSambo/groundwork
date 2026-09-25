/**
 * NOTHING SAID YET CANNOT BE QUOTED BACK.
 *
 * Hafsah, 21 September 2026, on a new hire's first screen: "As Engagement Director, you described your
 * role as bringing in research projects and interventions and building relationships." He had said
 * nothing. The lead typed that role at setup, or the harness did; the field is called roleAsDescribed
 * and the intake block says "the person who set this up described this person's part in it as", with
 * a DO NOT ATTRIBUTE rule under it. The model attributed anyway, and the first sentence a person ever
 * read from this product put someone else's words in his mouth.
 *
 * The rule is checkable in code, so it is checked in code: before this person has typed a single
 * word in this check-in run, no sentence may say they said, described, told, mentioned or wrote
 * anything. The phrase is rewritten to what is true - the role was set out at setup - and the rest of
 * the sentence stands.
 */
const YOU_DESCRIBED_YOUR_ROLE =
  /\b(?:as (?:the |an? )?[A-Za-z][\w\s'-]{0,60}?,\s*)?you(?:'ve| have)? (?:described|said|told (?:me|us)|mentioned|wrote|put|set out|gave) (?:that )?your (?:role|part|job|remit|responsibilit(?:y|ies)) (?:in this |here )?(?:as|is|was|to be|as being)\b/i;

const YOU_SAID = /\byou(?:'ve| have)? (described|said|told (?:me|us)|mentioned|wrote|reported|explained|noted|stated)\b/i;

/**
 * AND WHOEVER SET IT UP HAS A NAME, WHICH IS THE OTHER HALF OF THIS.
 *
 * The rewrite below used to put "the person who set this up said" into the sentence, mid-clause. So
 * the first thing this product ever said to somebody, on the sales scenario, was:
 *
 *   "We are tracking credit sales against the target for this quarter. the person who set this up
 *    said your target is 12 approved facilities."
 *
 * An internal label, dropped into the middle of a sentence, which then starts in lower case - three
 * of the twelve problems in one clause. It should read: "Bisi says your target this quarter is 12
 * approved facilities."
 *
 * Where no name is known the attribution is dropped rather than replaced with another label. "The
 * record says" is true, is not a person, and does not put words in anybody's mouth.
 */
export function nothingSaidYetCannotBeQuoted(
  reply: string,
  personTurnsSoFar: number,
  whoSetItUp?: string | null,
): { text: string; changed: boolean } {
  if (personTurnsSoFar > 0 || !reply) return { text: reply, changed: false };
  let text = reply;
  let changed = false;
  if (YOU_DESCRIBED_YOUR_ROLE.test(text)) {
    text = text.replace(YOU_DESCRIBED_YOUR_ROLE, (m) => {
      changed = true;
      const lead = /^as /i.test(m) ? m.slice(0, m.search(/,\s*you/i) + 1) + ' ' : '';
      return `${lead}your role here was set out as`;
    });
  }
  if (YOU_SAID.test(text)) {
    const attribution = whoSetItUp?.trim() ? `${whoSetItUp.trim()} says` : 'the record says';
    text = text.replace(YOU_SAID, () => {
      changed = true;
      return attribution;
    });
  }
  // A REWRITE LANDING MID-PARAGRAPH USED TO LEAVE THE NEXT WORD IN LOWER CASE.
  // "...this quarter. the record says..." was the ordinary result, not the unlucky one. 201
  // lower-case sentence starts across the run, and this is one of the places they came from.
  // The first character counts as a sentence start too, which is where a replacement at position
  // zero lands.
  const capitalised = text
    .replace(/([.!?]\s+)([a-z])/g, (_m, stop: string, letter: string) => stop + letter.toUpperCase())
    .replace(/^([a-z])/, (letter: string) => letter.toUpperCase());
  return { text: changed ? capitalised.replace(/\s+,/g, ',').replace(/\.\s*\./g, '.') : reply, changed };
}
