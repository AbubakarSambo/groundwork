/**
 * THE PRIVATE SUMMARY OPENS WITH A SENTENCE, NOT A LABEL AND A COLON (request 60).
 *
 * The prompt for a person's private closing summary told the model to open with the exact phrase
 * "What you shared:", so every summary a person read began "What you shared: You are aiming for…".
 * The prompt now asks for "Here is what you shared." as a sentence of its own. Summaries stored
 * before that change, and any the model still writes the old way, are read through this, so no
 * reader gets the colon-joined opening, whichever route serves the summary.
 */
const THE_OLD_OPENING = /^\s*What you shared\s*:\s*/i;

export const THE_OPENING_SENTENCE = 'Here is what you shared.';

export function openingWithASentence(summary: string): string {
  if (typeof summary !== 'string' || !THE_OLD_OPENING.test(summary)) return summary;
  const rest = summary.replace(THE_OLD_OPENING, '').trim();
  if (!rest) return THE_OPENING_SENTENCE;
  return `${THE_OPENING_SENTENCE} ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
}

/** The stored summary (a JSON string), parsed, with its opening made a sentence. Null when unreadable. */
export function thePrivateSummaryAsRead<T = { summary?: string; whatToCarry?: string }>(stored: string | null | undefined): T | null {
  if (!stored) return null;
  let parsed: any;
  try { parsed = JSON.parse(stored); } catch { return null; }
  if (parsed && typeof parsed === 'object' && typeof parsed.summary === 'string') {
    parsed = { ...parsed, summary: openingWithASentence(parsed.summary) };
  }
  return parsed as T;
}
