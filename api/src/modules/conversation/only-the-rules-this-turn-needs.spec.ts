import { onlyTheRulesThisTurnNeeds, whatWasLeftOut, WHAT_CAN_BE_LEFT_OUT } from './only-the-rules-this-turn-needs';
import { ENGINE_RULES } from './prompt-library';

/**
 * ONLY THE RULES THIS TURN NEEDS.
 *
 * Nothing is removed from the product. A section is left out of the turns where its own text says it
 * does not apply - most of all the goal-alignment fallback, whose opening calls it "the fallback for
 * when there is none" and which every one of the twenty-two situations replaces with its own prompt.
 */
const A_NORMAL_TURN = { hasASituationPack: true, sessionNumber: 3 };

describe('routing the engine prompt', () => {
  it('leaves the fallback interview out when the situation has its own prompt', () => {
    const out = onlyTheRulesThisTurnNeeds(ENGINE_RULES, A_NORMAL_TURN);
    expect(out).not.toContain('GOAL ALIGNMENT: the most important first conversation');
    expect(out.length).toBeLessThan(ENGINE_RULES.length);
  });

  it('and puts it back when there is no situation prompt, which is what it is for', () => {
    const out = onlyTheRulesThisTurnNeeds(ENGINE_RULES, { hasASituationPack: false, sessionNumber: 1 });
    expect(out).toContain('GOAL ALIGNMENT: the most important first conversation');
  });

  it('leaves the returning-user opening out of session one, where nobody is returning', () => {
    expect(onlyTheRulesThisTurnNeeds(ENGINE_RULES, { hasASituationPack: true, sessionNumber: 1 }))
      .not.toContain('RETURNING USER OPENING');
    expect(onlyTheRulesThisTurnNeeds(ENGINE_RULES, A_NORMAL_TURN)).toContain('RETURNING USER OPENING');
  });

  /*
   * THE ORGANS STAY IN, AND THIS IS THE TEST THAT SAYS SO. Everything that runs on an ordinary turn
   * has to survive the routing, or this has stopped being a filter and become a cut.
   */
  it('keeps every rule that a normal turn uses', () => {
    const out = onlyTheRulesThisTurnNeeds(ENGINE_RULES, A_NORMAL_TURN);
    for (const kept of [
      'CONVERSATION QUALITY RULES',
      'WHO YOU SOUND LIKE',
      'TONE STATES',
      'POSITIVE SIGNAL DETECTION',
      'LIVE FEEDBACK RULES',
      'CHECK-IN ENDING',
      'THE THREE FAILURE ORIGINS',
      'THE SURVIVABLE TRUTH PRINCIPLE',
      'CONTRIBUTION TAXONOMY',
      'INJECTION LAYER',
      'QUALITY OF DELIVERY',
      'TRUST CALIBRATION',
      'REFUSING TO TAKE PART',
      'VOCABULARY: PRODUCT VOICE',
      'BANNED WORDS',
      'HUMAN FIRST RULE',
      'SESSION CLOSE MARKER',
      'TIMEFRAME RULE',
    ]) {
      expect(out).toContain(kept);
    }
  });

  it('never drops a section it cannot find, so an edit upstream cannot break it', () => {
    const notTheRealPrompt = 'just some text with no separators at all';
    expect(onlyTheRulesThisTurnNeeds(notTheRealPrompt, A_NORMAL_TURN)).toBe(notTheRealPrompt);
    expect(onlyTheRulesThisTurnNeeds('', A_NORMAL_TURN)).toBe('');
  });

  /*
   * AND IT HAS TO ACTUALLY STILL BE SAVING SOMETHING. The failure mode of a filter keyed on headings
   * is that a heading is reworded upstream, nothing matches, and it silently becomes a no-op.
   */
  it('is still finding what it routes', () => {
    for (const r of WHAT_CAN_BE_LEFT_OUT) expect(ENGINE_RULES).toContain(r.heading);
    const saved = ENGINE_RULES.length - onlyTheRulesThisTurnNeeds(ENGINE_RULES, A_NORMAL_TURN).length;
    expect(saved).toBeGreaterThan(10000);
  });

  it('and says what it left out, so a shrinking prompt is never a silent change', () => {
    const said = whatWasLeftOut(A_NORMAL_TURN);
    expect(said.join(' ')).toContain('GOAL ALIGNMENT');
    expect(said.join(' ')).toMatch(/fallback for when the situation has no prompt of its own/i);
  });
});
