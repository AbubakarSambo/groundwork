import { ENGINE_RULES, SEED_PROMPTS } from './prompt-library';

/**
 * B-114: Zawadi wrote "Nothing else from me today." and read back "Nothing until the review.", a line she
 * never wrote. It was the prompt's own quoted example, which the model said as if it were hers. The example
 * is now described, not quoted, so there is no ready line to put in her mouth. The seeded "system" prompt,
 * which is what runs once the API starts, carries the same words.
 */
describe('the close never hands the model a line to say for the person', () => {
  it('the engine rules hold no quoted "Nothing until the review"', () => {
    expect(ENGINE_RULES).not.toContain('Nothing until the review');
    expect(ENGINE_RULES).toContain('Acknowledge what they wrote in their words');
  });
  it('and the seeded system prompt is the same text', () => {
    expect(SEED_PROMPTS.find((p: { key: string }) => p.key === 'system')?.content).toBe(ENGINE_RULES);
  });
});
