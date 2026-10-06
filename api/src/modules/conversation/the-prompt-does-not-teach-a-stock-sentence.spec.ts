import { ENGINE_RULES } from './prompt-library';

/**
 * "That is noted, and it is the kind of thing that changes how you go about the conversation." was in
 * seven scenarios on 1 October. It was the prompt's own worked example of what to say when something
 * matters, in the same block that tells the model never to say "that is noted". A model copies an
 * example before it obeys a rule beside it.
 */
describe('the prompt does not teach a stock sentence', () => {
  it('does not contain the sentence, and tells the model not to say it matters or is marked', () => {
    expect(ENGINE_RULES).not.toContain('the kind of thing that changes how you go about the conversation');
    expect(ENGINE_RULES).toMatch(/DO NOT SAY THAT IT IS MARKED OR NOTED/);
  });

  it('is the prompt that is seeded, so the version that runs on the next boot is this one', () => {
    const { SEED_PROMPTS } = require('./prompt-library');
    const system = SEED_PROMPTS.find((p: any) => p.key === 'system');
    expect(system.content).toBe(ENGINE_RULES);
  });
});
