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

/**
 * A THING TO CARRY IS ADVICE FOR NEXT TIME, NOT THEIR WISH TO STOP (requests 40 and 58).
 *
 * Read live: "One thing for next time: I want to finish now." The model handed back the person's
 * own request to end the check-in as the thing to carry into the next one. Read as advice it says
 * nothing. A short line that is only a wish to stop, finish or be done is no thing to carry, and is
 * served as nothing, whether it was stored before this rule or written after it.
 */
const ONLY_A_WISH_TO_STOP = /^(?:(?:ok(?:ay)?|so|yes|no|please)[,.]?\s+)*(?:i\s+(?:want|would like|'d like|need|wanna)\s+to\s+(?:finish|stop|end|close|wrap(?:\s+up)?|be done|leave)|(?:can we|let'?s|let us)\s+(?:finish|stop|end|close|wrap(?:\s+up)?)|(?:please\s+)?(?:finish|end|close|stop)\s+(?:my|the|this)\s+(?:check-?in|session|conversation)|that'?s\s+(?:all|everything|it)|nothing\s+(?:else|more)|i'?m\s+(?:done|finished))(?:\s+(?:now|here|today|please|for\s+(?:now|today)|this|it|with\s+this))*[\s.!,]*$/i;

export function aThingToCarry(carry: unknown): string {
  if (typeof carry !== 'string') return '';
  const bare = carry.trim().replace(/^["“'‘]+|["”'’.!]+$/g, '').trim();
  if (!bare) return '';
  if (bare.split(/\s+/).length <= 12 && ONLY_A_WISH_TO_STOP.test(bare)) return '';
  return carry;
}

/** The stored summary (a JSON string), parsed, with its opening made a sentence. Null when unreadable. */
export function thePrivateSummaryAsRead<T = { summary?: string; whatToCarry?: string }>(stored: string | null | undefined): T | null {
  if (!stored) return null;
  let parsed: any;
  try { parsed = JSON.parse(stored); } catch { return null; }
  if (parsed && typeof parsed === 'object' && typeof parsed.summary === 'string') {
    parsed = { ...parsed, summary: openingWithASentence(parsed.summary) };
  }
  if (parsed && typeof parsed === 'object' && 'whatToCarry' in parsed) {
    parsed = { ...parsed, whatToCarry: aThingToCarry(parsed.whatToCarry) };
  }
  return parsed as T;
}
