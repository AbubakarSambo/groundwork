import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

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
  /* THEIR WORD, NOT OURS. A rename of the ops system's own vocabulary reached
     in here once and turned these into "target list", so the product stopped
     recognising the most common vague promise an engineer makes — and nothing
     failed, because the tests were renamed in the same pass. What we call our
     own list has no bearing on what a person types into a check-in. */
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

  /*
   * MONTH FIRST, WHICH IS HOW HALF THE WORLD WRITES A DATE AND HOW SHE WROTE IT.
   *
   * The match above reads "1 December 2026" and nothing else, so "December 1 2026" - typed into a
   * live check-in, in answer to a direct question about when - came back as no date at all, and the
   * record said "no date agreed" about a person who had given one.
   *
   * Same rules as the day-first case: an ordinal suffix is optional, the comma is optional, and no
   * year means the next one of those rather than a date already in the past.
   */
  const monthFirst = t.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/);
  if (monthFirst) {
    const mi = MONTHS.indexOf(monthFirst[1]);
    const dd = Number(monthFirst[2]);
    if (mi !== -1 && dd >= 1 && dd <= 31) {
      const yr = monthFirst[3] ? Number(monthFirst[3]) : (mi < m || (mi === m && dd < d) ? y + 1 : y);
      return day(yr, mi, dd);
    }
  }

  /*
   * "END OF THE YEAR", WHICH IS ONE DAY AND WAS BEING TREATED AS A FEELING.
   *
   * Said in a live check-in - "500 contracts by the end of the year" - and recorded as no date
   * agreed. It is the thirty-first of December and there is nothing to ask about: the month-end
   * rule two lines below has read "end of October" as a date since the day it was written, and the
   * year was simply never added to it.
   *
   * "End of 2026" is the same sentence with the year said out loud. No year means this one, unlike
   * a month, because the end of the year has not passed until it has.
   */
  const endOfYear = t.match(/^(?:by )?(?:the )?end of (?:the |this )?(?:year|(\d{4}))$|^(?:by )?year[- ]end$/);
  if (endOfYear) return day(endOfYear[1] ? Number(endOfYear[1]) : y, 11, 31);

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

/**
 * A PERIOD IS NOT A DAY, AND THE PRODUCT MUST NOT QUIETLY PICK ONE.
 *
 * Hafsah, on reading a live check-in where she had said "by the end of the year": "If i say end of
 * year it should rrespond with december? what date?"
 *
 * Both halves of her earlier instruction - "yes infer a date but be sure to probe for details in
 * the engine" - are in this file now. `whenTheyMeant` reads "end of the year" as the thirty-first
 * of December so the product has something machine-readable. This says the reading out loud and
 * asks her to confirm it, because thirty-first of December is our reading of her words and not her
 * words, and a deadline nobody agreed to is the thing a later check-in asks somebody why they
 * missed.
 *
 * A DAY SOMEBODY NAMES IS NOT ASKED ABOUT. "December 1 2026" and "15 May 2027" are dates. Reading
 * those back as a question is the product checking whether somebody meant what they typed.
 */
const A_PERIOD_NOT_A_DAY = [
  /\bend of (?:the |this )?(?:year|month|quarter|week)\b/i,
  /\bend of \d{4}\b/i,
  /\byear[- ]end\b/i,
  /\bend of (?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(?:this|next) (?:month|quarter|year|week)\b/i,
  /\bby (?:the )?(?:summer|winter|spring|autumn|fall)\b/i,
  /*
   * THE WAY FINANCE PEOPLE WRITE IT, WHICH NOTHING HERE READ.
   *
   * "by the end of Q4" and "in H1" went straight through: no vague word, no phrase on this list, so
   * no question, and a deadline nobody can be early or late against went onto the record. They are
   * the two most common ways a number gets a period attached to it in the kind of check-in this
   * product is for.
   *
   * They are NOT given a reading, deliberately. Q4 is a different fortnight in every organisation -
   * to December, to March, to June - and the file's whole argument is that a period with no
   * financial year behind it is asked about rather than guessed at. So they land on the same branch
   * as "this quarter": ask which day, accept "not settled" as an answer.
   *
   * TWO SHAPES, NOT A BARE TOKEN. "Q4" on its own also matches an h1 heading, a QA team and a
   * spreadsheet column, and a product that asks which day "the h1 heading" falls on has stopped
   * listening. So it counts when a time word introduces it, or when the thing it is attached to is
   * a number people work to.
   */
  /\b(?:end of|in|by|before|after|during|until|through|for)\s+(?:the\s+)?(?:end\s+of\s+)?(?:q[1-4]|h[12])\b/i,
  /\b(?:q[1-4]|h[12])\s+(?:target|targets|goal|goals|plan|plans|forecast|numbers|revenue|budget|pipeline)\b/i,
];

/** The period phrase they used, where they gave one rather than a day. */
export function thePeriodTheyNamed(said: string | null | undefined): string | null {
  const t = (said ?? '').trim();
  if (!t) return null;
  for (const rx of A_PERIOD_NOT_A_DAY) {
    const m = rx.exec(t);
    if (m) return m[0];
  }
  return null;
}

/**
 * What to tell the interview when somebody has given a period. It carries the date we read it as,
 * so the question is a specific one - "so the 31st of December?" - rather than "when exactly?",
 * which is the question that makes people feel interrogated about something they already answered.
 */
export function sayTheDateAndCheckIt(period: string, meansThisDay: Date): string {
  /* One formatter for the whole product. A hand-rolled toLocaleDateString here is how "12 September
     2026" and "September 12, 2026" end up on two screens of the same check-in. */
  const day = whenItWas(meansThisDay, 'full', 'UTC');
  return `They said "${period}", which is a period rather than a day. The product reads that as ${day}.

YOUR NEXT REPLY IS THAT QUESTION AND NOTHING ELSE: "When you say ${period}, do you mean ${day}?" Or the same question in your own words, as long as the DATE is in it.

THIS IS NOT SAYING THEIR ANSWER BACK TO THEM, and the rule against that does not apply here. You are giving them something they did not say: ${day} is the product's reading of their words, not their words, and they have never seen it. Driven live, this instruction and that rule pulled against each other and what reached the person was "Is that the date you mean?" - a question about a date that had been left out of the message asking it.

Ask once. If they confirm it, or give a different day, take it and move on. If they say it is not settled yet, that is a real answer - record it and never press again. Do not explain why you are asking, and do not add a second question to the same turn.`;
}
