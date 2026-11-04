import * as closeReadinessModule from './close-readiness';
import { askedToFinish } from './close-readiness';
import { almostNothingHereYet } from './how-short-a-check-in-may-be';

/**
 * WHO GETS A CLEAN ENDING.
 *
 * Until 3 November 2026 a word list (closeReadiness) held a close back once when the record had no specific in it, to ask one more
 * question. Hafsah's rule since then: no question limits and no forced close. The model offers to wrap up in its own words and closes
 * when it has what it needs; a person can finish at any point. The only bar left is the empty record (almostNothingHereYet), which the
 * server's complete() reads the same way.
 */

describe('no word list holds the close any more', () => {
  it('closeReadiness is gone', () => {
    expect(Object.keys(closeReadinessModule)).not.toContain('closeReadiness');
  });

  it('a vague but real account is not held for one more question: only an empty record is', () => {
    expect(almostNothingHereYet(['Yeah all good this week, getting on with it', 'Going well, nothing new to report really'], false)).toBe(false);
    expect(almostNothingHereYet(['Closed out module 4 on the 12th with Priya', '92 patients this week, audit submitted on the 14th'], false)).toBe(false);
  });

  it('an empty record still waits: there is nothing to keep', () => {
    expect(almostNothingHereYet(['ok', 'fine'], false)).toBe(true);
  });
});

describe('the person can always stop', () => {
  it('honours someone saying they are done, even with an empty record', () => {
    expect(askedToFinish(['Yeah fine', "That's me, I'm done"])).toBe(true);
  });

  it('honours needing to go', () => {
    expect(askedToFinish(['ok', 'got to go sorry'])).toBe(true);
  });

  it('only reads the LAST thing they said as wanting out', () => {
    // "later" mid-conversation is not a request to stop.
    expect(askedToFinish(['I will do the audit later', 'Still working through module 3'])).toBe(false);
  });
});

/** "That is everything from my side" met "One more before this closes" on a live session (22 Sep 2026). */
describe('the ways people say they are finished', () => {
  const out = (said: string) => askedToFinish([said]);

  it('hears the long forms, not only the short ones', () => {
    expect(out('That is everything from my side.')).toBe(true);
    expect(out("That's everything from me.")).toBe(true);
    expect(out('That is all from me, thanks.')).toBe(true);
    expect(out('I have nothing else to add.')).toBe(true);
    expect(out('We are done.')).toBe(true);
    expect(out("That's it.")).toBe(true);
  });

  it('and a bare "nothing else" is still an answer about the work, not a request to stop', () => {
    expect(out('Nothing else.')).toBe(false);
    expect(out('Nothing much this week.')).toBe(false);
    expect(out('I need to get everything signed.')).toBe(false);
  });
});
