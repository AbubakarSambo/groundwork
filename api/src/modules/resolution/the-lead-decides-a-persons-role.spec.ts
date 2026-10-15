import { GroundScenario } from '@prisma/client';
import { closingNeedsEveryone, LEAD_DECIDES_EVERYWHERE } from './end-states';

/**
 * THE LEAD CLOSES IT. THERE IS NO AGREEMENT STEP.
 *
 * Hafsah, 24 September 2026: "the lead is meant to close it, nothing like agreement."
 *
 * This file used to pin the opposite, in two halves. Every check-in closed only when every active
 * party picked the SAME end state - that was in the first commit this repo has - and in August six
 * scenarios were carved out of it, because on a new-hire ground the hire was shown "Let them go"
 * and asked to choose it, which is a cruel thing to put in front of somebody and a veto over a
 * decision that was never theirs.
 *
 * The carve-out was the right instinct about the wrong rule. Unanimity does not give people a
 * voice, it gives everybody a veto, and the evidence was already in: eighteen grounds, two hundred
 * and sixty-five finished check-ins, not one of them ever closed.
 */
describe('who closes a check-in', () => {
  it('the lead, on every scenario there is', () => {
    expect(LEAD_DECIDES_EVERYWHERE).toBe(true);
    for (const scenario of Object.values(GroundScenario)) {
      expect(closingNeedsEveryone(scenario)).toBe(false);
    }
  });

  /*
   * INCLUDING THE ONES THAT USED TO NEED EVERYBODY. These four are the cases the old rule existed
   * for - two peers, a team, a board - and they are named here so the change is visible rather than
   * implied by a loop.
   */
  it('including between peers, a team and a board', () => {
    for (const scenario of [
      GroundScenario.NEW_COFOUNDER,
      GroundScenario.REALIGN_TEAM,
      GroundScenario.BOARD_STRATEGY,
      GroundScenario.CONTRACT_REVIEW,
    ]) {
      expect(closingNeedsEveryone(scenario)).toBe(false);
    }
  });

  /*
   * AND WHAT A PARTICIPANT KEEPS, WHICH IS EVERYTHING EXCEPT THE VETO. The refusal a participant
   * gets when they try to close one says what they still have, because a refusal that only says no
   * reads as having been written out of their own check-in.
   */
  it('and the refusal tells them what they still have', () => {
    const service = require('fs').readFileSync(require('path').join(__dirname, 'resolution.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(service).toContain('the lead decides how it ends');
    expect(service).toContain('What you said and your corrections stand on the record beside theirs');
  });
});
