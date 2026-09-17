import { namesNobodySaid } from './the-record-holds-what-was-said';

/**
 * A COMMON WORD THAT OPENED A SENTENCE IS NOT A NAME.
 *
 * The invention gate deletes a sentence carrying a proper noun nobody typed, which is right: a
 * person's record must not contain a colleague, a company or a place the product invented. It finds
 * those by looking for capitalised words, and an ordinary word capitalised because it began a
 * sentence looks exactly the same.
 *
 * READ LIVE, 17 SEPTEMBER 2026. Somebody asked for examples, got them, and the middle of the answer
 * was cut: "Those are the shapes I'm looking for." went, because "Those" is capitalised and she had
 * not typed it. What reached her was a half-sentence ending in an unclosed quotation mark, in the
 * reply that was finally giving her what she asked for.
 *
 * This is the same fault that deleted month names and day numbers twice before. The remedy is the
 * same and it is not clever: the list of words that are not names gets longer whenever a live run
 * finds one it did not have.
 */
describe('the invention gate', () => {
  const THEY_SAID = ['we are chasing forty shops in Kano and the wholesale margin is stuck at twelve percent'];

  it('does not read an ordinary word as a name because it began a sentence', () => {
    const openers = [
      'Those are the shapes I am looking for.',
      'These would count as evidence.',
      'Each of them owns a number.',
      'Something changed between the two periods.',
      'Whatever you would actually look at is the answer.',
      'Right, that is the part that moved.',
      'Nothing about that has changed yet.',
      'Tell me what moved first.',
    ];
    for (const line of openers) {
      expect(namesNobodySaid(line, THEY_SAID)).toEqual([]);
    }
  });

  /*
   * And the check still does its job. If widening the list ever turned this green by turning the
   * gate off, the whole file would be worthless - so a real invented name is asserted alongside.
   */
  it('still catches a person, a company or a place nobody named', () => {
    expect(namesNobodySaid('Priya raised it with Afrimash last week.', THEY_SAID)).toEqual(
      expect.arrayContaining(['Priya']),
    );
  });

  it('and still takes a name the person did type', () => {
    expect(namesNobodySaid('What is happening in Kano?', THEY_SAID)).toEqual([]);
  });
});
