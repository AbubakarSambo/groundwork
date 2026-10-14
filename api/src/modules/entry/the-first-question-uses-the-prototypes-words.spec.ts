import { THE_FIRST_QUESTION, theSetupPackFor } from './the-first-question-for-this-situation';

/**
 * HAFSAH'S FIX LIST, ITEM 7 (14 October 2026): "Where the prototype has wording, use it exactly." The prototype's setup
 * for "Help someone get back on track" opens with "Who is it, and what were they meant to be delivering?"
 * (docs/prototype/screens/B1-starting-a-check-in/start-chat.txt). That is the first question the lead is asked, and it
 * is what the setup's instructions tell the model to ask. Every row is in docs/question-wording.md.
 */

describe('the first question uses the prototype\'s words where the prototype has them', () => {
  it('"Help someone get back on track" opens as the prototype does', () => {
    expect(THE_FIRST_QUESTION.PIP.ask).toBe('Who is it, and what were they meant to be delivering?');
    expect(theSetupPackFor('PIP' as any)).toContain('Who is it, and what were they meant to be delivering?');
  });
});
