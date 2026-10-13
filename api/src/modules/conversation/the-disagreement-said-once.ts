/**
 * THE DISAGREEMENT, SAID OUT LOUD, ONCE, IN EACH PERSON'S OWN SESSION.
 *
 * Six runs, 20-21 September 2026. Funmi says $400k; Tunde says "the $400k wasn't a figure I was aware
 * of". Ngozi says credit is at 52%; Dayo says "it's not my job to chase payments". Ibrahim says Halima
 * is two instalments behind; Halima says she is vaccinating and at 240 eggs. Each conversation knew
 * the other side existed and never said the one sentence that matters. The lead's expectation of a
 * person reached them, if at all, as a bare number they could not place: "is $35,000 your own part of
 * the $400,000?"
 *
 * The lead's expectation of a person is shareable by design - it is the target set for them. So the
 * product writes one sentence and hands it to the model as the sentence to say, once, when the gap is
 * known, attributed to the lead by name, never as "you said":
 *
 *   To the person:  "Funmi has said the role should bring in $400,000 in the first year. You have
 *                    said the first quarter is about relationships. This report will show both."
 *   To the lead:    "Tunde's account says the first quarter is about relationships; you set $400,000.
 *                    That is the gap the report will show."
 *
 * The lead hears the product's summary of the person's account, never their exact words (the
 * manager reads the report, not the words). The person hears the lead's target by the lead's name. A
 * ground can turn the participant side off (participantsHearTheLeadsExpectation); the lead side is
 * always on, because it is their own expectation being read back to them.
 *
 * Once said, it is not said again in any session of the ground: the coverage read marks it by the number it carries.
 */

export interface AGapToSay {
  /** The lead's first name, or "the lead" where nobody may name them. */
  leadName: string;
  /** The target the lead set for this person, or the shared target that applies to them. */
  target: { name: string; target: number | null } | null;
  /** This person's own words about what they are working to, latest first; the first is used. */
  theirOwn: string[];
  /** For the lead's side: the person's first name (or role) and the product's one-line read of their account. */
  personName?: string;
  personHeadline?: string | null;
}

const fmt = (n: number): string => (Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n));
const clean = (t: string): string => (t ?? '').replace(/\[VERIFIABILITY:\w+\]\s*/g, '').replace(/\[INFERRED:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().replace(/[.]+$/, '');
const short = (t: string, max = 140): string => (t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t);

/** The sentence to the person. Null when there is no lead-set target, or nothing of theirs to set against it. */
export function theSentenceToThePerson(g: AGapToSay): string | null {
  if (!g.target?.name?.trim() || !g.theirOwn?.length) return null;
  const own = clean(g.theirOwn[0]);
  if (!own) return null;
  const number = g.target.target != null ? ` (${fmt(g.target.target)})` : '';
  return `${g.leadName} has set this for you: ${clean(g.target.name)}${number}. You have said: "${short(own)}". This report will show both, side by side.`;
}

/** The sentence to the lead. Null when the product has no read of the person's account yet. */
export function theSentenceToTheLead(g: AGapToSay): string | null {
  if (!g.target?.name?.trim() || !g.personName || !g.personHeadline?.trim()) return null;
  const number = g.target.target != null ? ` (${fmt(g.target.target)})` : '';
  /* The figure they have never said: the sentence names that, rather than reading a headline back as an account. */
  if (/set by the lead, not yet said by them/.test(g.personHeadline)) {
    return `${g.personName} has not said the ${g.target.target != null ? fmt(g.target.target) : 'figure'} you set for them, in anything on this record so far. That is the gap this report will show.`;
  }
  /*
   * A HEADLINE THAT ALREADY NAMES THEM IS THEIR ACCOUNT ON ITS OWN (decision 139, item 1, left from change 1). Named for the
   * lead, "Participant A's own account of calls has risen" became "Samuel's own account reads: Samuel Owino's own account of
   * calls has risen". Where the read already opens with their name, it is said once, as it is.
   */
  const headline = clean(g.personHeadline);
  const first = g.personName.trim().split(/\s+/)[0];
  if (first && new RegExp(`^${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(headline)) {
    return `${headline}. You set ${clean(g.target.name)}${number} for them. That is the gap this report will show.`;
  }
  return `${g.personName}'s own account reads: ${headline}. You set ${clean(g.target.name)}${number} for them. That is the gap this report will show.`;
}

/** Has an earlier turn already carried it? The target's number, or the target's first three words, is the mark. */
export function alreadySaid(sentence: string, aiTurns: string[]): boolean {
  const said = (aiTurns ?? []).join('\n').toLowerCase();
  const m = /\(([\d.,]+m?)\)/.exec(sentence);
  if (m && said.includes(m[1].toLowerCase())) return said.includes('will show both') || said.includes('the gap this report will show');
  return said.includes('this report will show both') || said.includes('the gap this report will show');
}

/** The block the model reads: the exact sentence, and the rule around it. */
export function sayTheDisagreementOnce(sentence: string | null, aiTurns: string[]): string {
  if (!sentence) return '';
  if (alreadySaid(sentence, aiTurns)) return 'THE DISAGREEMENT HAS BEEN SAID, in this check-in or an earlier one. Do not say it again; build on whatever they said back.';
  return [
    'THE DISAGREEMENT TO SAY OUT LOUD, ONCE, THIS SESSION. The product wrote this sentence from the record; say it word for word, once, at the point the conversation reaches what they are working to - not as the opener, not as the close. Then ask what they make of it, and take the answer.',
    `  "${sentence}"`,
    'Never soften it into a question about their part of a number. Never say "you said" about the lead\'s figure. After it is said, do not raise it again.',
  ].join('\n');
}
