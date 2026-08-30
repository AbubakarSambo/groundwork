/**
 * THE DATE A DEADLINE'S WORDS MEAN, WHERE THEY UNAMBIGUOUSLY MEAN ONE.
 *
 * Hafsah: "yes infer a date but be sure to probe for details in the engine." Both halves matter and
 * this file is only the first. A date is taken where the words carry exactly one, and where they do
 * not, this returns nothing and the interview asks - it never guesses.
 *
 * WHY IT IS NOT DONE IN THE EXTRACTION PROMPT. A model asked for a date will produce one, because
 * producing one is what it is for. The failure that produces is silent and expensive: a vague
 * phrase becomes a hard deadline on somebody's record, and at the next check-in they are asked why
 * they missed something they never agreed to. Rules that refuse are better written as code that can
 * be tested against the cases that must return nothing.
 *
 * `dueSaid` is untouched by any of this. What somebody said stays what they said, and it is still
 * what a person is shown. This is a second, machine-readable reading of it.
 */

/** A single day, at midnight UTC, so nothing here depends on where anybody is sitting. */
function day(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Sunday..Saturday, matching getUTCDay. */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Phrases that sound like deadlines and are not.
 *
 * Every one of these was a real thing somebody could say in a check-in. None of them survives
 * being turned into a date: "soon" is a feeling, "next sprint" needs a calendar this product does
 * not have, and "when procurement clears" is a dependency rather than a date - the kind
 * `GroundDependency` already records properly.
 */
const NOT_A_DATE = [
  'soon', 'shortly', 'asap', 'as soon as', 'in due course', 'at some point', 'eventually',
  'next sprint', 'this sprint', 'next cycle', 'the next release',
  'when', 'once', 'after the', 'before we', 'depending', 'if ',
  'a few', 'couple of', 'some time', 'sometime',
];

/**
 * Read a deadline's words as a date, or return null.
 *
 * `said` is their words. `on` is the day they said them - everything relative is resolved against
 * that and not against now, so re-reading an old check-in cannot move its deadlines.
 */
export function whenTheyMeant(said: string | null | undefined, on: Date): Date | null {
  const t = (said ?? '').trim().toLowerCase();
  if (!t) return null;

  /* A phrase that admits of more than one reading is not a date, whatever else is in it. */
  if (NOT_A_DATE.some((p) => t.includes(p))) return null;

  const y = on.getUTCFullYear();
  const m = on.getUTCMonth();
  const d = on.getUTCDate();

  /* Today and tomorrow, which are the only two relative words with one meaning. */
  if (/^(today|end of (the )?day|eod)$/.test(t)) return day(y, m, d);
  if (/^tomorrow$/.test(t)) return day(y, m, d + 1);

  /*
   * 2026-03-14, 14/03/2026, 14 March 2026. An explicit date is the easy case and the common one
   * once the interview starts asking for one.
   */
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return day(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const named = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\b(?:\s+(\d{4}))?/);
  if (named) {
    const mi = MONTHS.indexOf(named[2]);
    if (mi !== -1) {
      const dd = Number(named[1]);
      if (dd >= 1 && dd <= 31) {
        /*
         * NO YEAR MEANS THE NEXT ONE OF THOSE, not this year's, which may be four months gone.
         * "14 March" said in November means next March, and reading it as this year would put a
         * deadline in the past the moment it was written down.
         */
        const yr = named[3] ? Number(named[3]) : (mi < m || (mi === m && dd < d) ? y + 1 : y);
        return day(yr, mi, dd);
      }
    }
  }

  /* "end of October", "end of the month", "end of the quarter" is a month end, which is one day. */
  const endOfMonth = t.match(/^end of (?:the )?([a-z]+)$/);
  if (endOfMonth) {
    const which = endOfMonth[1];
    if (which === 'month') return day(y, m + 1, 0);
    const mi = MONTHS.indexOf(which);
    /* Same next-one-of-those rule as above. */
    if (mi !== -1) return day(mi < m ? y + 1 : y, mi + 1, 0);
    /* "end of the quarter" needs a financial year nobody has told us. Ask instead. */
    return null;
  }

  /*
   * "Friday", "by Thursday" - the next one of that day, and never today even when today is that
   * day. Somebody saying "Friday" on a Friday means the coming one; reading it as this morning
   * makes a promise late before the sentence finishes.
   */
  const weekday = t.match(/^(?:by |on |this |next )?([a-z]+)$/);
  if (weekday) {
    const wi = WEEKDAYS.indexOf(weekday[1]);
    if (wi !== -1) {
      const ahead = ((wi - on.getUTCDay() + 7) % 7) || 7;
      return day(y, m, d + ahead);
    }
  }

  return null;
}

/**
 * WHAT THE INTERVIEW SHOULD ASK WHEN THE WORDS DO NOT CARRY A DATE.
 *
 * The other half of "infer a date but probe for details". Returned rather than printed so the
 * engine decides when to use it - a person who has just given three answers does not need a
 * fourth question about a word they used in passing.
 *
 * It asks for a day and offers the honest alternative, because "there isn't a date yet" is a real
 * answer and pretending otherwise is how a made-up deadline gets onto somebody's record.
 */
export function askWhenTheyMean(said: string): string {
  return `They said "${said.trim()}", which does not carry a date. Ask which day that is, in their `
    + 'own terms - and accept "there is not a date yet" as an answer rather than pressing for one. '
    + 'Ask once, and only where the promise is one somebody else is waiting on.';
}
