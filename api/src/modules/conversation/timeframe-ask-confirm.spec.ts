import { GroundScenario, PartyType } from '@prisma/client';
import {
  ENGINE_RULES,
  RECORD_EXTRACTION_PROMPT,
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
    expect(ENGINE_RULES).toMatch(/Do not let the person move toward wrapping up before you have asked for the period/i);
  });

  it('ENGINE_RULES requires a single combined end-of-session confirmation of the timeframe', () => {
    expect(ENGINE_RULES).toMatch(/At the end of the session, before the record closes, confirm the timeframe/i);
    expect(ENGINE_RULES).toMatch(/one combined closing confirmation, never two stacked prompts/i);
    expect(ENGINE_RULES).toMatch(/is that still the period you want this measured against/i);
    // if the person never gave one, ask at the end rather than closing without it
    expect(ENGINE_RULES).toMatch(/If they never gave a timeframe, ask for it then/i);
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

  it('the record schema can carry a stated TIMEFRAME (and only when stated)', () => {
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/- TIMEFRAME -/);
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/Record it ONLY if the person actually stated it/i);
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/Never infer or invent a period/i);
  });
});
