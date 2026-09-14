import { GroundScenario } from '@prisma/client';
import { BoardFamily, SCENARIO_FAMILY, FAMILY_SECTIONS, familyFor, boardHasSection } from './board-families';

const CONTRACTS = [GroundScenario.CONTRACT_REVIEW, GroundScenario.IMPLEMENTATION_TRACKING];

describe('a fairness read never crosses a company boundary', () => {
  it('puts both contract cards in their own family', () => {
    for (const s of CONTRACTS) expect(familyFor(s)).toBe(BoardFamily.AGREEMENT);
  });

  it('never shows contribution or coverage on either', () => {
    for (const s of CONTRACTS) {
      expect(boardHasSection(s, 'contribution')).toBe(false);
      expect(boardHasSection(s, 'coverage')).toBe(false);
    }
  });

  it('and no other family can put them back by accident', () => {
    /* The regression this exists for: CONTRACT_REVIEW and IMPLEMENTATION_TRACKING sat in SENSING,
       SENSING was expanded so a drift could hold what the group decided, and it gained contribution
       - so each side of a contract would have been shown a fairness read on the other side's
       people. The family boundary is the fix; this is the guard on it. */
    expect(FAMILY_SECTIONS[BoardFamily.AGREEMENT]).not.toContain('contribution');
    expect(FAMILY_SECTIONS[BoardFamily.AGREEMENT]).not.toContain('coverage');
    expect(FAMILY_SECTIONS[BoardFamily.AGREEMENT]).not.toContain('cascade');
  });

  it('still shows what an agreement is actually about', () => {
    for (const s of CONTRACTS) {
      expect(boardHasSection(s, 'objectives')).toBe(true);
      expect(boardHasSection(s, 'divergence')).toBe(true);
      expect(boardHasSection(s, 'whoOwnsWhat')).toBe(true);
      expect(boardHasSection(s, 'decisions')).toBe(true);
    }
  });

  it('has no phase spine, because an agreement has versions rather than phases', () => {
    expect(FAMILY_SECTIONS[BoardFamily.AGREEMENT]).not.toContain('phaseSpine');
  });

  it('leaves every other scenario where it was', () => {
    expect(SCENARIO_FAMILY[GroundScenario.DRIFT]).toBe(BoardFamily.SENSING);
    expect(SCENARIO_FAMILY[GroundScenario.ACUTE_SHOCK]).toBe(BoardFamily.SENSING);
    expect(SCENARIO_FAMILY[GroundScenario.NEW_PROJECT]).toBe(BoardFamily.DELIVERY);
  });
});
