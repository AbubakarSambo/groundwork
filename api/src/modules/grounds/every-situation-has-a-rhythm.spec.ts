import { GroundScenario, Cadence } from '@prisma/client';
import { DEFAULT_TIMELINE_DAYS, RECOMMENDED_CADENCE } from './grounds.service';
import { familyFor, BoardFamily, defaultModeFor } from '../board/board-families';
import { GroundMode } from '@prisma/client';

/**
 * A SITUATION'S RHYTHM IS TWO NUMBERS, AND ONLY ONE OF THEM WAS EVER SET.
 *
 * How many times a ground actually asks people to check in is `timeline / cadence`. The timeline was
 * tuned per scenario from the beginning; the cadence was one hardcoded fortnightly at both creation
 * paths. So the session count - the thing the lead and every participant actually experience - was a
 * quotient nobody chose:
 *
 *   ACUTE_SHOCK   14 days / fortnightly = 1 session, for a pack that describes a first read AND a
 *                                         follow-up a week later. The follow-up could not happen.
 *   NEW_ADVISOR  365 days / fortnightly = 26 sessions, more than a new hire gets in a quarter.
 *
 * Nothing failed, because each map was internally complete and nothing compared them. These tests
 * are that comparison, plus the thing that stops the next scenario inheriting a rhythm by accident:
 * TypeScript already requires a `Record<GroundScenario, T>` to be exhaustive, so a missing entry is a
 * compile error - what it cannot catch is an entry that is present and absurd.
 */
describe('every situation has a rhythm somebody chose', () => {
  const ALL = Object.values(GroundScenario);

  // Jest's expect takes no message argument, so every check collects the offenders and asserts an
  // empty list - the failure output then names the scenario and the number, which is the whole point.
  it('recommends a cadence for every situation', () => {
    expect(ALL.filter(s => !RECOMMENDED_CADENCE[s])).toEqual([]);
  });

  it('and a timeline for every situation', () => {
    expect(ALL.filter(s => !(DEFAULT_TIMELINE_DAYS[s] > 0))).toEqual([]);
  });

  it('never recommends a rhythm that yields no run', () => {
    /**
     * The defect this exists for. A scenario whose pack describes several sessions must not be
     * given a cadence its own timeline cannot fit even once more than the first session.
     *
     * SNAPSHOT is the sole exception and is asserted separately below: it is ONE_TIME on purpose,
     * and it is the only situation in the product where one session is the whole design.
     */
    const DAYS: Record<Cadence, number | null> = {
      DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30,
      SEQUENTIAL: null, ONE_TIME: null,
    };
    const tooShort: string[] = [];
    for (const s of ALL) {
      if (s === GroundScenario.SNAPSHOT) continue;
      const step = DAYS[RECOMMENDED_CADENCE[s]];
      if (step === null) continue; // fires on the lead's own check-in, not on elapsed time
      const sessions = Math.floor(DEFAULT_TIMELINE_DAYS[s] / step);
      if (sessions < 2) {
        tooShort.push(`${s}: ${DEFAULT_TIMELINE_DAYS[s]} days at ${RECOMMENDED_CADENCE[s]} = ${sessions} session(s), a run needs at least two`);
      }
    }
    expect(tooShort).toEqual([]);
  });

  it('and never recommends so many that a check-in becomes a chore', () => {
    // No scenario should ask for more than about twenty-six rounds. NEW_ADVISOR sat exactly there.
    const tooMany: string[] = [];
    for (const s of ALL) {
      const step = { DAILY: 1, WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30, SEQUENTIAL: null, ONE_TIME: null }[RECOMMENDED_CADENCE[s]];
      if (step === null) continue;
      const sessions = Math.floor(DEFAULT_TIMELINE_DAYS[s] / step);
      if (sessions > 20) tooMany.push(`${s}: ${sessions} check-ins`);
    }
    expect(tooMany).toEqual([]);
  });

  describe('the one-off read', () => {
    it('is the only ONE_TIME situation', () => {
      const oneTime = ALL.filter(s => RECOMMENDED_CADENCE[s] === Cadence.ONE_TIME);
      expect(oneTime).toEqual([GroundScenario.SNAPSHOT]);
    });

    it('renders no board, because every section reads across sessions', () => {
      expect(familyFor(GroundScenario.SNAPSHOT)).toBe(BoardFamily.SNAPSHOT);
    });

    it('and is private, because there is no second session for a franker answer', () => {
      expect(defaultModeFor(GroundScenario.SNAPSHOT)).toBe(GroundMode.PRIVATE);
    });
  });
});
