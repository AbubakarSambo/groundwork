import { GroundScenario, PartyType } from '@prisma/client';
import {
  ENGINE_RULES,
  buildScenarioPackForParty,
} from './prompt-library';

/**
 * Duration guard: the check-in must never assume a timeframe, must ASK for one
 * in conversation, and must CONFIRM it at the end.
 *
 * These bite three ways:
 *  (1) the never-assume + ask + end-confirm rule must be present in the always-on
 *      ENGINE_RULES (drop any clause -> fails);
 *  (2) no scenario question pack may hardcode an assumed period like
 *      "in the next 60 days" (re-add one -> fails);
 *  (3) the record schema must be able to carry a stated TIMEFRAME.
 */
describe('duration: ask in conversation, never assume, confirm at end', () => {
  it('ENGINE_RULES forbids assuming a period the person did not give', () => {
    expect(ENGINE_RULES).toMatch(/TIMEFRAME RULE/);
    expect(ENGINE_RULES).toMatch(/Never state or assume a timeframe/i);
    // the exact examples the model must NOT emit unprompted
    expect(ENGINE_RULES).toMatch(/in the next 30 days/);
    expect(ENGINE_RULES).toMatch(/unless the person stated that period in their own words/i);
  });

  it('ENGINE_RULES tells the engine to ASK for the timeframe before anchoring goals', () => {
    expect(ENGINE_RULES).toMatch(/the timeframe is part of establishing success/i);
    expect(ENGINE_RULES).toMatch(/your very next question asks for the period/i);
    /* Changed 3 November 2026 (no forced close): "Do not let the person move toward wrapping up before ..." went; it asks once, naturally. */
    expect(ENGINE_RULES).toMatch(/This is required, ask it once, naturally, not as a form field\. Wait for their answer/i);
    expect(ENGINE_RULES).not.toMatch(/Do not let the person move toward wrapping up/i);
  });

  /* Changed 3 November 2026 (Hafsah: no forced close): the combined "Is that still the right time span for this, and are you ready to close
     this check-in?" went with the scripted close. A timeframe never given is asked for once, before the model offers to wrap up. */
  it('ENGINE_RULES asks for a timeframe never given before it offers to wrap up, with no scripted closing confirmation', () => {
    expect(ENGINE_RULES).toMatch(/If they never gave a timeframe, ask for it once before you offer to wrap up/i);
    expect(ENGINE_RULES).not.toMatch(/are you ready to close this check-in/i);
  });

  it('no scenario question pack hardcodes an assumed period', () => {
    for (const scenario of Object.values(GroundScenario)) {
      for (const party of [PartyType.INITIATOR, PartyType.PARTICIPANT]) {
        const pack = buildScenarioPackForParty(scenario as GroundScenario, party);
        expect(pack).not.toMatch(/in the next 60 days/i);
        expect(pack).not.toMatch(/in the next 30 days/i);
      }
    }
  });

});
