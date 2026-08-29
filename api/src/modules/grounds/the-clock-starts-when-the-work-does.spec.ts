import { clockStartsAt, deadlineOf, daysRemaining, notStartedYet } from './when-the-clock-starts';

/**
 * A 90 DAY ONBOARDING SET UP THREE WEEKS EARLY HAD 63 DAYS LEFT ON THE DAY THE PERSON ARRIVED.
 *
 * `Ground.startsAt` has existed since the create flow first collected it and it gated when the
 * first check-in opened. The timeline never used it: the deadline, the days remaining, and how far
 * through the run a session believed it was all counted from `createdAt`, in three separate
 * expressions that could not be made to agree because none of them knew about the others.
 */
const made = new Date('2026-06-01T09:00:00Z');
const starts = new Date('2026-06-22T09:00:00Z'); // three weeks later

describe('the clock starts when the work does', () => {
  it('counts from the start date when one was set', () => {
    const g = { createdAt: made, startsAt: starts, timelineDays: 90 };
    expect(clockStartsAt(g)).toEqual(starts);
    expect(deadlineOf(g)).toEqual(new Date('2026-09-20T09:00:00Z'));

    /* The day the person actually arrives, the full run is still ahead of them. */
    expect(daysRemaining(g, starts)).toBe(90);
  });

  it('counts from creation when there is no start date, which is exactly the old behaviour', () => {
    const g = { createdAt: made, startsAt: null, timelineDays: 90 };
    expect(clockStartsAt(g)).toEqual(made);
    expect(deadlineOf(g)).toEqual(new Date('2026-08-30T09:00:00Z'));
    expect(daysRemaining(g, made)).toBe(90);
  });

  it('is the difference between 90 days left and 69', () => {
    /* The number the product used to show on the day the person arrived. */
    const anchored = { createdAt: made, startsAt: starts, timelineDays: 90 };
    const unanchored = { createdAt: made, startsAt: null, timelineDays: 90 };
    expect(daysRemaining(anchored, starts)).toBe(90);
    expect(daysRemaining(unanchored, starts)).toBe(69);
  });

  it('never reports a negative number of days left', () => {
    const g = { createdAt: made, startsAt: null, timelineDays: 30 };
    expect(daysRemaining(g, new Date('2026-12-01T09:00:00Z'))).toBe(0);
  });

  it('floors rather than rounds, so it never promises a day that is not there', () => {
    /*
     * The opposite call from the suggestions lane, deliberately. There, rounding up stops somebody
     * being told "0 days" on the last day something can be acted on. Here the number is a promise
     * about how long is left, and rounding a day and a half up says two on the morning of the last.
     */
    const g = { createdAt: made, startsAt: null, timelineDays: 10 };
    expect(daysRemaining(g, new Date('2026-06-09T21:00:00Z'))).toBe(1);
  });

  it('knows a check-in whose clock has not started', () => {
    const g = { createdAt: made, startsAt: starts, timelineDays: 90 };
    expect(notStartedYet(g, made)).toBe(true);
    expect(notStartedYet(g, starts)).toBe(false);
  });

  it('says nothing rather than guessing when there is no timeline', () => {
    expect(deadlineOf({ createdAt: made, timelineDays: null })).toBeNull();
    expect(daysRemaining({ createdAt: made, timelineDays: 0 }, made)).toBeNull();
  });
});
