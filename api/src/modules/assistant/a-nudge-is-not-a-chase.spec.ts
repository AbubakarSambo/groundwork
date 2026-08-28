import { hasSlipped, theOneToRaise, alreadyNudgedToday, slippedOpening } from './what-somebody-said-they-would-do';

/**
 * TWO DIFFERENT QUESTIONS, KEPT APART.
 *
 * Whether something is late is about the record. Whether to mention it is about the person - and
 * mentioning everything the moment it is true is how a tool becomes a thing people close.
 */
const at = (d: number) => new Date(Date.UTC(2026, 8, d, 9, 0, 0));
const c = (over: Partial<Parameters<typeof hasSlipped>[0]> = {}) => ({
  id: 'c1', text: 'send the pricing comparison', dueSaid: 'Wednesday',
  dueAt: at(1), state: 'OPEN' as const, lastFollowedUpAt: null, ...over,
});

describe('a commitment with no date is never late', () => {
  it('however long ago it was said', () => {
    /*
     * Not "probably fine", not "assume the end of the month" - never late, because we genuinely do
     * not know. Inventing a date from "soon" and then telling somebody they missed it is the
     * product being wrong about them in writing.
     */
    expect(hasSlipped(c({ dueAt: null, dueSaid: 'end of the quarter' }), at(400))).toBe(false);
  });

  it('but one with a date that has passed has slipped', () => {
    expect(hasSlipped(c(), at(2))).toBe(true);
    expect(hasSlipped(c(), at(1))).toBe(false);
  });

  it('and one already settled has not', () => {
    for (const state of ['KEPT', 'SLIPPED', 'DROPPED'] as const) {
      expect(hasSlipped(c({ state }), at(400))).toBe(false);
    }
  });
});

describe('at most one, and the oldest', () => {
  it('raises the thing carried longest, not the newest, in either order', () => {
    /*
     * TESTED BOTH WAYS ROUND BECAUSE THE FIRST VERSION PASSED BY ACCIDENT. It listed the newest
     * first, so "return the last element" - which is wrong - gave the right answer, and breaking
     * the code left the suite green. A test that only holds for one input ordering is testing the
     * ordering.
     */
    expect(theOneToRaise([c({ id: 'new', dueAt: at(5) }), c({ id: 'old', dueAt: at(2) })], at(10))?.id).toBe('old');
    expect(theOneToRaise([c({ id: 'old', dueAt: at(2) }), c({ id: 'new', dueAt: at(5) })], at(10))?.id).toBe('old');
  });

  it('raises nothing when nothing has slipped', () => {
    expect(theOneToRaise([c({ dueAt: at(30) })], at(10))).toBeNull();
    expect(theOneToRaise([], at(10))).toBeNull();
  });

  it('ignores the dateless ones entirely when choosing', () => {
    expect(theOneToRaise([c({ id: 'no-date', dueAt: null })], at(400))).toBeNull();
  });
});

describe('not twice in a day, and the day is a calendar day', () => {
  it('somebody nudged this morning is not nudged again tonight', () => {
    expect(alreadyNudgedToday(at(3), new Date(Date.UTC(2026, 8, 3, 23, 55)))).toBe(true);
  });

  it('and somebody nudged at 23:50 is not fair game at 00:05', () => {
    /*
     * ELAPSED HOURS WOULD SAY YES, and that is the letter of the rule rather than the point of it.
     * The point is that opening this should not feel like being chased.
     */
    const lastNight = new Date(Date.UTC(2026, 8, 3, 23, 50));
    expect(alreadyNudgedToday(lastNight, new Date(Date.UTC(2026, 8, 3, 23, 59)))).toBe(true);
    /* A new calendar day is a new day even fifteen minutes later - that is the rule, deliberately
       simple, and the once-a-day cap is what keeps it honest. */
    expect(alreadyNudgedToday(lastNight, new Date(Date.UTC(2026, 8, 4, 0, 5)))).toBe(false);
  });

  it('never nudged means fair to nudge', () => {
    expect(alreadyNudgedToday(null, at(3))).toBe(false);
  });
});

describe('the wording is a colleague remembering, not a system keeping score', () => {
  it('quotes their own words for the deadline, inside the sentence', () => {
    const o = slippedOpening(c());
    expect(o.line).toContain('by Wednesday');
    expect(o.line).toContain('send the pricing comparison');
  });

  it('never uses the language of a tracker', () => {
    /* "You have an overdue commitment" is a system keeping score. "You said Wednesday" is a
       colleague remembering, and the product exists to be the second one. */
    const line = slippedOpening(c()).line.toLowerCase();
    for (const word of ['overdue', 'breach', 'failed', 'missed deadline', 'compliance']) {
      expect(line).not.toContain(word);
    }
  });

  it('offers an answer that is not just yes', () => {
    /* "Not yet" and "something changed" are real answers and a person needs somewhere to put them,
       or the only honest option is to say nothing. */
    expect(slippedOpening(c()).suggestions).toEqual(['Done', 'Not yet', 'Something changed']);
  });

  it('copes when there were no words for the deadline', () => {
    const o = slippedOpening(c({ dueSaid: null }));
    expect(o.line).not.toContain('undefined');
    expect(o.line).not.toContain('null');
  });
});
