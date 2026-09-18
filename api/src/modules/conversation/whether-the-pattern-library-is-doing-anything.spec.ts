import { thePatternsThisReplyReachedFor, thePatternLine, HOW_MANY_PATTERNS_ARE_IN_THE_PROMPT } from './whether-the-pattern-library-is-doing-anything';

/**
 * COUNTING WHETHER THE PATTERN LIBRARY IS DOING ANYTHING.
 *
 * Ninety named patterns take about 16,000 of the conversation prompt's 113,000 characters, on every
 * turn. Whether they earn that is an open question and this is how it gets answered from real
 * conversations rather than from argument. Nothing here changes a reply.
 */
describe('what a reply reached for', () => {
  it('reads the patterns out of the prompt itself, so the two cannot drift', () => {
    /* If the catalogue is ever edited, this number moves with it rather than going stale. */
    expect(HOW_MANY_PATTERNS_ARE_IN_THE_PROMPT).toBeGreaterThan(50);
  });

  it('sees a reply that reaches for a pattern by its own words', () => {
    const found = thePatternsThisReplyReachedFor(
      'That reads like scope rewriting: the definition of success moved halfway through.',
    );
    expect(found.map((f) => f.label)).toContain('Scope Rewriting');
  });

  /*
   * THE CONSERVATIVE HALF, AND THE REASON THE NUMBER IS WORTH ANYTHING. One shared word is a
   * coincidence, and a count built on coincidences would say the library is working everywhere and
   * prove nothing. Every distinctive word of the label has to be there.
   */
  it('and does not count an ordinary sentence that shares one word', () => {
    expect(thePatternsThisReplyReachedFor('What is the scope of the work this period?')).toEqual([]);
    expect(thePatternsThisReplyReachedFor('Who is delivering that?')).toEqual([]);
  });

  it('is silent on an ordinary reply, which is the usual case', () => {
    expect(thePatternLine('ci1', 'What would tell you the shops are stocking it?')).toBeNull();
  });

  it('and writes one greppable line when it is not', () => {
    const line = thePatternLine('ci1', 'This looks like strategy theater rather than delivery.');
    expect(line).toContain('pattern-library check-in=ci1');
    expect(line).toContain('Strategy Theater');
  });

  it('handles an empty reply without deciding anything', () => {
    expect(thePatternsThisReplyReachedFor('')).toEqual([]);
    expect(thePatternLine('ci1', '')).toBeNull();
  });
});
