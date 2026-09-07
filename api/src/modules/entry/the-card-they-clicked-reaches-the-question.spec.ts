import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "THE NEW HIRE CHAT SHOULD ASK WHO THE NEW HIRE IS. RIGHT NOW IT CARRIES NO CONTEXT WHEN YOU
 * SELECT A CARD."
 *
 * Her words, and the flow bore them out. Clicking "A new hire starting" posts the card's sentence
 * and the reply is the role question, asked in terms that would fit any situation on the list. The
 * click therefore appears to have gone nowhere, and the next question after it - "what is the
 * situation about?" - asks the person to type out the thing they picked off a list to avoid typing.
 *
 * Two rules were added to the onboarding prompt for that, and this file holds both. It reads the
 * prompt rather than a live reply on purpose: what is being protected is that the instruction is
 * PRESENT, which a model call cannot prove either way on a single sample.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
  /* A guard a comment satisfies is not a guard: the words below appear in prose above the prompt
     too, so the comments come out before anything is asserted. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const ONBOARD = (() => {
  const at = SRC.indexOf('const ONBOARD_SYSTEM');
  expect(at).toBeGreaterThan(0);
  return SRC.slice(at, SRC.indexOf('const EXTRACT_SYSTEM'));
})();

describe('the situation they clicked reaches the first question', () => {
  it('tells the model to name their subject in the role question', () => {
    expect(ONBOARD).toMatch(/NAME THE SITUATION THEY PICKED/);
    expect(ONBOARD).toMatch(/reads as though the click went nowhere/i);
  });

  it('gives the shape of it, so "name it" cannot be read as "summarise the card"', () => {
    expect(ONBOARD).toMatch(/One sentence of subject, one question/);
    expect(ONBOARD).toMatch(/do not add any fact the card did not carry/i);
  });

  it('makes the question AFTER the role a concrete one, not the topic again', () => {
    /* This is the half that actually answers her: who the new hire is. */
    expect(ONBOARD).toMatch(/Who is the new hire, and when do they start/);
    expect(ONBOARD).toMatch(/never for\s+the topic they already gave you/);
  });

  it('still asks the role first, which naming the situation must not displace', () => {
    expect(ONBOARD.indexOf('Ask this FIRST')).toBeLessThan(ONBOARD.indexOf('NAME THE SITUATION THEY PICKED'));
  });
});
