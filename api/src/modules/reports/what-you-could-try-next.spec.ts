import { whatTheyCouldTry, type TheirOwnBlocker } from './what-you-could-try-next';

/**
 * The manager already got this - the board's `ask` column is drawn from `waysThrough`. The person
 * whose blocker it is got it only as a line inside the prompt, for the first blocker on the list
 * rather than the one that had sat longest, competing with everything else the prompt asks for.
 */
const a = (over: Partial<TheirOwnBlocker> = {}): TheirOwnBlocker => ({
  id: 'd1', what: 'the finance sign-off', owner: 'Amina', days: 3, tried: 'asked-once', chaseBy: null, ...over,
});

describe('what somebody could try about their own blocker', () => {
  it('offers moves, in the order they are worth doing', () => {
    const [only] = whatTheyCouldTry([a()], true);
    expect(only.couldTry[0]).toContain('Speak to Amina');
    expect(only.couldTry.some((l) => /in writing/.test(l))).toBe(true);
  });

  it('says nothing to somebody who has already escalated or gone around', () => {
    /* They have done the thing this would suggest. Suggesting it anyway is the telling-off. */
    expect(whatTheyCouldTry([a({ tried: 'escalated' })], true)).toEqual([]);
    expect(whatTheyCouldTry([a({ tried: 'went-around' })], true)).toEqual([]);
  });

  it('opens with finding out who owns it, when the record names a team and not a person', () => {
    const [only] = whatTheyCouldTry([a({ owner: null })], true);
    expect(only.couldTry[0]).toMatch(/who owns this by name/i);
  });

  it('only suggests going above somebody once it has sat a fortnight', () => {
    const early = whatTheyCouldTry([a({ days: 3 })], true)[0];
    const late = whatTheyCouldTry([a({ days: 21 })], true)[0];
    expect(early.couldTry.some((l) => /above/i.test(l))).toBe(false);
    expect(late.couldTry.some((l) => /above Amina/i.test(l))).toBe(true);
  });

  it('puts the longest-standing one first, because that is where doing nothing has cost most', () => {
    const out = whatTheyCouldTry([a({ id: 'new', days: 2 }), a({ id: 'old', days: 40 })], true);
    expect(out.map((x) => x.id)).toEqual(['old', 'new']);
  });

  it('and a check-in that does not ask people to unblock themselves suggests nothing at all', () => {
    /* A cohort of new starters with no standing to chase anybody - see the column's own note. */
    expect(whatTheyCouldTry([a()], false)).toEqual([]);
  });
});
