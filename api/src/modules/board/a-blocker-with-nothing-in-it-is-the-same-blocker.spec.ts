import { oneBlockerPerThingWaitedOn, namesWhatIsWaitedOn } from './a-blocker-with-nothing-in-it-is-the-same-blocker';

/** The four real rows, from one three-person check-in, all against finance, all open. */
const row = (what: string, over: any = {}) => ({
  id: what, what, fromParticipantId: 'p1', onParticipantId: null, onLabel: 'finance',
  status: 'BLOCKING', createdAt: new Date('2026-09-01'), ...over,
} as any);

describe('a row that names nothing', () => {
  it('is spotted, including when it only repeats the owner', () => {
    for (const t of ['a specific request', 'the finance dependency', 'the finance situation', 'finance']) {
      expect(namesWhatIsWaitedOn(t, 'finance')).toBe(false);
    }
  });

  it('and a row that names a thing is left alone, even a short one', () => {
    for (const t of ['the budget line', 'sign-off on the Q3 forecast', 'the group number in writing']) {
      expect(namesWhatIsWaitedOn(t, 'finance')).toBe(true);
    }
  });

  it('is judged against ITS owner, so the same words can go either way', () => {
    /*
     * "the legal sign-off" names a thing when finance is who you are waiting on. Waiting on LEGAL
     * for "the legal dependency" names only who, which the owner column already said.
     *
     * My first version of this asserted that "the legal review" on legal was empty too, and that
     * was the test overreaching rather than the code being wrong: a review IS a thing to wait for,
     * and reading it as noise because the team's name is in front of it would drop a real row.
     */
    expect(namesWhatIsWaitedOn('the legal sign-off', 'finance')).toBe(true);
    expect(namesWhatIsWaitedOn('the legal review', 'legal')).toBe(true);
    expect(namesWhatIsWaitedOn('the legal dependency', 'legal')).toBe(false);
  });
});

describe('collapsing them', () => {
  it('drops the placeholders where something real stands against the same owner', () => {
    const out = oneBlockerPerThingWaitedOn([
      row('a specific request'),
      row('the budget line', { createdAt: new Date('2026-09-02') }),
      row('the finance dependency', { createdAt: new Date('2026-09-03') }),
    ]);
    expect(out.map((d) => d.what)).toEqual(['the budget line']);
  });

  it('never drops the only thing somebody said - they are still blocked', () => {
    const out = oneBlockerPerThingWaitedOn([
      row('a specific request'),
      row('the finance dependency', { createdAt: new Date('2026-09-03') }),
    ]);
    /* The newest stands for all of them: the description they landed on most recently. */
    expect(out.map((d) => d.what)).toEqual(['the finance dependency']);
  });

  it('keeps two REAL blockers on one owner apart, which is the whole reason not to match on text', () => {
    const out = oneBlockerPerThingWaitedOn([
      row('the budget line'),
      row('the Q3 forecast', { createdAt: new Date('2026-09-02') }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('and keeps one person\'s blocker away from another\'s', () => {
    const out = oneBlockerPerThingWaitedOn([
      row('a specific request'),
      row('the finance dependency', { fromParticipantId: 'p2', createdAt: new Date('2026-09-03') }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('and one owner away from another', () => {
    const out = oneBlockerPerThingWaitedOn([
      row('a specific request'),
      row('a specific request', { id: 'b', onLabel: 'legal', createdAt: new Date('2026-09-03') }),
    ]);
    expect(out).toHaveLength(2);
  });
});

/**
 * AND WHO ANSWERS THE QUESTION: THE MODEL WHERE IT WAS ASKED, THE WORD LISTS WHERE IT WAS NOT.
 *
 * `namesWhatIsWaitedOn` reads the text against two lists, which is as far as reading text gets:
 * it answers "how this connects to anything" TRUE, because "connects" and "anything" are in
 * neither list, and the only repair is a longer list and then a longer one. Whether somebody named
 * the thing they are waiting on is a reading of what they SAID, so the extraction asks the model.
 *
 * The fallback is load-bearing rather than tidy: every row written before that column existed has
 * null in it, and treating null as "they did not name it" would empty half of every board.
 */
describe('who decides whether they named it', () => {
  const { theyNamedWhatTheyAreWaitingOn } = require('./a-blocker-with-nothing-in-it-is-the-same-blocker');

  it("the model's answer is used when there is one, either way", () => {
    /* Text that the word lists would call named, which the person did not name. */
    expect(theyNamedWhatTheyAreWaitingOn({ what: 'how this connects to anything', namedTheThing: false })).toBe(false);
    /* And text the lists would refuse, which the person did name. */
    expect(theyNamedWhatTheyAreWaitingOn({ what: 'the response', namedTheThing: true })).toBe(true);
  });

  it('a row from before the column falls back to the rule, not to false', () => {
    expect(theyNamedWhatTheyAreWaitingOn({ what: 'the sales deck', namedTheThing: null })).toBe(true);
    expect(theyNamedWhatTheyAreWaitingOn({ what: 'the finance dependency', onLabel: 'finance' })).toBe(false);
  });

  it('and this is exactly the case the word lists get wrong, which is why the model is asked', () => {
    const { namesWhatIsWaitedOn } = require('./a-blocker-with-nothing-in-it-is-the-same-blocker');
    /* Kept as a statement of the limitation rather than a complaint about it: the rule is right for
       what it was built for and cannot reach this, and the column is the answer. */
    expect(namesWhatIsWaitedOn('how this connects to anything', null)).toBe(true);
    expect(theyNamedWhatTheyAreWaitingOn({ what: 'how this connects to anything', namedTheThing: false })).toBe(false);
  });
});
