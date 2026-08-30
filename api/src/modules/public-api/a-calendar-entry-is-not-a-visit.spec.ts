import { whatThisProves, NEVER_CONCLUDE } from './what-a-record-actually-proves';

/**
 * WHAT A RECORD ACTUALLY PROVES.
 *
 * The most dangerous thing this feature could do is let a report say the evidence shows somebody
 * visited a shop when what exists is a calendar entry. Three claims are involved and they are not
 * the same: that somebody was there, that a conversation happened, and that a meaningful
 * conversation happened. Nothing ingestible proves the third.
 */
describe('what each strength is allowed to say', () => {
  it('a completed thing is the only one that shows an outcome', () => {
    const says = whatThisProves('TRANSACTION', 'COMPLETED', 'the salesperson', 'Shop A');
    expect(says).toContain('completed');
    expect(says).toContain('rather than that it was attempted');
  });

  it('a logged visit says it happened and says nothing about what was said', () => {
    /* The second half is what a reader supplies for themselves if it is not written down. */
    const says = whatThisProves('VISIT', 'RECORDED', 'the salesperson', 'Shop A');
    expect(says).toContain('evidence it happened');
    expect(says).toContain('no evidence of what was said');
  });

  it('an arranged meeting is never described as one that took place', () => {
    /* The trap: a calendar entry is evidence of an intention and reads as evidence of an event. */
    const says = whatThisProves('MEETING', 'ARRANGED', 'the salesperson', 'Shop A');
    expect(says).toContain('was arranged');
    expect(says).toContain('is not a record that it took place');
    expect(says).not.toMatch(/\bhappened\b(?!.*whether)/);
  });

  it('and their own account is called evidence, not doubt', () => {
    /* Most of what any check-in knows is self-reported. It is not corroboration; it is also not
       a reason to treat somebody as unreliable. */
    const says = whatThisProves('CALL', 'SELF_REPORTED', 'the salesperson', null);
    expect(says).toContain('Their own account');
    expect(says).toContain('does not need to be treated as doubtful');
  });
});

describe('what nobody may conclude', () => {
  it('that counting records measures how somebody is doing', () => {
    expect(NEVER_CONCLUDE).toContain('not a measure of how somebody is doing');
    expect(NEVER_CONCLUDE).toContain('forty logged visits');
  });

  it('that a missing record proves something did not happen', () => {
    /* An unlogged visit and an unmade one look identical from here. */
    expect(NEVER_CONCLUDE).toContain('an unlogged visit and');
    expect(NEVER_CONCLUDE).toContain('look identical');
  });

  it('or that a disagreement can be settled by the record', () => {
    expect(NEVER_CONCLUDE).toContain('say both and settle');
  });

  it('and it never suggests the quality of a conversation', () => {
    expect(NEVER_CONCLUDE).toContain('whether a conversation was any good');
  });
});

describe('who it is about', () => {
  it('is named only where the sentence needs a subject', () => {
    /*
     * "The salesperson says a call happened" needs one. "A visit was logged" does not - the caller
     * labels the line, the way the objectives grounding already does, and repeating it here would
     * read twice in the same sentence.
     */
    expect(whatThisProves('CALL', 'SELF_REPORTED', 'the salesperson', null)).toContain('the salesperson');
    expect(whatThisProves('VISIT', 'RECORDED', 'the salesperson', 'Shop A')).not.toContain('the salesperson');
  });

  it('and is always a label the caller resolved, never a name', () => {
    /* Same rule as a stored report: a name cannot reach here because one is never passed. */
    const says = whatThisProves('CALL', 'SELF_REPORTED', 'the salesperson', 'Shop A');
    expect(says).toContain('the salesperson');
    expect(says).toContain('Shop A');
  });

  it('and a record with no counterparty reads without one', () => {
    expect(whatThisProves('CALL', 'RECORDED', 'the salesperson', null)).not.toContain('with ');
  });
});
