import { targetsFor } from './whose-number-is-whose-business';
/**
 * A TARGET THE LEAD HAS NOT SHARED STAYS WITH ITS OWNER, IN THE WORDS AS WELL AS THE NUMBERS.
 *
 * On a check-in where people see only their own targets (`whoSeesTargets: THEIR_OWN`, every ground
 * in the test database), the board already withholds another person's `target` and `count`. The
 * sentences did not know. Screens request 63, 28 September 2026: an admin who only reads was
 * served "Rukia set a target of four shops for Rukia's own work…" in the row about Rukia. And on
 * run-14's sales check-in Ngozi was served "Kwame Mensah is working towards a target of 14 approved
 * facilities this quarter" in her own report, and the same number in the aim on her board.
 *
 * So wherever the report's or the board's words are served, a sentence that gives a person's target
 * number is taken out for a reader who may not see that target. On a line that is about one person
 * only (their row), any sentence with their target number goes; elsewhere, a sentence goes when it
 * names them and gives the number. The sentence goes whole: a number cut out of a sentence leaves
 * a sentence that still says there is a number, and patching it would be writing something nobody
 * wrote. What the person did, and what is in their way, stays.
 */

export interface AHiddenTarget {
  /** The ways this person is named in what is served: full name, first name, a given name. */
  names: string[];
  target: number;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENS: Record<number, string> = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };

function asWords(n: number): string | null {
  if (!Number.isInteger(n) || n < 0) return null;
  if (n <= 20) return WORDS[n];
  if (n < 100) {
    const t = Math.floor(n / 10) * 10;
    return n % 10 ? `${TENS[t]}[- ]${WORDS[n % 10]}` : TENS[t];
  }
  return null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether a sentence gives this number, in figures (with thousands separators) or in words. */
function givesTheNumber(sentence: string, n: number): boolean {
  const figures = [String(n), n >= 1000 ? n.toLocaleString('en-US') : null].filter(Boolean) as string[];
  if (figures.some((f) => new RegExp(`(?<![\\d.,])${escape(f)}(?![\\d])`).test(sentence))) return true;
  const w = asWords(n);
  return !!w && new RegExp(`\\b${w}\\b`, 'i').test(sentence);
}

const sentencesOf = (text: string) => text.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [text];

/** The text with every sentence that gives a hidden target taken out. */
export function withoutHiddenTargets(text: string, hidden: readonly AHiddenTarget[], opts: { aboutOnly?: AHiddenTarget } = {}): string {
  if (!text || (!hidden.length && !opts.aboutOnly)) return text;
  const sentences = sentencesOf(text);
  const names = (h: AHiddenTarget, s: string) => h.names.some((name) => name && new RegExp(`\\b${escape(name)}\\b`, 'i').test(s));
  /*
   * THE SENTENCE, OR THE ONE JUST BEFORE IT. Read live, 28 Sep 2026: "Kwame Mensah has three so far.
   * ... A target of 17 approved facilities appears in..." - the number's own sentence did not name
   * him; the one before did. A sentence two away is left: "Bisi reports the team has 11 approved
   * facilities" is the team's own count, whoever else carries eleven.
   */
  const kept = sentences.filter((s, i) => {
    if (opts.aboutOnly && givesTheNumber(s, opts.aboutOnly.target)) return false;
    const before = i > 0 ? sentences[i - 1] : '';
    return !hidden.some((h) => givesTheNumber(s, h.target) && (names(h, s) || names(h, before)));
  });
  return kept.join('').replace(/\s{2,}/g, ' ').trim();
}

/** The same, through every string in a served object. Dates and non-strings are left as they are. */
export function withoutHiddenTargetsIn<T>(value: T, hidden: readonly AHiddenTarget[]): T {
  if (!hidden.length) return value;
  const walk = (v: any): any => {
    if (typeof v === 'string') return withoutHiddenTargets(v, hidden);
    if (v instanceof Date || v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walk(x);
    return out;
  };
  return walk(value);
}

/**
 * The targets this reader may not see. Everybody's when a target is its owner's alone, except the
 * reader's own; nobody's when the lead has shared targets with everybody, or when the reader runs
 * the check-in themselves (the lead set them).
 */
export function targetsHiddenFrom(
  reader: { participantId: string | null; isTheLead: boolean },
  whoSeesTargets: string | null | undefined,
  objectives: readonly { ownerParticipantId: string | null; target: number | null }[],
  namesOf: (participantId: string) => string[],
): AHiddenTarget[] {
  /* The one rule for whose number a reader may see (whose-number-is-whose-business). Whatever it does
     not show this reader is hidden in the words too. */
  const all = (objectives ?? []).map((o, i) => ({ name: String(i), target: o.target, ownerParticipantId: o.ownerParticipantId }));
  const shown = new Set(targetsFor(all, reader.participantId, whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own', { isLead: reader.isTheLead }).shown.map((t) => t.name));
  return all
    .filter((t) => !shown.has(t.name) && t.ownerParticipantId && typeof t.target === 'number')
    .map((t) => ({ names: namesOf(t.ownerParticipantId as string).filter(Boolean), target: t.target as number }))
    .filter((h) => h.names.length);
}
