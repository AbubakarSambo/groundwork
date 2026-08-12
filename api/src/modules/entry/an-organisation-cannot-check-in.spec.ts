import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NAMING FIVE ORGANISATIONS IS NOT NAMING THE PEOPLE INVOLVED.
 *
 * Reproduced live. Asked "Who else is on the team with you?", answered with five
 * organisations - Afrimash, Bridge Merchant, Aquaresh, NABG, Bayer - the setup replied
 * "That sounds like an important group of partners", asked one more question, then said
 * "Thank you. That gives me what I need to set this up for you" and closed.
 *
 * It never asked who the people are.
 *
 * WHAT WAS ALREADY RIGHT, and is deliberately not touched: the chat calls them partners,
 * the check-in calls them "five organizations", and the report's People-mentioned section
 * extracted only the one human who was named. Nothing was mistaking an organisation for a
 * person. The gap is narrower and worse: a ground was set up with nobody in it but the
 * person setting it up, and a ground is built from accounts that individuals give.
 *
 * Held on the prompt because the prompt is where the asking is decided. The engine is
 * model-first here by design, so the assertion is that the instruction exists and says the
 * right thing, not that a particular sentence comes back.
 */

const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8');

/** The onboarding system prompt, which is where setup decides what to ask. */
const PROMPT = (() => {
  const start = SRC.indexOf('const ONBOARD_SYSTEM =');
  if (start === -1) throw new Error('ONBOARD_SYSTEM is gone from entry.service.ts');
  return SRC.slice(start, SRC.indexOf('.trim();', start));
})();

describe('the who-is-involved question', () => {
  it('still asks for people and their roles', () => {
    expect(PROMPT).toMatch(/whoInvolved: who else is part of this AND their role/);
  });

  it('and now says an organisation is not an answer on its own', () => {
    // THE FIX.
    expect(PROMPT).toMatch(/ORGANISATIONS ARE NOT PEOPLE/);
    expect(PROMPT).toMatch(/who the person\s+responsible is inside them/);
  });

  it('accepts a role when the name is not known', () => {
    // Insisting on a name would stall setup for somebody who genuinely does not
    // know yet, which is common at the start of a piece of work.
    expect(PROMPT).toMatch(/by name if they know it, by role if they do not/);
  });

  it('asks once, and never invents a name', () => {
    /**
     * The two ways this instruction could do harm. Pressing repeatedly turns setup
     * into an interrogation, and a fabricated name would put a person on a record
     * who was never mentioned - the one thing this product must never do.
     */
    expect(PROMPT).toMatch(/never press twice/);
    expect(PROMPT).toMatch(/never invent a name/);
  });

  it('and the wrap-up rule is unchanged, so the closer still cannot ask a question', () => {
    // The instruction sits next to the closing rule. If it had displaced it, setup
    // would end on a question the person cannot answer, which is a bug this file
    // already fixed once.
    expect(PROMPT).toMatch(/NO question mark anywhere/);
  });
});
