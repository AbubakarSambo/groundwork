import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHETHER SOMEBODY IS PART OF THE SITUATION DECIDES WHAT THEIR WORDS ARE.
 *
 * Everything typed during setup is stored as lead context, which this product treats as "a place to
 * look, never a thing that is true". A party's words are an account. A non-party's are a hypothesis.
 * And the question of which one this person is was asked THIRD, mixed into a question about who else is
 * involved - so the words were collected first and classified afterwards.
 *
 * It was worst for the commonest case. Somebody told to set this up has no situation of their own, and
 * the flow asked them to describe one, in prose, for two rounds, before anything asked whose it was.
 *
 * STRUCTURAL, NOT INSTRUCTIONAL. The prompt already said "ask the person's own role early" and it still
 * arrived third. So the fix is a numbered first step and an extracted field, not a firmer request.
 */
/**
 * COMMENTS STRIPPED BEFORE MATCHING, per a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts.
 *
 * Everything asserted below lives inside the ONBOARD_SYSTEM template literal - it is the prompt the
 * model receives, not a note to a future reader. Stripping comments therefore removes nothing this
 * test cares about, and it removes the way this test could be satisfied by somebody writing the right
 * words in a comment above the wrong code.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the way in', () => {
  it('asks the role as step one', () => {
    expect(SRC).toMatch(/1\. yourRole:/);
  });

  it('and asks what the situation is about after it, not before', () => {
    const role = SRC.indexOf('1. yourRole:');
    const situation = SRC.indexOf('3. initial:');
    expect(role).toBeGreaterThan(-1);
    expect(situation).toBeGreaterThan(role);
  });

  it('names both answers, in terms of who writes the objective and who is measured against it', () => {
    // Not "are you part of this", which asks where somebody sits rather than what is being decided.
    // The setup screen asks it the same way; these pins are what stop the two drifting apart.
    expect(SRC).toMatch(/you set the context and objective, and you check in against it too/i);
    expect(SRC).toMatch(/other people check in against it/i);
  });

  it('and no longer offers a third, because handing the context over is gone', () => {
    /*
     * THERE WERE THREE, and the third was "somebody else sets the context, you are only setting the
     * check-in up and inviting them". Her call removed it: it produced a check-in belonging to
     * nobody in the room, since the lead was emailed to confirm a context they had not written and
     * could not read until they accepted.
     *
     * The phrase still appears in the prompt - it has to, so the model knows what NOT to offer -
     * so this asserts on the instruction rather than on the words being absent, which a bare
     * not.toMatch would get wrong in both directions.
     */
    expect(SRC).toMatch(/THERE USED TO BE A THIRD ANSWER/);
    expect(SRC).toMatch(/do NOT offer to hand it over/);
    expect(SRC).toMatch(/whoever knows what this is about should\s+be the one setting it up/i);
  });

  it('captures it as a field rather than reading it out of prose', () => {
    expect(SRC).toMatch(/yourRole: \{ type: 'string', enum: \['a_party', 'setting_up_for_others'\] \}/);
  });

  it('and forbids inferring it from how they describe the situation', () => {
    // A lead describing somebody else's problem in detail reads exactly like a party.
    expect(SRC).toMatch(/do not infer it from how they describe the situation/i);
  });

  it('tells a party their own check-in is separate, which was previously silent', () => {
    /**
     * True, never said, and the reason setup felt like being asked the same thing twice: setup answers
     * are lead context, so a party is asked the same ground again in their own check-in.
     */
    expect(SRC).toMatch(/they will do their own check-in separately/i);
    expect(SRC).toMatch(/nothing\s+they write here counts as their account/i);
  });

  it('and no longer carries the instruction that failed', () => {
    // "Ask the person's own role early" sat inside step 3 and produced exactly what it forbade.
    expect(SRC).not.toMatch(/- Ask the person's own role early/);
  });
});
