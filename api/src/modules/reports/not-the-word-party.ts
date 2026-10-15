/**
 * THE REPORT SAYS "PARTIES" TO PEOPLE WHO ARE JUST COLLEAGUES.
 *
 * The synthesis prompt instructs the model: do not say "party" or "parties" in anything the reader
 * sees; say the person's label, "the two of you", "everyone in this ground", or just name what
 * happened. That rule was written on 2026-08-10. A report generated on 2026-08-31 opens "Both
 * parties agree that the Renewals owner is responsible for twelve dormant accounts". Three weeks,
 * and the instruction had no effect at all.
 *
 * Same shape as two other rules found dead the same day, and the same answer: a rule that matters
 * is enforced where the text is read, not asked for in a prompt.
 *
 * WHAT THIS MUST NOT TOUCH, AND IT IS THE WHOLE RISK. "the initiator", "the participant" and "the
 * other party" are KEYS. The model emits them as party labels, own-reads-only.ts filters rows by
 * matching them exactly, and the client resolves them into people's names. Rewrite one and the
 * match silently stops working - which does not fail loudly, it keeps the wrong rows, and those
 * rows are other people's private quality reads.
 *
 * Two defences: this never runs on `label` or `participantLabel`, which the caller's NEVER_NAMED
 * set already excludes, and the keys are lifted out of the text before any rule runs.
 */

import { theQuotesKept } from './a-quote-is-what-they-said';

/** The label keys. Never rewritten, anywhere, for any reason. */
const KEYS = ['the other party', 'the initiator', 'the participant'];

/*
 * THE REPLACEMENT HAS TO AGREE WITH THE VERB AFTER IT.
 *
 * The first version turned "Both parties agree that..." into "everyone agree that...", which is
 * worse than the word it was fixing: the jargon at least parsed. "Both" and "all" are already
 * plural, so the verb that follows still works and nothing else in the sentence has to move.
 */
const REPLACEMENTS: Array<[RegExp, string]> = [
  /* Plural first: "both parties" must not reach the bare rule at the bottom. */
  [/\bboth (?:of the )?parties\b/gi, 'both'],
  [/\ball (?:of the )?parties\b/gi, 'all'],
  [/\bthe parties\b/gi, 'they'],
  [/\bevery party\b/gi, 'everyone'],
  [/\beach party\b/gi, 'each person'],
  [/\bneither party\b/gi, 'neither of them'],
  [/\bparties\b/gi, 'people'],
  [/\bone party\b/gi, 'one person'],
  [/\ba party\b/gi, 'a person'],
  /*
   * The bare word last, and it is what makes the key protection above load-bearing rather than
   * decorative: "the other party" ends in it. Without lifting the keys out first, this rule would
   * quietly rewrite a label the client matches on to resolve somebody's name.
   */
  [/\bparty\b/gi, 'person'],
];

/** A sentence that began with a capital still begins with one afterwards. */
function likeFor(original: string, replacement: string): string {
  return /^[A-Z]/.test(original)
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

/* Never inside a quotation: "the other party" in somebody's own words is what they said. See a-quote-is-what-they-said. */
export function notTheWordParty(text: string): string {
  if (!text) return text;
  return theQuotesKept(text, partyOutsideTheQuotes);
}

function partyOutsideTheQuotes(text: string): string {
  if (!text) return text;

  /*
   * The keys are lifted out before anything runs and put back afterwards, so no rule can reach
   * inside one. Done by placeholder rather than by a cleverer regex because "the other party" ends
   * in the exact word being replaced, and a lookahead that got that wrong would fail silently.
   */
  const held: string[] = [];
  let out = text;
  for (const key of KEYS) {
    const pattern = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(pattern, (m) => {
      held.push(m);
      return '\u0000' + (held.length - 1) + '\u0000';
    });
  }

  /* "Sarah is not a party to this check-in" is "Sarah is not in this check-in" (run oct5c, crisis): "a person to this
     check-in" is not English, and somebody outside a check-in is simply not in it. Before the word rules below. */
  out = out.replace(/\b(is|was|are|were)( not)? a party to (this|the) check-in\b/gi, (_m, verb: string, not: string | undefined, which: string) => `${verb}${not ?? ''} in ${which} check-in`);
  for (const [pattern, word] of REPLACEMENTS) out = out.replace(pattern, (m) => likeFor(m, word));

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => held[Number(i)]);
}
