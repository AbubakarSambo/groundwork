import { appConfig } from './configuration';

/**
 * COACHING IS OFF UNLESS SOMEBODY TURNS IT ON.
 *
 * The coaching layer speaks directly to a person about their own work: it tells
 * them what they said they would do last session and asks what happened. That is
 * a different kind of thing from a check-in question, and it is the sort of
 * feature that should never arrive by accident because a variable was misspelled
 * in a deploy.
 *
 * So the flag is off for every value except the exact string "true". Not off for
 * a known list of falsey strings, which is the version that fails: a typo, a
 * quoted "false", a "0", or an empty string would all have to be predicted, and
 * whichever one nobody predicted turns the feature on in production.
 *
 * WHAT IS AND IS NOT BEHIND THIS FLAG, because the distinction matters:
 *
 *   NOT behind it: detection. The role maps, the seven universal modes, the
 *   detected function on a participant, and the neutral probes that already
 *   reach the prompt. All of that ships today, and putting it behind a flag
 *   would CHANGE what current grounds do, which the work order forbids.
 *
 *   BEHIND it: the layer built on top. Coaching state, one step per session, the
 *   staircases, and anything that reads back what a person was asked to do.
 *
 * The test that matters is not that it works when on. It is that a check-in with
 * it off behaves exactly as it did before any of this existed.
 */

const withEnv = (value: string | undefined) => {
  const before = process.env.COACHING_ENABLED;
  if (value === undefined) delete process.env.COACHING_ENABLED;
  else process.env.COACHING_ENABLED = value;
  try {
    return appConfig().coachingEnabled;
  } finally {
    if (before === undefined) delete process.env.COACHING_ENABLED;
    else process.env.COACHING_ENABLED = before;
  }
};

describe('the coaching flag', () => {
  it('is off when nothing is set, which is every environment today', () => {
    expect(withEnv(undefined)).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    expect(withEnv('true')).toBe(true);
  });

  it('stays off for everything that is not that string', () => {
    // Each of these is a real way a flag gets turned on by accident. An
    // allow-list of falsey values would have to predict all of them; requiring
    // the exact string predicts none and is safe anyway.
    for (const value of ['false', 'False', '0', '', ' ', 'TRUE', 'True', 'yes', 'on', '1', 'true ', 'null', 'undefined']) {
      expect({ value, enabled: withEnv(value) }).toMatchObject({ enabled: false });
    }
  });

  it('does not disturb the flag that already existed', () => {
    // Sanity: adding this must not change the post-report guide gate, which uses
    // the same pattern and is currently the only other feature flag here.
    const before = process.env.POST_REPORT_GUIDE_ENABLED;
    process.env.POST_REPORT_GUIDE_ENABLED = 'true';
    expect(appConfig().postReportGuideEnabled).toBe(true);
    if (before === undefined) delete process.env.POST_REPORT_GUIDE_ENABLED;
    else process.env.POST_REPORT_GUIDE_ENABLED = before;
  });
});
