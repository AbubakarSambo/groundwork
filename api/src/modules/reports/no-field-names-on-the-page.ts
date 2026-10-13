/**
 * NO FIELD NAMES ON THE PAGE, AND NO SENTENCE TWICE (journey walk, 11 October, rows 1 and 2).
 *
 * Reports written before the rebuild stored some differences with their parts joined into one
 * string: "Clarity on onboarding support. atStake: If this holds, ...". Read as they were stored,
 * the heading under "Where things stand" carried "atStake:" in the middle of it, and the
 * conversation worth having said the same sentence twice.
 *
 * Nobody's words change here. A key-joined string is split back into its parts (the topic, and
 * each named field after it), and a sentence repeated exactly is dropped. Pure, no database, so
 * every report built through theSessionReport is read the same way, old rows included.
 */

/** A camelCase field name followed by a colon, as an engine key would be written: atStake:, settledBy:, whyItMatters:. */
const A_FIELD_NAME = /(?:^|\s+)([a-z]+(?:[A-Z][a-z]*)+):\s*/g;

export interface SplitApart {
  /** What came before the first field name. */
  head: string;
  /** Each field name found, with the text that followed it. */
  fields: Record<string, string>;
}

/** Split "Topic. atStake: text. settledBy: text" back into its parts. A string with no field name comes back whole. */
export function splitAtFieldNames(text: string): SplitApart {
  const matches = [...text.matchAll(A_FIELD_NAME)];
  if (!matches.length) return { head: text.trim(), fields: {} };
  const head = text.slice(0, matches[0].index).trim();
  const fields: Record<string, string> = {};
  matches.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const value = withoutRepeatedSentences(text.slice(start, end).trim());
    if (value && !fields[m[1]]) fields[m[1]] = value;
  });
  return { head, fields };
}

/** Drop a sentence that repeats one already said, exactly (case and outer spaces aside). The first stays. */
export function withoutRepeatedSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const s of sentences) {
    const key = s.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(s.trim());
  }
  return kept.join(' ');
}

/** One readable paragraph: the field names taken out, the parts kept in order, and no sentence twice. */
export function readableWithoutFieldNames(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return text ?? null;
  const { head, fields } = splitAtFieldNames(text);
  const parts = [head, ...Object.values(fields)].filter(Boolean).map((p) => (/[.!?]$/.test(p) ? p : `${p}.`));
  const joined = Object.keys(fields).length ? parts.join(' ') : text;
  return withoutRepeatedSentences(joined);
}
