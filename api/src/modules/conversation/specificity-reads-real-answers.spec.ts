import { runIntake } from './intake';

/**
 * "LOW SPECIFICITY" ON A RECORD FULL OF NUMBERS.
 *
 * A finished twelve-session ground reported both parties as low specificity. The
 * record it said that about contained 22 tickets closed in three weeks, two
 * client accounts run end to end, a count that fell to 18 and then 15, and a
 * ninety-day goal. That label sits next to a performance conversation, so being
 * backwards about somebody's own account of their work is worse than showing
 * nothing at all.
 *
 * Measured, not guessed. Scoring the six real answers from session 1:
 *
 *     0.45  Success at 90 days is that I can hand him a messy client problem...
 *     0.00  Right now he is shipping tickets fast, but I have not seen him push back
 *     0.00  I would want him owning at least one client relationship by month three
 *     0.00  Doing well means clearing the ticket queue each week
 *     0.25  I closed 22 tickets in my first three weeks and nothing has slipped
 *     0.10  Nobody has told me I own a client
 *     average 0.133 -> "managed", the lowest bucket there is
 *
 * Three causes, all in what the scorer could see rather than in the thresholds:
 *
 *   1. Numbers only counted as digits, so "three weeks", "month three" and "at
 *      least one client" were read as containing no number.
 *   2. The month list was unanchored, so "may" matched "maybe" and "dismay",
 *      "mar" matched "market" and "margin". Dates were being found in prose that
 *      had none, and real time references like "each week" or "three weeks" were
 *      not found at all.
 *   3. "closed" and "resolved" were not completion words, though both were
 *      already output verbs - so "I closed 22 tickets" produced no factual claim.
 *
 * After: the same six answers average 0.292, and the two sentences carrying
 * actual evidence score 0.60 and 0.50 rather than 0.45 and 0.25.
 *
 * The thresholds themselves are deliberately untouched. They may still be wrong,
 * but changing a scale to make one record come out better is how you get a
 * differently wrong answer. Fix what the scorer can see first, then look again.
 */

describe('numbers people write as words', () => {
  it('counts "three weeks" as a number, because it is one', () => {
    // THE REGRESSION: /\d/ only, so this scored zero for having no number.
    expect(runIntake('I would want him owning at least one client relationship by month three.').specificity)
      .toBeGreaterThan(0);
  });

  it('counts the timing in "in my first three weeks"', () => {
    const r = runIntake('I closed 22 tickets in my first three weeks and nothing has slipped past its date.');
    expect(r.specificity).toBeGreaterThanOrEqual(0.5);
  });

  it('counts a recurring rhythm as timing', () => {
    expect(runIntake('Doing well means clearing the ticket queue each week.').specificity).toBeGreaterThan(0);
  });

  it('counts a word-number that carries no timing at all', () => {
    /**
     * The case that ISOLATES this change, and the first version of these tests
     * missed it. "three weeks" and "month three" now also score through the
     * timing path, so reverting the word-number fix left every one of them green
     * and the test pinned nothing.
     *
     * "two client accounts" has no time unit in it. Word-numbers are the only
     * thing that can score it, and it is exactly the kind of sentence people
     * write about their own work.
     */
    expect(runIntake('I own two client accounts end to end, including the calls.').specificity)
      .toBeGreaterThan(0);
  });

  it('does not fire on number words buried inside other words', () => {
    // "one" must not fire on "money", "ten" must not fire on "often".
    const r = runIntake('We often talk about money and momentum here.');
    expect(r.specificity).toBe(0);
  });
});

describe('the month list stops matching ordinary words', () => {
  it('does not find a date in "maybe"', () => {
    // THE REGRESSION: /may/ matched "maybe", "dismay", "mayhem".
    expect(runIntake('Maybe we should revisit the approach.').specificity).toBe(0);
  });

  it('does not find a date in "market" or "margin"', () => {
    // /mar/ matched both. A marketing plan scored as though it were full of dates.
    expect(runIntake('The market is soft and the margin is thin.').specificity).toBe(0);
  });

  it('still finds a real month', () => {
    expect(runIntake('We agreed this in March and shipped it.').specificity).toBeGreaterThan(0);
  });
});

describe('closing something is finishing something', () => {
  it('treats "closed" as a completion, as it already did for output', () => {
    const r = runIntake('I closed 22 tickets in my first three weeks.');
    expect(r.factualClaims.length).toBeGreaterThan(0);
  });

  it('treats "resolved" the same way', () => {
    expect(runIntake('I resolved 14 escalations this month.').factualClaims.length).toBeGreaterThan(0);
  });
});

describe('what must still score low', () => {
  it('keeps an unevidenced opinion low', () => {
    // Correctly near zero. This is a judgement about someone, with nothing
    // checkable in it, and the scorer should say so.
    expect(runIntake('Right now he is shipping tickets fast, which is good, but I have not seen him push back on a bad request yet.').specificity)
      .toBeLessThan(0.2);
  });

  it('keeps consultant noise low', () => {
    expect(runIntake('We need to leverage the ecosystem and build momentum with stakeholders.').specificity)
      .toBeLessThan(0.2);
  });

  it('scores an empty answer at zero', () => {
    expect(runIntake('').specificity).toBe(0);
    expect(runIntake('Same as before.').specificity).toBe(0);
  });
});
