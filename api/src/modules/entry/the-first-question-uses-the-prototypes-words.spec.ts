import { THE_FIRST_QUESTION, theSetupPackFor } from './the-first-question-for-this-situation';

/**
 * HAFSAH'S DECISION, 15 OCTOBER 2026: setup for "Help someone get back on track" opens with the product's own question,
 * "Who is this about, and what is not happening that should be?". On 14 October it was changed to the prototype's
 * "Who is it, and what were they meant to be delivering?" (fix list, item 7); she asked for it back. It is what the setup's
 * instructions tell the model to ask. docs/question-wording.md says so.
 */
describe('"Help someone get back on track" opens with the question Hafsah chose', () => {
  it('asks who it is about and what is not happening', () => {
    expect(THE_FIRST_QUESTION.PIP.ask).toBe('Who is this about, and what is not happening that should be?');
    expect(theSetupPackFor('PIP' as any)).toContain('Who is this about, and what is not happening that should be?');
    expect(theSetupPackFor('PIP' as any)).not.toContain('Who is it, and what were they meant to be delivering?');
  });
});
