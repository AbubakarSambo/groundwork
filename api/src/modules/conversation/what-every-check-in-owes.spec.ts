import { GroundScenario } from '@prisma/client';
import { THE_SPINE, WHAT_EACH_SITUATION_ADDS, everythingOwedFor } from './what-every-check-in-owes';
import { whatIsStillOwed, stageOf, type Role, type Stage } from './what-a-check-in-owes';

/**
 * Twenty-two situations had two lists between them. What this file holds is that the other twenty
 * now have one, that it is the SAME one underneath, and that it does not turn a first check-in into
 * an interrogation - which is the failure mode a longer list always fails towards.
 */
const EVERY_ROLE: Role[] = ['lead', 'member', 'partner'];
const EVERY_STAGE: Stage[] = ['first', 'middle', 'last'];
/** Nothing on the record at all - the hardest case, because every slot is still owed. */
const nothingHeld = { types: [], answered: [], letGo: [] } as any;

describe('every situation has a spine', () => {
  it('covers every scenario the product offers, goal cards included', () => {
    /* Reading the enum rather than a list here, so a scenario added later cannot quietly skip it. */
    for (const scenario of Object.values(GroundScenario)) {
      expect(everythingOwedFor(scenario).length).toBeGreaterThan(0);
    }
  });

  it('and every one of them asks the same three things first', () => {
    for (const scenario of Object.values(GroundScenario)) {
      const ids = everythingOwedFor(scenario).map((o) => o.id);
      for (const id of ['meant-to', 'actually', 'how-they-see-it']) expect(ids).toContain(id);
    }
  });

  it('the middle picks up the thread and the last closes it', () => {
    const ids = THE_SPINE.map((o) => o.id);
    expect(ids).toContain('since-then');
    expect(ids).toContain('where-it-landed');
  });
});

describe('a first check-in is not an interrogation', () => {
  /*
   * THE NUMBER IS THE POINT. A spine plus additions could easily hand somebody nine things owed in
   * the round where the product knows least about them, and a first round that works through nine
   * slots is the thing this design exists to avoid. Five is already generous.
   */
  const A_FIRST_ROUND_IS_NOT_A_FORM = 5;

  for (const scenario of Object.values(GroundScenario)) {
    it(`${scenario} asks at most ${A_FIRST_ROUND_IS_NOT_A_FORM} of anybody, first time`, () => {
      for (const role of EVERY_ROLE) {
        const still = whatIsStillOwed(everythingOwedFor(scenario), role, 'first', nothingHeld);
        expect(still.length).toBeLessThanOrEqual(A_FIRST_ROUND_IS_NOT_A_FORM);
      }
    });
  }
});

describe('what each situation adds', () => {
  it('adds only where it is genuinely different, and says so where it is not', () => {
    /* OPEN_READ exists because the situation did not fit a card - inventing what it owes would be
       inventing the situation it was created to admit nobody could name. SNAPSHOT is one round. */
    expect(WHAT_EACH_SITUATION_ADDS.OPEN_READ).toBeUndefined();
    expect(WHAT_EACH_SITUATION_ADDS.SNAPSHOT).toBeUndefined();
  });

  it('never asks anybody to account for a shortfall on the card that reads a person', () => {
    /*
     * PIP decides something about somebody. Its own rule is to understand what is getting in the
     * way without jumping to a conclusion about them, so nothing here may ask them to explain being
     * behind - the difference between a record and an accusation is exactly this.
     */
    const asked = (WHAT_EACH_SITUATION_ADDS.PIP ?? []).map((o) => o.what.toLowerCase());
    for (const w of asked) {
      expect(w).not.toMatch(/why (they|you) (did not|failed|missed|fell)|underperform|shortfall|excuse/);
    }
  });

  it('every added slot names a stage and a role, so nothing is owed by nobody at no point', () => {
    for (const [scenario, added] of Object.entries(WHAT_EACH_SITUATION_ADDS)) {
      for (const o of added) {
        expect({ at: `${scenario}/${o.id}`, n: o.role.length }.n).toBeGreaterThan(0);
        expect({ at: `${scenario}/${o.id}`, n: o.stage.length }.n).toBeGreaterThan(0);
        for (const st of o.stage) expect(EVERY_STAGE).toContain(st);
      }
    }
  });

  it('and no added slot reuses a spine id, which would silently shadow it', () => {
    const spine = new Set(THE_SPINE.map((o) => o.id));
    for (const [scenario, added] of Object.entries(WHAT_EACH_SITUATION_ADDS)) {
      for (const o of added) expect(`${scenario} ${o.id} ${spine.has(o.id)}`).toContain('false');
    }
  });
});

describe('the stage is resolved, never reasoned about', () => {
  it('a one-round situation is its first round and nothing else', () => {
    expect(stageOf(1, 1)).toBe('first');
  });
});

describe('somebody who has just started has nothing actually happening yet', () => {
  const { everythingOwedFor } = require('./what-every-check-in-owes');
  it('a starting situation asks what they mean to do first and how; a running one asks what is happening', () => {
    expect(everythingOwedFor('NEW_HIRE').find((o: any) => o.id === 'actually')?.what).toMatch(/what they mean to do first/);
    expect(everythingOwedFor('OKR_ALIGNMENT').find((o: any) => o.id === 'actually')?.what).toMatch(/what is actually happening/);
  });
});
