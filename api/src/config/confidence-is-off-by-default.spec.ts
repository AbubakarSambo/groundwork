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

describe('the confidence flag', () => {
  it('is off when nothing is set', () => {
    /**
     * It is set now - `.env.example` carries CONFIDENCE_ENABLED=true as of wave 14, after the
     * arithmetic was checked against a real closed twelve-session ground rather than a fixture.
     * What this asserts is the PARSE default, which stays off: an environment that forgets the
     * variable gets the product as it was, not a half-configured version of the new thing.
     */
    expect(withEnv(undefined)).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    expect(withEnv('true')).toBe(true);
  });

  it.each(['false', 'False', '0', '', 'ture', 'yes', 'TRUE', ' true'])(
    'stays off for %p',
    (value) => {
      // Every one of these is a real thing somebody has typed into a deploy
      // config, and "TRUE" and " true" are the two that look correct in a
      // dashboard.
      expect(withEnv(value)).toBe(false);
    },
  );
});
