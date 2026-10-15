/**
 * THE SAME PROMISE, WRITTEN TWICE (request 96, group 2's review, fault B): a check-in sometimes puts
 * a short commitment and a fuller, dated one into the record for the same thing someone said they
 * would do ("I will call IT to get her login" beside "I will call IT on Tuesday 29 September to get
 * her login."). Request 96 asks the engine to stop writing both; until it does, this is a reading
 * rule only - nothing is removed from the record, and nothing here decides what counts as kept
 * (`aCommitmentKey`, `the-settlements`, in conversation/what-happened-to-what-they-said.ts, untouched).
 * It only picks which of the two texts a reader is shown, on the To-dos board and "What you said
 * you'd do": the fuller one, never the shorter.
 *
 * TWO TEXTS ARE THE SAME PROMISE when, once a leading "I will"/"I'll"/"I am going to", punctuation,
 * and the words a date or a day is written in (a weekday, a month, an ordinal day-of-month, "today",
 * "tomorrow", "the same day", and the small words that usually sit next to them) are stripped from
 * both, one is the start of the other. That catches a date dropped in at the end ("...the same
 * day.") or in the middle ("...on Tuesday 29 September to get her login."), without matching two
 * genuinely different promises.
 */
const LEADING_I_WILL = /^i\s*['’]?ll\b\s*|^i\s+will\b\s*|^i\s*am\s+going\s+to\b\s*/i;
const DATE_PHRASES = /\bthe\s+same\s+day\b/gi;
const WEEKDAY_OR_MONTH = 'mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday|january|february|march|april|may|june|july|august|september|october|november|december';
/** A day-of-month number only counts as a date when it sits beside the weekday or month it belongs
 *  to ("Tuesday 29", "29 September") - a bare number ("Call customer 0") is content, not a date. */
const NUMBER_BESIDE_A_DATE_WORD = new RegExp(`\\b\\d{1,2}\\s+(?=(${WEEKDAY_OR_MONTH})\\b)|\\b(?:${WEEKDAY_OR_MONTH})\\s+\\d{1,2}\\b`, 'gi');
const DATE_WORDS = new RegExp(`\\b(${WEEKDAY_OR_MONTH}|today|tomorrow|tonight|now|starting|before|after|next|this)\\b`, 'gi');
const ORDINAL_DAY = /\b\d{1,2}(st|nd|rd|th)\b/gi;
const FILLER = /\bon\b/gi;

function skeleton(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(LEADING_I_WILL, '')
    .replace(DATE_PHRASES, ' ')
    .replace(NUMBER_BESIDE_A_DATE_WORD, ' ')
    .replace(DATE_WORDS, ' ')
    .replace(ORDINAL_DAY, ' ')
    .replace(FILLER, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whether `a` and `b` read as the same promise, once the date in whichever carries one is stripped out. */
export function sameRequest(a: string, b: string): boolean {
  const skA = skeleton(a);
  const skB = skeleton(b);
  if (!skA || !skB) return false;
  if (skA === skB) return true;
  const [shorter, longer] = skA.length <= skB.length ? [skA, skB] : [skB, skA];
  return longer.startsWith(shorter);
}

/**
 * ONE OF EACH GROUP OF THE SAME PROMISE, THE FULLER ONE KEPT. Rows are grouped in the order given;
 * a later row that is the same promise as an earlier, still-open group is folded into it, keeping
 * whichever of the two has the longer original text (the fuller words), never changing which one is
 * marked as settled - that is decided by the caller, before or after this runs.
 */
export function fullerOfEachPromise<T extends { text: string }>(rows: readonly T[]): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const at = kept.findIndex((k) => sameRequest(k.text, row.text));
    if (at === -1) {
      kept.push(row);
      continue;
    }
    if (row.text.trim().length > kept[at].text.trim().length) kept[at] = row;
  }
  return kept;
}
