/**
 * WHAT SOMEBODY SAID WOULD HAPPEN, AND WHEN IT DID.
 *
 * For a technical leader this may be the single most diagnostic thing available, and it was the one
 * signal the pattern library did not have. Every input existed - a date somebody gave, a status,
 * the moment that status changed - and nothing ever compared the two.
 *
 * IT IS NOT A SCORE AND CANNOT BECOME ONE. There is no accuracy percentage here and no ranking. A
 * person who says "the end of May" and delivers on 20 May and a person who says it and delivers on
 * 20 June are in different situations, and the useful thing is the SHAPE across several - whether
 * the misses are getting smaller, whether they are all in one direction, whether they cluster
 * around one kind of work.
 *
 * ONE ESTIMATE IS NOT A PATTERN. Everybody misses a date. Two is a coincidence. The library's
 * three-period rule exists precisely so that a bad fortnight cannot become a description of
 * somebody, and forecasting gets the same bar - four estimates before anything is said at all.
 *
 * AND IT NEVER EXPLAINS. A run of late estimates might be optimism, or scope arriving late, or a
 * dependency nobody could see, or somebody being handed work that was never a fortnight's worth.
 * Those need different conversations and this file knows which one it is: none of them.
 */

export interface Estimate {
  /** What was promised, in their words. */
  what: string;
  /** The date they gave. */
  said: Date;
  /** When it actually finished. Null while it is still open. */
  landed: Date | null;
}

const DAY = 86_400_000;

/** Below this, there is nothing to see. Everybody misses a date; two is a coincidence. */
export const ENOUGH_TO_SAY_ANYTHING = 4;

export interface HowForecastsHaveGone {
  /** Nothing at all until there are enough of them. */
  says: string[];
  /** How many finished estimates this is built from, so a reader can weigh it. */
  from: number;
}

export function howForecastsHaveGone(estimates: Estimate[]): HowForecastsHaveGone {
  const done = estimates.filter((e) => e.landed !== null);
  if (done.length < ENOUGH_TO_SAY_ANYTHING) return { says: [], from: done.length };

  const slips = done.map((e) => Math.round((e.landed!.getTime() - e.said.getTime()) / DAY));
  const late = slips.filter((d) => d > 0);
  const early = slips.filter((d) => d < 0);
  const onTime = slips.filter((d) => d === 0);

  const says: string[] = [];

  /*
   * COUNTS AND DAYS, NEVER AN AVERAGE. A mean turns four situations into one number, and the number
   * is the thing somebody puts in a review. "Three of five, by four to thirty days" is longer and
   * says what actually happened.
   */
  says.push(
    `Of ${done.length} dates given: ${late.length} late, ${onTime.length} on the day, ${early.length} early.`,
  );
  if (late.length) {
    const worst = Math.max(...late);
    const best = Math.min(...late);
    says.push(`The late ones ran over by ${best === worst ? `${best} days` : `${best} to ${worst} days`}.`);
  }

  /*
   * THE SHAPE, WHICH IS THE ONLY PART WORTH READING. Whether it is getting better matters far more
   * than where it stands, and it is the part a single number destroys.
   */
  if (done.length >= ENOUGH_TO_SAY_ANYTHING + 2) {
    const half = Math.floor(slips.length / 2);
    const older = slips.slice(0, half).filter((d) => d > 0);
    const newer = slips.slice(half).filter((d) => d > 0);
    if (older.length && !newer.length) says.push('The more recent dates have been met. This is moving in the right direction.');
    else if (!older.length && newer.length) says.push('The earlier dates were met and the more recent ones were not. Worth asking what changed.');
  }

  says.push(WHAT_THIS_DOES_NOT_EXPLAIN);
  return { says, from: done.length };
}

export const WHAT_THIS_DOES_NOT_EXPLAIN =
  'This says nothing about why. A run of late dates can be optimism, scope arriving after the date '
  + 'was given, a dependency nobody could see, or work that was never a fortnight\'s worth in the '
  + 'first place. Those are four different conversations and the record does not say which.';

/** Given to the synthesis with the counts. */
export const NEVER_CONCLUDE_FROM_FORECASTS =
  'WHAT ESTIMATES DO NOT MEASURE. Never turn these into an accuracy figure, a rating, or a '
  + 'comparison between people - somebody estimating hard work badly is not worse at estimating '
  + 'than somebody estimating easy work well. Never write that a person is optimistic, unreliable '
  + 'or over-promises: the record holds dates and outcomes, and every explanation for the gap '
  + 'between them belongs to the person who gave the date.';
