import { GroundScenario, PartyType } from '@prisma/client';
import { whatThisCheckInIsFor, THE_SCENARIO_TABLE } from './the-scenario-table';

/*
 * Every scenario pack's questions were written for session one. Six were rewritten to their cards;
 * the other sixteen were not, so a fourth check-in ran a first interview under a heading that said
 * "what has changed since". The stage block is what tells the model how to read those questions,
 * so the stage block has to say it.
 */
describe('a later check-in does not re-run the first interview', () => {
  const everyScenario = Object.keys(THE_SCENARIO_TABLE);
  const bothParties = [PartyType.INITIATOR, PartyType.PARTICIPANT];

  for (const scenario of everyScenario) {
    for (const party of bothParties) {
      it(`${scenario} / ${party}: the second check-in says not to ask what was already answered`, () => {
        const second = whatThisCheckInIsFor(scenario as GroundScenario, party, 'second');
        expect(second).toMatch(/WRITTEN FOR THE FIRST CHECK-IN/);
        expect(second).toMatch(/already answered/i);
      });

      it(`${scenario} / ${party}: the last check-in does not re-open them`, () => {
        const last = whatThisCheckInIsFor(scenario as GroundScenario, party, 'last');
        expect(last).toMatch(/WRITTEN FOR THE FIRST CHECK-IN/);
        expect(last).toMatch(/Do not re-open them/);
      });

      it(`${scenario} / ${party}: the first check-in still works through them`, () => {
        const first = whatThisCheckInIsFor(scenario as GroundScenario, party, 'first');
        expect(first).not.toMatch(/WRITTEN FOR THE FIRST CHECK-IN/);
        expect(first).toMatch(/one at a time/);
      });
    }
  }
});
