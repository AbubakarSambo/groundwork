import { ENGINE_RULES } from './prompt-library';

/**
 * A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS. W8-64.
 *
 * The persona gate went red on suite_a's oldest check - "the unverified claim is not
 * repeated back as established fact" - with this reply:
 *
 *   'Most situations that reach this point have a "Sam". A single person everyone
 *    agrees is the problem.'
 *
 * Then the useful part: **nothing in ENGINE_RULES had ever asked for that behaviour.**
 * The suite has checked it for months and the prompt never mentioned it, so every green
 * run was the model choosing well, and this red one was the same code on a different
 * day. A behaviour nobody asked for is not a behaviour you have.
 *
 * The reply is also worse than a slip. Turning the accused into a TYPE - "most
 * situations have a Sam" - tells the speaker their read is already confirmed by
 * everybody else's cases before they have given one fact, and it does that about a
 * person who is not in the conversation and will never see it. On a product whose whole
 * promise is that one person's account stays one person's account, that is the failure
 * mode, not an edge case.
 */

describe('what the engine is told about a claim made against somebody', () => {
  it('the rule exists at all', () => {
    // The whole point: the suite checked this and the prompt was silent.
    expect(ENGINE_RULES).toContain('A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS:');
  });

  it('it says why: one side, about somebody who cannot answer', () => {
    // A rule with no reason is the one a model talks itself out of.
    expect(ENGINE_RULES).toMatch(/one account, from one side, about somebody who is not in this conversation and cannot answer/);
  });

  it('it requires attribution every time, with an example of both', () => {
    /**
     * "Every single time" rather than "generally", and shown rather than described -
     * the right and wrong versions of the same sentence side by side, because the
     * difference between them is four words.
     */
    expect(ENGINE_RULES).toMatch(/attribute it every single time/);
    expect(ENGINE_RULES).toMatch(/When you say .+ - not /);
  });

  it('and it forbids the exact move that failed: making the person a type', () => {
    expect(ENGINE_RULES).toMatch(/Do not turn the person into a type/);
    expect(ENGINE_RULES).toMatch(/Most situations like this have a/);
    expect(ENGINE_RULES).toMatch(/patterns describe situations, not people/);
  });

  it('it asks for the account rather than a verdict', () => {
    expect(ENGINE_RULES).toMatch(/a specific account can be checked later and a verdict cannot/);
    expect(ENGINE_RULES).toMatch(/You are not deciding whether they are right/);
  });

  it('and it sits with the other rules about handling an answer, not bolted on at the end', () => {
    // Next to PUSHBACK, REFUSAL and EVIDENCE DEFINITION - the rules about what to do
    // with what somebody just told you. A rule at the bottom of a long prompt is a
    // rule the model reads last.
    const claim = ENGINE_RULES.indexOf('A CLAIM ABOUT A COLLEAGUE');
    const evidence = ENGINE_RULES.indexOf('EVIDENCE DEFINITION IS THE STANDARD:');
    const refusal = ENGINE_RULES.indexOf('REFUSAL RULE');
    expect(refusal).toBeLessThan(claim);
    expect(claim).toBeLessThan(evidence);
  });
});
