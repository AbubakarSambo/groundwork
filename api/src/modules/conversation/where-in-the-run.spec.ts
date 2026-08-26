import { GroundMoment, GroundScenario, PartyType } from '@prisma/client';
import { positionInRun, sessionsRemaining, whereInTheRun } from './where-in-the-run';
import { buildIntakeBlock } from './prompt-library';

/**
 * THE ENGINE HAD THE NUMBERS AND NOT THEIR MEANING.
 *
 * `SESSION: 3 of 6` was in the intake block, and `moment` was passed on the context and used only to
 * pick a pack. So the model was never told that this was a middle session, that three remained, or
 * that a middle session reads work against an objective rather than going to look for one.
 *
 * These tests are at the ASSEMBLED PROMPT deliberately. A pack that varied by moment has already
 * shipped broken here once, passing every test that called the pack builder while never running in
 * production, because a stored row answered first. What matters is what the model actually receives.
 */
describe('where in the run', () => {
  describe('position', () => {
    it('the first session is the first, however long the run', () => {
      expect(positionInRun(1, 6)).toBe('first');
      expect(positionInRun(1, 1)).toBe('first');
    });

    it('the planned final session is the last', () => {
      expect(positionInRun(6, 6)).toBe('last');
    });

    it('and a session beyond the plan is still the last, not a middle one', () => {
      /**
       * Grounds get extended and sessions get added. Treating session 7 of a planned 6 as "middle"
       * would mean the run never reaches a close, which is the whole failure this distinction exists
       * to prevent.
       */
      expect(positionInRun(7, 6)).toBe('last');
    });

    it('everything between is a middle session', () => {
      expect(positionInRun(2, 6)).toBe('middle');
      expect(positionInRun(5, 6)).toBe('middle');
    });

    it('and a missing total does not make session one the last', () => {
      // A one-session run is legitimate, but so is not knowing the total yet.
      expect(positionInRun(1, undefined)).toBe('first');
      expect(sessionsRemaining(1, undefined)).toBe(0);
    });
  });

  describe('what it tells the engine', () => {
    it('names the position and how many check-ins remain', () => {
      const lines = whereInTheRun({ sessionNumber: 3, totalSessions: 6, moment: GroundMoment.STARTING });
      const text = lines.join('\n');
      expect(text).toContain('WHERE_IN_THE_RUN: middle');
      expect(text).toContain('3 further check-in(s) planned');
    });

    it('says plainly when nothing follows', () => {
      const text = whereInTheRun({ sessionNumber: 6, totalSessions: 6, moment: null }).join('\n');
      expect(text).toContain('WHERE_IN_THE_RUN: last');
      expect(text).toContain('No further check-ins are planned');
    });

    it('tells a last session not to set a new target or accept a changed one', () => {
      const text = whereInTheRun({ sessionNumber: 6, totalSessions: 6, moment: null }).join('\n');
      expect(text).toMatch(/turns a miss into a success/);
    });

    it('tells a middle session that a missing objective is the finding', () => {
      const text = whereInTheRun({ sessionNumber: 3, totalSessions: 6, moment: null }).join('\n');
      expect(text).toMatch(/not finding one is itself the finding/);
    });

    it('states the moment, which was previously never said out loud', () => {
      const text = whereInTheRun({ sessionNumber: 1, totalSessions: 6, moment: GroundMoment.RECOGNITION }).join('\n');
      expect(text).toContain('MOMENT: RECOGNITION');
      expect(text).toMatch(/opened MID-WAY/);
    });

    it('omits the moment rather than guessing when it is absent', () => {
      const text = whereInTheRun({ sessionNumber: 1, totalSessions: 6, moment: null }).join('\n');
      expect(text).not.toContain('MOMENT:');
    });
  });

  describe('and it reaches the assembled prompt', () => {
    const build = (over: Record<string, unknown> = {}) =>
      buildIntakeBlock({
        scenario: GroundScenario.NEW_HIRE,
        partyType: PartyType.INITIATOR,
        sessionNumber: 1,
        totalSessions: 6,
        otherPartyCheckedIn: false,
        groundLabel: 'A new hire starting',
        moment: GroundMoment.STARTING,
        timelineDays: 90,
        ...over,
      } as any);

    it('the prompt a first session actually receives says it is the first', () => {
      const prompt = build();
      expect(prompt).toContain('WHERE_IN_THE_RUN: first');
      expect(prompt).toContain('MOMENT: STARTING');
      expect(prompt).toContain('RUN_LENGTH: 90 day(s)');
    });

    it('and a last session receives the closing instruction, not the opening one', () => {
      const prompt = build({ sessionNumber: 6 });
      expect(prompt).toContain('WHERE_IN_THE_RUN: last');
      expect(prompt).not.toContain('WHERE_IN_THE_RUN: first');
    });

    it('and the run length distinguishes a fortnight from a year', () => {
      expect(build({ timelineDays: 14 })).toContain('RUN_LENGTH: 14 day(s)');
      expect(build({ timelineDays: 365 })).toContain('RUN_LENGTH: 365 day(s)');
    });
  });
});
