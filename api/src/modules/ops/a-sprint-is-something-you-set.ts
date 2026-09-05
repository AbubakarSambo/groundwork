/**
 * A SPRINT IS A DECISION SOMEBODY MAKES, NOT A CONSTANT SOMEBODY SEEDED.
 *
 * Every period in this system arrived from the seed, which meant the September
 * sprint existed because a file said so and could not be moved, renamed, or
 * followed by another one without a deploy. That is fine for a quarter — the
 * calendar is not ours to argue with — and wrong for a sprint, which is a
 * stretch of time the company chooses and changes.
 *
 * The rules below are the whole of what a sprint may not be. They are here
 * rather than in the service so that the reason for each refusal is written
 * once, next to the check, and so the wording a person reads is the wording
 * under test.
 */

/** Which kinds a person may create and re-date. */
export const KINDS_A_PERSON_SETS = ['SPRINT'] as const;

export type PeriodDates = { startsOn: Date; endsOn: Date };

/**
 * Why these dates are not allowed, or null.
 *
 * Returns the sentence rather than throwing, so the same rule can answer a
 * form before anybody submits it and answer the request when they do.
 */
export function whyTheseDatesAreWrong(dates: PeriodDates): string | null {
  if (Number.isNaN(dates.startsOn.getTime())) return 'The start date is not a date.';
  if (Number.isNaN(dates.endsOn.getTime())) return 'The end date is not a date.';

  /*
   * Equal dates are allowed: a one-day sprint is a real thing somebody might
   * run, and refusing it would be the software having an opinion about how
   * they work. Ending BEFORE it starts is not a short sprint, it is a typo.
   */
  if (dates.endsOn < dates.startsOn) {
    return 'A sprint cannot end before it starts. Check the two dates.';
  }

  /*
   * Five years. Not a policy about sprint length — a guard against a fat-finger
   * year, which is the way this field actually goes wrong. A sprint running to
   * 2029 would sit at the top of every period list for ever, because it would
   * contain today.
   */
  const FIVE_YEARS = 5 * 365 * 24 * 60 * 60 * 1000;
  if (dates.endsOn.getTime() - dates.startsOn.getTime() > FIVE_YEARS) {
    return 'That sprint runs for more than five years. Check the year on the end date.';
  }

  return null;
}

/**
 * A key from a name, so nobody has to invent one.
 *
 * Kept stable once made: renaming a sprint must not change its key, because the
 * key is what every company, target and board already points at.
 */
export function keyFromName(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return key || 'sprint';
}
