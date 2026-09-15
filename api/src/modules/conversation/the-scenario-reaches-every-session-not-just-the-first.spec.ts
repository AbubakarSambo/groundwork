import { GroundScenario, PartyType } from '@prisma/client';
import { buildIntakeBlock } from './prompt-library';

/*
 * The pack was built inside `if (sessionNumber === 1)`, so whichStage() could only ever be handed
 * a 1: the table's second and last cells were written, tested, and unreachable. And from session 2
 * the scenario left the prompt entirely, so a fourth check-in about an improvement plan and a
 * fourth check-in about targets read word for word the same.
 *
 * Asserted at the assembled block, because that is the only place it was ever false.
 */
const activePathway = (scenario: GroundScenario, sessionNumber: number): string => {
  const block = buildIntakeBlock({
    scenario,
    partyType: PartyType.INITIATOR,
    sessionNumber,
    totalSessions: 4,
  } as never);
  const found = block.match(/ACTIVE_PATHWAY: ([\s\S]*?)\n[A-Z_]+:/);
  return (found ? found[1] : '').trim();
};

describe('the scenario reaches every session, not just the first', () => {
  const laterSessions = [2, 3, 4];

  for (const sessionNumber of laterSessions) {
    it(`session ${sessionNumber} still says which check-in this is`, () => {
      expect(activePathway(GroundScenario.OKR_ALIGNMENT, sessionNumber)).toMatch(/WHAT THIS CHECK-IN IS:/);
    });

    it(`session ${sessionNumber} keeps its continuity opening`, () => {
      expect(activePathway(GroundScenario.OKR_ALIGNMENT, sessionNumber)).toMatch(/^SESSION \d/);
    });

    it(`session ${sessionNumber} reads differently for two different scenarios`, () => {
      const targets = activePathway(GroundScenario.OKR_ALIGNMENT, sessionNumber);
      const offTrack = activePathway(GroundScenario.DRIFT, sessionNumber);
      expect(targets).not.toEqual(offTrack);
    });
  }

  it('the last session gets the last cell, not the first', () => {
    const last = activePathway(GroundScenario.OKR_ALIGNMENT, 4);
    expect(last).toMatch(/This is the LAST check-in/);
    expect(last).not.toMatch(/This is the FIRST check-in/);
  });

  it('a middle session gets the second cell', () => {
    const middle = activePathway(GroundScenario.OKR_ALIGNMENT, 2);
    expect(middle).toMatch(/This is a LATER check-in, not the last/);
  });

  it('the first session is unchanged', () => {
    expect(activePathway(GroundScenario.OKR_ALIGNMENT, 1)).toMatch(/This is the FIRST check-in/);
  });
});
