import { GroundScenario } from '@prisma/client';
import { endStatesFor, endStatesForGround } from './end-states';

/**
 * A GROUND CANNOT CLOSE AS "DONE" AGAINST A TARGET NOBODY WROTE DOWN.
 *
 * Grounds reach their end without an objective. The commonest reason is that the first session never
 * produced a checkable statement of what was being worked to - which is itself one of the most useful
 * findings this product makes. Offering "what we set out to do, done" there invites somebody to close
 * it as a success against nothing, and the record then says a thing that was never true.
 *
 * The picture states are what remain, and they are the honest answer: the accounts are on record, and
 * nothing was being measured.
 */
describe('end states when nothing was ever set', () => {
  it('offers the outcome states when an objective existed', () => {
    const values = endStatesForGround(GroundScenario.ACUTE_SHOCK, { hadAnObjective: true }).map((o) => o.value);
    expect(values).toContain('OBJECTIVE_MET');
    expect(values).toContain('PARTLY_RECOVERED');
  });

  it('withholds every outcome state when none did', () => {
    const values = endStatesForGround(GroundScenario.ACUTE_SHOCK, { hadAnObjective: false }).map((o) => o.value);
    for (const v of ['OBJECTIVE_MET', 'PARTLY_RECOVERED', 'NOT_RECOVERED', 'OBJECTIVE_OVERTAKEN']) {
      expect(values).not.toContain(v);
    }
  });

  it('and keeps the states that describe the picture, which are still true', () => {
    const values = endStatesForGround(GroundScenario.ACUTE_SHOCK, { hadAnObjective: false }).map((o) => o.value);
    expect(values).toContain('PICTURE_SHARED');
    expect(values).toContain('READS_DIVERGE');
    expect(values).toContain('NOT_YET');
  });

  it('never leaves a scenario with no way to close at all', () => {
    /**
     * The safety valve. If every end state of some scenario needed an objective, filtering would make
     * that ground unclosable - which is worse than offering a state that reads oddly.
     */
    for (const s of Object.values(GroundScenario)) {
      expect(endStatesForGround(s, { hadAnObjective: false }).length).toBeGreaterThan(0);
    }
  });

  it('changes nothing for a scenario whose states never mentioned an objective', () => {
    // Most scenarios are untouched by this, and that should be visible rather than assumed.
    const before = endStatesFor(GroundScenario.NEW_HIRE).map((o) => o.value);
    const after = endStatesForGround(GroundScenario.NEW_HIRE, { hadAnObjective: false }).map((o) => o.value);
    expect(after).toEqual(before);
  });
});
