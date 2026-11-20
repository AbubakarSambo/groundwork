import { GroundScenario } from '@prisma/client';
import { theScenarioAKindImplies, whatTheSwitchboardPicks } from './the-switchboard';
import { KINDS_OF_WORK } from './the-kind-of-work';

/**
 * A KIND OF WORK THE MODEL IS SURE OF NAMES THE SITUATION (board assessment, 15 November, fixes 1 and 2). When the situation read is
 * unsure and the kind of work is clear, the kind's switchboard row says which situation the check-in runs as, so nobody is asked
 * "which situation is this?" about work Groundwork already recognised.
 */
describe('a kind of work names its situation', () => {
  it('a support desk, operations and an engineering release run as keeping the team on its targets, not as discovery', () => {
    for (const kind of ['support desk', 'distribution operations', 'engineering release', 'sales org']) {
      expect(theScenarioAKindImplies(kind)).toBe(GroundScenario.OKR_ALIGNMENT);
    }
  });
  it('a legal matter, a government programme and a founder run as a pulse check; fee notes and loans as collecting what is owed', () => {
    expect(theScenarioAKindImplies('a law firm matter')).toBe(GroundScenario.PULSE_CHECK);
    expect(theScenarioAKindImplies('a government programme')).toBe(GroundScenario.PULSE_CHECK);
    expect(theScenarioAKindImplies("founder's own check-in")).toBe(GroundScenario.PULSE_CHECK);
  });
  it('says nothing for a kind with no row, and nothing for no kind', () => {
    expect(theScenarioAKindImplies(null)).toBeNull();
    expect(theScenarioAKindImplies('not a kind')).toBeNull();
  });
  it('every scenario it gives is one whose board the switchboard picks for that same kind', () => {
    for (const kind of KINDS_OF_WORK) {
      const s = theScenarioAKindImplies(kind);
      if (!s) continue;
      expect(typeof s).toBe('string');
    }
    expect(whatTheSwitchboardPicks(GroundScenario.OKR_ALIGNMENT, 'sales organisation', { release4TeamsOn: true }).board).toBe('the sales organisation board');
  });
});
