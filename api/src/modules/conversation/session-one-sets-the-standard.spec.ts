import { GroundScenario, GroundMoment, PartyType } from '@prisma/client';
import { buildScenarioPackForParty } from './prompt-library';

/**
 * A RECURRING READ WITH NO TARGET IS A REPEATED SNAPSHOT.
 *
 * Reported from the screen. A lead opened "Several people in the same role" to set objectives for
 * new sales managers, and session one asked "which of them have you spent real time with this week,
 * and who haven't you managed to get to yet?" - a read, of a period that had no standard yet. She
 * typed back "i am trying to set their objectives to checkin, this questioning is confusing", and
 * she was right: there was nothing for the answer to be measured against.
 *
 * PULSE_CHECK already had this and the cohort packs did not, which is the whole finding - the rule
 * existed, in one of the three places it applies. Both cohort variants now open session one by
 * setting what the period is being read against.
 */
const RECURRING = [
  { scenario: GroundScenario.PULSE_CHECK, moment: null },
  { scenario: GroundScenario.COHORT_CHECK, moment: null },
  { scenario: GroundScenario.COHORT_CHECK, moment: GroundMoment.STARTING },
];

describe('session one sets the standard', () => {
  for (const { scenario, moment } of RECURRING) {
    describe(`${scenario}${moment ? ` (${moment})` : ''}`, () => {
      const pack = buildScenarioPackForParty(scenario, PartyType.INITIATOR, moment);

      it('says outright that the first session establishes it', () => {
        expect(pack).toMatch(/FIRST SESSION/);
      });

      it('asks for something checkable rather than a sentiment', () => {
        expect(pack).toMatch(/could be checked|checkable/i);
      });

      it('and asks it before reading how things are going', () => {
        /* Order is the fix, again. A standard established fourth is established fourth. */
        const first = pack.indexOf('FIRST SESSION');
        const read = pack.search(/how things are going|who they have actually got to this period/);
        if (read > -1) expect(first).toBeLessThan(read);
      });

      it('records a missing standard as a finding rather than pressing for one', () => {
        expect(pack).toMatch(/cannot (name|say)/i);
        expect(pack).toMatch(/record that plainly/i);
      });
    });
  }

  it('and the cohort onboarding pack says what a missing standard costs', () => {
    /*
     * Not a scolding, a consequence: at the end of that period a decision gets made about each of
     * those people, and with no standard it gets made on impressions. That is the thing the lead
     * needs to hear in session one, when it can still be fixed.
     */
    const pack = buildScenarioPackForParty(GroundScenario.COHORT_CHECK, PartyType.INITIATOR, GroundMoment.STARTING);
    expect(pack).toMatch(/it gets made on impressions/);
    expect(pack).toMatch(/about how the onboarding is set\s*up, not about them/);
  });
});
