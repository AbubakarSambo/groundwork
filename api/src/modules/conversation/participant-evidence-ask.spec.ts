import { ENGINE_RULES } from './prompt-library';

/**
 * Evidence-asking guard (#2, engine half). Participants run the real engine
 * (single-path routing, #82/#83), so the engine's evidence behaviour applies
 * to them: it must actively ASK for evidence when a claim would be supported
 * by it, not just offer a silent upload. These lock that behaviour in the
 * always-on ENGINE_RULES; weaken the asks -> this bites.
 */
describe('#2 participant evidence: the engine actively asks for evidence', () => {
  it('names concrete evidence types the person can share in-chat', () => {
    expect(ENGINE_RULES).toMatch(/EVIDENCE TYPES/);
    expect(ENGINE_RULES).toMatch(/shared link, screenshot, or attached document/i);
  });

  it('asks for a written record more than once before accepting there is none', () => {
    expect(ENGINE_RULES).toMatch(/Ask 1:/);
    expect(ENGINE_RULES).toMatch(/Ask three times before accepting that nothing is written down/i);
  });

  it('turns an unverifiable claim into an evidence question', () => {
    expect(ENGINE_RULES).toMatch(/is it written down anywhere/i);
    expect(ENGINE_RULES).toMatch(/moves toward evidence/i);
  });
});
