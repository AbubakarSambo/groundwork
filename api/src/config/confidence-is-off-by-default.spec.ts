import { appConfig } from './configuration';

/**
 * THE CONFIDENCE READ IS OFF UNLESS SOMEBODY TURNS IT ON.
 *
 * Third flag in this codebase, same shape as the first two, and for the same
 * reason both of those give: off is the product exactly as it was, and on is
 * additive. Nothing behind this flag replaces anything - specificitySignal keeps
 * being computed and keeps being sent, because things read it.
 *
 * WHY THIS ONE PARTICULARLY. What is behind it are sentences a person reads about
 * their own record, and the whole change is the difference between
 *
 *   "low specificity"                          about them
 *   "we are not confident this part of the     about the picture
 *    picture is complete"
 *
 * If that lands wrong on a real ground, the fix has to be one environment
 * variable rather than a revert, because there will be reports already sent.
 *
 * Off for every value except the exact string "true" - not off for a predicted
 * list of falsey ones, since whichever falsey string nobody predicted is the one
 * that turns the feature on in production.
 */

const withEnv = (value: string | undefined) => {
  const before = process.env.CONFIDENCE_ENABLED;
  if (value === undefined) delete process.env.CONFIDENCE_ENABLED;
  else process.env.CONFIDENCE_ENABLED = value;
  try {
    return appConfig().confidenceEnabled;
  } finally {
    if (before === undefined) delete process.env.CONFIDENCE_ENABLED;
    else process.env.CONFIDENCE_ENABLED = before;
  }
};

/*
 * UPDATED 23 November 2026 (Hafsah, 22 November: "turn the switch on, nothing switch off from now on"): the confidence read is
 * ON unless the environment says exactly "false". `.env.example` already carried it on.
 */
describe('the confidence flag', () => {
  it('is on when nothing is set', () => {
    expect(withEnv(undefined)).toBe(true);
  });

  it.each(['true', 'TRUE', '1', '', 'yes'])('is on for %p', (value) => {
    expect(withEnv(value)).toBe(true);
  });

  it('is off only for the exact string "false"', () => {
    expect(withEnv('false')).toBe(false);
  });
});
