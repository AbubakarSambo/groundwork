import { ENGINE_RULES } from './prompt-library';

/**
 * WHETHER THE PATTERN LIBRARY IS DOING ANYTHING, MEASURED RATHER THAN ARGUED ABOUT.
 *
 * Ninety named behavioural patterns are written out in full inside the conversation prompt - about
 * 16,000 of its 113,000 characters, read on every single turn. The case for cutting them is strong
 * on paper: the catalogue tells the conversation that "the same pattern must appear in three
 * consecutive check-in periods before a pattern code fires", which is a longitudinal rule, and the
 * conversation sees one session. Counting periods is `patterns.service`, which has its own prompt
 * and does not use these codes at all.
 *
 * WHY THAT IS NOT ENOUGH TO CUT ON. Hafsah's worry, and it is the right one: the conversation may be
 * using the pattern NAMES to shape a probe in the moment - seeing scope rewriting in what somebody
 * just said and asking about it, with no counting involved. If that is happening it is real value,
 * and it would not show up in a short replay. Nobody can currently tell the difference between "this
 * catalogue does nothing" and "this catalogue quietly shapes every probe".
 *
 * SO THIS COUNTS INSTEAD. One log line per reply that reaches a pattern's own language. A week of
 * real conversations then answers the question, the same way "noted, not removed" is answering what
 * the invention gate was worth.
 *
 * WHAT IT CANNOT TELL US, STATED PLAINLY SO NOBODY OVERREADS THE NUMBER. A reply can be shaped by
 * the catalogue without using its words: the model may probe scope rewriting in plain language and
 * never come near the phrase. So a high count is strong evidence the library is working and a zero
 * count is weak evidence that it is not. It narrows the question; it does not close it. If the count
 * is zero, the next step is to cut the catalogue on a branch and compare conversations, not to
 * declare it dead on this number alone.
 *
 * IT CHANGES NOTHING. No reply is inspected for correctness, scored, edited or re-asked. It reads a
 * string and writes a log line.
 */

/** `M2+ = Force Multiplier`, read out of the prompt itself so the two cannot drift apart. */
function theNamedPatterns(): { code: string; label: string; words: string[] }[] {
  const rows = [...ENGINE_RULES.matchAll(/^([A-Z]\d+\+?)\.\s+([A-Z][A-Za-z \-/]{3,45}):/gm)];
  return rows.map((m) => {
    const label = m[2].trim();
    return {
      code: m[1],
      label,
      /* The words that make the label distinctive. Short ones carry no signal and match everything. */
      words: label.toLowerCase().split(/[\s/-]+/).filter((w) => w.length >= 5),
    };
  });
}

const THE_PATTERNS = theNamedPatterns();

/** How many of a label's distinctive words must appear before it counts as reaching for that pattern. */
const ENOUGH_TO_BE_THAT_PATTERN = 2;

/**
 * Which patterns, if any, this reply reached for. Conservative on purpose: a single shared word is
 * a coincidence, so a one-word label can never match and a two-word label needs both.
 */
export function thePatternsThisReplyReachedFor(reply: string): { code: string; label: string }[] {
  const text = ` ${(reply ?? '').toLowerCase()} `;
  if (!text.trim()) return [];
  const found: { code: string; label: string }[] = [];
  for (const p of THE_PATTERNS) {
    if (p.words.length < ENOUGH_TO_BE_THAT_PATTERN) continue;
    const hits = p.words.filter((w) => text.includes(w)).length;
    if (hits >= Math.min(ENOUGH_TO_BE_THAT_PATTERN, p.words.length) && hits === p.words.length) {
      found.push({ code: p.code, label: p.label });
    }
  }
  return found;
}

/** One greppable line, or nothing at all when a reply reached for none of them - which is the usual case. */
export function thePatternLine(checkInId: string, reply: string): string | null {
  const found = thePatternsThisReplyReachedFor(reply);
  if (!found.length) return null;
  return `pattern-library check-in=${checkInId} reached=${found.map((f) => `${f.code}:${f.label}`).join(', ')}`;
}

/** So a week of logs can be read against a denominator rather than as a bare count. */
export const HOW_MANY_PATTERNS_ARE_IN_THE_PROMPT = THE_PATTERNS.length;
