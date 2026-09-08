import { withNames } from './party-labels';

/**
 * THE REPORT ADDRESSED THE READER AS "YOU", "THEY" AND "YOU" IN THREE SENTENCES.
 *
 * Read off a live forming report on the Report tab, one paragraph, one person:
 *
 *   "Only you have checked in. Their record describes two standards being used to evaluate the
 *    first quarter's work. ... Your record states: 'I doubt she knows it is part of how I am
 *    judging her.'"
 *
 * One report is generated in labels and rendered per reader, so every grammar rule lives in
 * `withNames`. They all worked inside ONE clause - the label, its possessive, the verb after it.
 * A pronoun that OPENS THE NEXT SENTENCE has no label in it to match, and its antecedent was the
 * label in the sentence before, which had just become "you".
 *
 * "What quality is this report" - on a page whose whole claim is that it holds what people said
 * carefully, this reads as broken software.
 */
describe('the reader is one person from sentence to sentence', () => {
  const visible = new Map<string, string>();
  const asRead = (text: string) =>
    withNames(text, visible, ['the initiator'], { viewerLabel: 'initiator' });

  it('carries "you" into the next sentence when it is still their own account', () => {
    const out = asRead(
      "Only the initiator has checked in. Their record describes two standards. The initiator's record states: 'I doubt she knows.'",
    );
    expect(out).toBe(
      "Only you have checked in. Your record describes two standards. Your record states: 'I doubt she knows.'",
    );
    expect(out).not.toContain('Their record');
  });

  it('and leaves a genuine third party alone', () => {
    /* "Their manager" is somebody else's manager. The rule is scoped to nouns that can only name
       a person's own testimony, which is why it can be applied at all. */
    expect(asRead('The initiator raised scope twice. Their manager was not told.')).toBe(
      'You raised scope twice. Their manager was not told.',
    );
  });

  it('and does not reach across a sentence that moved on to somebody else', () => {
    const out = asRead('The initiator set the target. The delivery lead disagreed. Their account differs.');
    expect(out).toContain('Their account differs.');
  });
});
