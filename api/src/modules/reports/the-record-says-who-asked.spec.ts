import { factsAbout } from './the-facts-about-a-person';
import { factsAsLines } from './the-picture-in-plain-sentences';

/**
 * "THE CEO ASKED ME TO ON SEPTEMBER 2ND" WAS ON THE RECORD AND REACHED NOBODY.
 *
 * The realign scenario's right answer is that two of three engineers were steered by the chief
 * executive directly, in conversations the team lead does not know happened. The judgement instead
 * said the team were working on different things - true, and not the reason.
 *
 * Diagnosed in three steps, each one ruling out the answer before it:
 *
 *   1. Not the judgement's instruction. The same material under three different instructions, four
 *      samples each: the CEO appeared 0 times in 12.
 *   2. Not the record. Every run of the scenario had three or four entries saying it outright, all
 *      typed INTENT.
 *   3. `PersonFacts` had no field fed by INTENT. The per-person paragraph is written from those
 *      fields alone, so the sentence could not be written, and the judgement is written from the
 *      paragraphs. It got through once in three runs, because one person happened to repeat it
 *      inside a PROGRESS line - the fact arriving by accident.
 *
 * A prompt rule was the first fix and it could not work, which is the point of this test: the
 * writer cannot say what it was never given.
 */
const entry = (type: string, text: string, session = 1) => ({ type, text, session } as any);
const person = (said: any[]) => ({ participantId: 'p1', label: 'Participant A', isLead: false, said, targets: [] });

describe('the record says who asked, and so does the person’s paragraph', () => {
  it('keeps the line that says why they are on this work', () => {
    const f = factsAbout(person([
      entry('PROGRESS', 'I began work on it on September 2nd.'),
      entry('INTENT', 'The CEO asked me to build it. He said it was urgent.'),
    ]) as any, 1)!;
    expect(f.whyTheySayTheyAreOnIt).toBe('The CEO asked me to build it. He said it was urgent');
  });

  it('prefers the intent that names a reason over a later vague one', () => {
    /* "I took that as direction" is an intent. "The CEO asked me to" is the one that explains the
       check-in, and it is usually said first. Recency alone would have thrown it away. */
    const f = factsAbout(person([
      entry('INTENT', 'The CEO asked me to on September 2nd.', 1),
      entry('INTENT', 'I am going to keep pushing on it.', 3),
    ]) as any, 3)!;
    expect(f.whyTheySayTheyAreOnIt).toContain('The CEO asked me to');
  });

  it('falls back to the latest intent when none names a reason', () => {
    const f = factsAbout(person([entry('INTENT', 'I am going to finish the pricing work', 2)]) as any, 2)!;
    expect(f.whyTheySayTheyAreOnIt).toBe('I am going to finish the pricing work');
  });

  it('is null where they never said why, and invents nothing', () => {
    const f = factsAbout(person([entry('PROGRESS', 'I shipped the referral scheme.')]) as any, 1)!;
    expect(f.whyTheySayTheyAreOnIt).toBeNull();
  });

  it('and it reaches the model, in their own words, which is the half a prompt rule could not do', () => {
    const f = factsAbout(person([
      entry('PROGRESS', 'I began work on it on September 2nd.'),
      entry('INTENT', 'The CEO asked me to build it.'),
    ]) as any, 1)!;
    const lines = factsAsLines(f, () => 'Ruth Njeri');
    expect(lines).toContain('why they say they are on this work, in their words: "The CEO asked me to build it"');
  });

  it('does not disturb the three fields that were already there', () => {
    const f = factsAbout(person([
      entry('SUCCESS_DEFINITION', 'Success is the referral scheme being live and bringing in signups'),
      entry('PROGRESS', 'I have 40 signups so far.'),
      entry('WORRY', 'I am not sure anybody else knows I am doing this.'),
      entry('INTENT', 'The CEO asked me to build it.'),
    ]) as any, 1)!;
    expect(f.whatTheySaidItWasFor).toContain('referral scheme being live');
    expect(f.whereTheySayTheyAre).toContain('40 signups');
    expect(f.whatTheySayIsInTheWay).toContain('anybody else knows');
    expect(f.whyTheySayTheyAreOnIt).toContain('The CEO asked me to');
  });
});
