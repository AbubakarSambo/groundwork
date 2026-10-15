/**
 * ONE STEP, SAID TO YOU, AS A FULL SENTENCE.
 *
 * Read live on the /you board: "One thing for this week: Names what they would do differently,
 * then does it." Colon-joined, third person, clipped - because the step is stored exactly as
 * role-maps.ts's `successSignals` writes it, a library entry written in the third person for its
 * OTHER use as context handed to the model (the-plan-for-this-session.ts, roleBlock in
 * what-to-work-on-next.ts), never meant to be quoted at a person.
 *
 * This is the one place that quotes it, so this is where it is turned into a sentence spoken to
 * "you": the opening verb to its base form ("Names" -> "name"), and every pronoun that referred to
 * the person, written in the third person because the library entry describes anybody in the role,
 * swapped for "you". No model call (decision 7): a small, fixed transform, run at the read.
 */

const IRREGULAR_BASE: Record<string, string> = {
  goes: 'go', does: 'do', has: 'have', is: 'be', can: 'can', will: 'will',
};

/** The base form of a third-person-singular verb: "Names" -> "name", "Goes" -> "go". */
function baseVerb(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_BASE[lower]) return IRREGULAR_BASE[lower];
  if (/ies$/.test(lower)) return lower.replace(/ies$/, 'y');
  if (/(?:ches|shes|xes|zes|sses)$/.test(lower)) return lower.replace(/es$/, '');
  if (/s$/.test(lower)) return lower.replace(/s$/, '');
  return lower;
}

/** Every pronoun in the rest of the sentence that referred to the person, said to them instead. */
function toYou(rest: string): string {
  return rest
    .replace(/\bthemselves\b/g, 'yourself')
    .replace(/\btheirs\b/g, 'yours')
    .replace(/\btheir\b/g, 'your')
    .replace(/\bthem\b/g, 'you')
    .replace(/\bthey\b/g, 'you')
    .replace(/\bdoes\b/g, 'do')
    .replace(/\bhas\b/g, 'have')
    .replace(/\bgoes\b/g, 'go')
    .replace(/\bis\b/g, 'is');
}

/**
 * "Names what they would do differently, then does it." -> "One thing to try this week is to name
 * what you would do differently, then do it." Returns null for an empty step, so a caller never
 * has to guard it twice.
 */
export function aStepSaidToYou(step: string | null | undefined): string | null {
  const s = (step ?? '').trim();
  if (!s) return null;
  const [first, ...rest] = s.split(/\s+/);
  if (!first) return null;
  const verb = baseVerb(first);
  const tail = toYou(rest.join(' '));
  const sentence = `${verb} ${tail}`.replace(/\s+/g, ' ').trim();
  return `One thing to try this week is to ${sentence}${/[.!?]$/.test(sentence) ? '' : '.'}`;
}
