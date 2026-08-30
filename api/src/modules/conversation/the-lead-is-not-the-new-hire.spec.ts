import { buildScenarioPackForParty } from './prompt-library';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * A LEAD SETTING UP A CHECK-IN FOR A NEW HIRE WAS INTERVIEWED AS THE NEW HIRE.
 *
 * The opening asked "what does success look like for you", which in the shared pathway means "your
 * version of success for this" and reads, cold, as "your personal goals". So the session asked the
 * person who had just written the brief what they wanted to achieve, and she had to type "i am the
 * one setting up the context" to stop it.
 *
 * Everything downstream inherited it. Her record was built as a party's account of their own work,
 * and the report compared her design commitments against the hire's engineering role as though they
 * were two peers describing the same job.
 *
 * The role-specific question knew better all along and sat three blocks below the generic one.
 */
const STARTING = [
  GroundScenario.NEW_HIRE,
  GroundScenario.NEW_COFOUNDER,
  GroundScenario.NEW_ADVISOR,
  GroundScenario.NEW_PROJECT,
  GroundScenario.NEW_MANAGER,
  GroundScenario.CONTRACT_RENEWAL,
];

describe('the person who set it up is not the person it is about', () => {
  for (const scenario of STARTING) {
    describe(scenario, () => {
      const lead = buildScenarioPackForParty(scenario, PartyType.INITIATOR);
      const party = buildScenarioPackForParty(scenario, PartyType.PARTICIPANT);

      it('tells the session who it is talking to, before what to ask', () => {
        expect(lead).toContain('the person who SET THIS UP');
        expect(lead).toContain('They are not the subject of it');
        /* A lead can be a party to the work and still not be the subject of the check-in. */
        expect(lead).toContain('They may be a party to the work');
      });

      it('forbids the three questions that caused it', () => {
        expect(lead).toContain('what they personally want to achieve');
        expect(lead).toContain('what success looks like for them personally');
        expect(lead).toContain('what they were brought in to do');
      });

      it('asks who this is about first, because everything after it is ambiguous', () => {
        /*
         * ORDER, NOT PRESENCE. The first version of this asserted both blocks existed and that the
         * words "the FIRST thing to ask" appeared - and those words travel with the block, so
         * moving it back to the bottom of the pathway, which is the exact bug, kept the test green.
         */
        const roleQuestion = lead.indexOf('ROLE-SPECIFIC QUESTIONS - initiator');
        const successQuestion = lead.indexOf('What does success look like from where you sit');
        const perPerson = lead.indexOf('PER-PERSON EXPECTATIONS');
        expect(roleQuestion).toBeGreaterThan(-1);
        expect(successQuestion).toBeGreaterThan(-1);
        expect(roleQuestion).toBeLessThan(successQuestion);
        /* And still before the per-person pass, which is deliberately last. */
        expect(roleQuestion).toBeLessThan(perPerson);
        expect(lead).toContain('the FIRST thing to ask');
      });

      it('never hands a lead the block that says they are a participant', () => {
        /* The other half of the same mistake: a preamble addressed to the person who was ADDED. */
        expect(lead).not.toContain('PARTICIPANT - added to this ground by the initiator');
        expect(party).toContain('PARTICIPANT - added to this ground by the initiator');
      });

      it('and leaves the participant asked about themselves, which is correct for them', () => {
        expect(party).toContain('ROLE-SPECIFIC QUESTIONS - participant');
        expect(party).not.toContain('the person who SET THIS UP');
      });
    });
  }
});
