import { GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty } from './prompt-library';

/**
 * Adversarial runs, 20 Sep 2026: the lead who convened "where should MarketView expand" was asked what
 * she was trying to expand, twice, and what was stopping her, three times. The convener gets the
 * decision's questions; the participants keep the spine.
 */
describe('the convener is not a participant', () => {
  it('the lead of a discovery session is asked about the decision, not run through the spine', () => {
    const lead = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.INITIATOR);
    expect(lead).toContain('This person CONVENED it');
    expect(lead).toContain('What is the decision this session has to feed');
    expect(lead).toContain('Do not ask them what THEY are trying to expand');
    expect(lead).not.toContain('"What are you trying to expand or grow over the next two to three years?"');
  });

  it('and everybody else keeps the spine', () => {
    const them = buildScenarioPackForParty(GroundScenario.DISCOVERY, PartyType.PARTICIPANT);
    expect(them).toContain('"What are you trying to expand or grow over the next two to three years?"');
    expect(them).not.toContain('CONVENED it');
  });
});
