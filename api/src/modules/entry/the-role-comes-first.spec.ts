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

  it('names all three answers, because the third one is the useful one for an admin', () => {
    // "Somebody else is going to run it" is the honest path for a bystander with no detail, and it was
    // reachable only by reading to the end of a different question.
    expect(SRC).toMatch(/are you part of this too/i);
    expect(SRC).toMatch(/setting it up for other\s+people/i);
    // Whitespace-tolerant: the prompt is wrapped prose, so a phrase can straddle a line break.
    expect(SRC).toMatch(/somebody else going\s+to run it/i);
  });

  it('captures it as a field rather than reading it out of prose', () => {
    expect(SRC).toMatch(/yourRole: \{ type: 'string', enum: \['a_party', 'setting_up_for_others', 'someone_else_runs_it'\] \}/);
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
