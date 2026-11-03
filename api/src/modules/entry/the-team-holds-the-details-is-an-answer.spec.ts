import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_FIRST_UPDATE_TOO } from './setup-is-the-first-check-in';

/**
 * "MY TEAM HAS THOSE DETAILS" IS AN ANSWER, AND THE TEAM CAN BE ADDED AT ANY TIME (round 6, the law firm lead, 1 November 2026).
 *
 * She said again and again that her team holds the details and asked to add them. Setup asked her for "each open deal, task or problem,
 * its next step and its day", told her "I can't add them right now" and "You can invite them once we've finished setting up", and she
 * started over three times. The first update is what the lead knows, and saying the team holds the rest is their answer: the team's
 * check-ins ask for it. The team box is beside the conversation, so the prompt says the team can be added at any time.
 *
 * Held on the words going in: the setup is model-led, so what is checked is what the model is told, not a sentence that comes back.
 * Setup's prompt runs from code (no PromptVersion row overrides onboard).
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PROMPT = SRC.slice(SRC.indexOf('const ONBOARD_SYSTEM ='), SRC.indexOf('.trim();', SRC.indexOf('const ONBOARD_SYSTEM =')));

describe('the lead whose team holds the details', () => {
  it('is asked for what she knows, and her team holding the rest is her answer', () => {
    expect(THE_FIRST_UPDATE_TOO).toContain('as far as the lead knows it');
    expect(THE_FIRST_UPDATE_TOO).toContain('If they say the details are their team\'s, or they do not know, that is their answer');
    expect(THE_FIRST_UPDATE_TOO).not.toContain('each open deal, task or problem, its next step and its day');
  });

  /* Changed 3 November 2026: THE_BOARD_IS_COVERED went with the scripted end of setup; the model now offers to wrap up in its own words
     (HOW_SETUP_ENDS), and the team holding the details stays her answer through THE_FIRST_UPDATE_TOO above. */
  it('nothing in setup holds her to a scripted last question', () => {
    expect(SRC).not.toMatch(/THE_BOARD_IS_COVERED|Anything else I should know\?/);
  });

  it('is told her team can be added at any time, never only later', () => {
    expect(PROMPT).toContain('THEIR TEAM CAN BE ADDED AT ANY TIME');
    expect(PROMPT).not.toContain('after this, they will add the people involved');
  });
});
