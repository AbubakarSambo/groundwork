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

export function nothingSaidYetCannotBeQuoted(reply: string, personTurnsSoFar: number): { text: string; changed: boolean } {
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
    text = text.replace(YOU_SAID, () => {
      changed = true;
      return 'the person who set this up said';
    });
  }
  return { text: changed ? text.replace(/\s+,/g, ',').replace(/\.\s*\./g, '.') : reply, changed };
}
