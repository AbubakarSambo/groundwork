import { GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty } from './prompt-library';

/**
 * A CHECK-IN THAT BUILDS A CASE AGAINST SOMEBODY WHO HAS NOT BEEN ASKED YET.
 *
 * Read back from a real session. A lead opened a check-in about a project that had drifted. Twelve
 * turns later the record was a case against one named person - her prototype, her failure, what she
 * did not know - plus two colleagues named as agreeing with him. The second-to-last question finally
 * asked whether she had a written brief saying what was wanted. She did not. So the finding was that
 * nobody had ever written down what right looked like, and the person who should have was the one
 * giving the account.
 *
 * IT WAS THE PACK, NOT THE MODEL. `DRIFT_OPENING` opens "Name the person and the area they are
 * supposed to own. What specifically are they not doing that you believe they agreed to do?" It
 * asked for a name and a charge sheet and got exactly that.
 *
 * ORDER IS THE FIX, which this file's neighbour already learned once: a question asked fourth is
 * answered fourth, by which point the conversation is about a person. So the standard goes first,
 * their own part goes second, and everything about anybody else comes after both.
 */
const GAP_SHAPED = [GroundScenario.DRIFT, GroundScenario.REALIGN_TEAM, GroundScenario.PIP];

describe('the standard comes before the gap', () => {
  for (const scenario of GAP_SHAPED) {
    describe(scenario, () => {
      const pack = buildScenarioPackForParty(scenario, PartyType.INITIATOR, null);

      it('asks what was agreed before asking what somebody is not doing', () => {
        const standard = pack.indexOf('THE STANDARD COMES FIRST');
        expect(standard).toBeGreaterThan(-1);
        /* Where the pack asks about somebody falling short, it must come after. */
        const charge = pack.indexOf('What specifically are they not doing');
        if (charge > -1) expect(standard).toBeLessThan(charge);
      });

      it('names a missing standard as the finding rather than carrying on', () => {
        expect(pack).toMatch(/IF THERE IS NO WRITTEN STANDARD, THAT IS THE FINDING/);
        expect(pack).toMatch(/never set, not about work that fell short of one/);
      });

      it('asks the person what their own part in it was', () => {
        expect(pack).toContain('What did you do, or not do, that helped get it here?');
        expect(pack).toMatch(/Record whatever they say, including "nothing"/);
      });

      it('and asks it before the roster, which beat it three times out of three', () => {
        /*
         * Being next in the list was not enough. Driven live, the standard question fired correctly
         * and this one lost every time to "who is on the team, and what does each person own" -
         * the roster instruction elsewhere in the engine is strong and this was merely adjacent.
         * So it says so outright. Found by running it; no ordering assertion would have caught it.
         */
        expect(pack).toMatch(/BEFORE ASKING WHO ELSE IS INVOLVED/);
        expect(pack.indexOf('THE STANDARD COMES FIRST')).toBeLessThan(pack.indexOf('THEIR OWN PART'));
      });

      it('stops collecting corroboration against an absent person', () => {
        /*
         * "Does anyone else share your view?" was asked live and answered with two names. Those two
         * have not been asked anything. The person it is about gives her account after this one, and
         * it is worth nothing if three colleagues are already on record agreeing with one side.
         */
        expect(pack).toMatch(/NEVER ASK WHO ELSE AGREES/);
        expect(pack).toMatch(/verdict with a witness list/);
      });
    });
  }
});
