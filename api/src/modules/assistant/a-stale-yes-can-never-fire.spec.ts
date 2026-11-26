import { catchCommitment, resolveConfirmation, proposalSummary } from './something-said-in-passing';

/**
 * NOTHING IS WRITTEN WITHOUT A PLAIN YES, AND A YES ONLY COUNTS WHILE THE QUESTION IS STILL OPEN.
 *
 * The second half is the one that matters and the one a confirm gate usually gets wrong. If a
 * parked action can survive the conversation moving on, an unrelated "yes, that's right" three
 * turns later fires it - and the person is left with a record they believe they never agreed to.
 * That is worse than no gate, because they trusted the gate.
 */
describe('noticing something said in passing', () => {
  it('catches a commitment nobody typed a command for', () => {
    expect(catchCommitment("I'll send the pricing comparison by Wednesday")).toEqual({
      text: 'send the pricing comparison by Wednesday',
      dueSaid: 'by Wednesday',
    });
  });

  it('keeps their words for when, and never turns them into a date', () => {
    /* "End of the quarter" is a real answer. Inventing the 30th from it is a guess wearing a
       fact's clothes - see the schema note on dueSaid. */
    const c = catchCommitment("I will tidy the backlog end of the quarter")!;
    expect(c.dueSaid).toBe('end of the quarter');
    expect(Object.keys(c)).not.toContain('dueAt');
  });

  it('leaves the deadline in the text as well as pulling it out', () => {
    /* A record reading "send the comparison" with the date filed elsewhere is a tidier version of a
       sentence nobody wrote. */
    expect(catchCommitment("I'll send it by Friday")!.text).toContain('by Friday');
  });

  it('catches one with no deadline at all', () => {
    expect(catchCommitment("I'll write up the migration plan")).toEqual({
      text: 'write up the migration plan', dueSaid: null,
    });
  });

  it('ignores the phrases that take the form and mean nothing', () => {
    /* Each of these has the grammar of a commitment and is not one. */
    for (const s of ["I'll be honest", "I'll think about it", "I'll try", "I'll probably do that", "I'll see"]) {
      expect(catchCommitment(s)).toBeNull();
    }
  });

  it('ignores anything that is not first person and future', () => {
    for (const s of ['send the comparison', 'you should send it', 'we sent it Wednesday', 'what am I on?']) {
      expect(catchCommitment(s)).toBeNull();
    }
  });

  it('would rather miss one than invent one', () => {
    /*
     * The correct direction to be wrong in: a missed commitment is one somebody can still state,
     * and an invented one is a record about them that they did not make.
     */
    expect(catchCommitment("might get to the backlog this week")).toBeNull();
  });

  it('echoes their own words back, so what they agree to is what goes down', () => {
    const c = catchCommitment("I'll send the comparison by Wednesday")!;
    expect(proposalSummary(c)).toContain('send the comparison by Wednesday');
  });
});

describe('a stale yes can never fire', () => {
  it('accepts a plain yes', () => {
    for (const y of ['yes', 'Yes', 'yep', 'sure', 'ok', 'go ahead', 'do it', "that's right", 'Yes please.', 'yes, thanks', 'OK thank you']) {
      expect(resolveConfirmation(y)).toBe('accept');
    }
  });

  it('declines a plain no', () => {
    for (const n of ['no', 'nope', 'nah', "don't", 'leave it', 'cancel']) {
      expect(resolveConfirmation(n)).toBe('decline');
    }
  });

  it('DROPS anything else, rather than asking again or assuming no', () => {
    /*
     * Dropped, not parked. A proposal that survives the subject changing is the one that fires on
     * somebody's later "yes" about something entirely different.
     */
    for (const other of ['what am I on?', 'yes but change the date', 'hmm', 'actually never mind that other thing', '']) {
      expect(resolveConfirmation(other)).toBe('drop');
    }
  });

  it('a yes with anything attached to it is not a plain yes', () => {
    /* "Yes, but Thursday instead" is a negotiation, not a confirmation, and writing down the
       original would record the wrong thing while they believed they had corrected it. */
    expect(resolveConfirmation('yes but Thursday instead')).toBe('drop');
    expect(resolveConfirmation('yes to the first one')).toBe('drop');
  });
});
