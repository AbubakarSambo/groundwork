import { GroundScenario, GroundMoment } from '@prisma/client';
import { RECOMMENDED_MOMENT } from './grounds.service';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A SITUATION THAT HAS ALREADY HAPPENED MUST NOT OPEN AS ONE THAT IS BEGINNING.
 *
 * `entry.service.ts` hardcoded `moment: GroundMoment.STARTING` at both of its creation paths, so every
 * ground opened from the public entry flow believed it was at the beginning of something - including
 * "your biggest client left on Tuesday" and "the project is eight weeks late". `moment` is write-once,
 * so nothing ever corrected it.
 *
 * The scenario has been classified from the person's own words by the time a ground is created, so it
 * is the best available answer to where in the arc they are, and it stays a recommendation the lead can
 * change.
 */
describe('the moment a situation starts from', () => {
  it('is recommended for every situation the product supports', () => {
    // Jest's expect takes no message, so the offenders are collected and the list is asserted empty -
    // a failure then names the scenario rather than saying "undefined".
    const missing = Object.values(GroundScenario).filter((s) => !RECOMMENDED_MOMENT[s]);
    expect(missing).toEqual([]);
  });

  it('never opens an already-happened situation as a beginning', () => {
    /**
     * The specific defect. These four describe something that has already occurred, or a group already
     * at work - none of them is a start anybody designed.
     */
    const alreadyUnderway = [
      GroundScenario.DRIFT,
      GroundScenario.REALIGN_TEAM,
      GroundScenario.COHORT_CHECK,
      GroundScenario.SNAPSHOT,
    ];
    const wrong = alreadyUnderway.filter((s) => RECOMMENDED_MOMENT[s] === GroundMoment.STARTING);
    expect(wrong).toEqual([]);
  });

  it('opens a renewal at the end, because the term it judges is over', () => {
    expect(RECOMMENDED_MOMENT[GroundScenario.CONTRACT_RENEWAL]).toBe(GroundMoment.RESOLUTION);
  });

  it('still opens a genuinely new arrangement at the start', () => {
    for (const s of [GroundScenario.NEW_HIRE, GroundScenario.NEW_PROJECT, GroundScenario.NEW_COFOUNDER]) {
      expect(RECOMMENDED_MOMENT[s]).toBe(GroundMoment.STARTING);
    }
  });

  it('and the entry flow no longer hardcodes one', () => {
    /**
     * The ratchet. The map above is only worth having if the path that ignored it now reads it, and a
     * hardcoded enum member is easy to reintroduce while every unit test still passes.
     */
    const src = readFileSync(join(__dirname, '../entry/entry.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/moment:\s*GroundMoment\.\w+/);
    expect(src).toMatch(/moment:\s*RECOMMENDED_MOMENT\[/);
  });
});
