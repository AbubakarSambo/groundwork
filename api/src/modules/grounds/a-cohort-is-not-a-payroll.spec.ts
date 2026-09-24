import { howManyTheFreePlanCovers, A_COHORT_IS_NOT_A_PAYROLL } from './a-cohort-is-not-a-payroll';
import { GroundScenario } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/*
 * The asset-loan scenario died on its sixth person: "The free plan covers 5 people, including you."
 * Eight borrowers is the scenario. COHORT_CHECK could not be run at all on a free organisation.
 */
describe('a cohort is not a payroll', () => {
  it('lets a cohort hold a cohort', () => {
    expect(howManyTheFreePlanCovers(GroundScenario.COHORT_CHECK, 5)).toBe(A_COHORT_IS_NOT_A_PAYROLL);
  });

  /* Narrow on purpose: everything else on the list is people who work for you. */
  it('leaves every other scenario on the staff number', () => {
    for (const s of [GroundScenario.NEW_HIRE, GroundScenario.PULSE_CHECK, GroundScenario.OKR_ALIGNMENT,
      GroundScenario.BOARD_STRATEGY, GroundScenario.PIP, GroundScenario.REALIGN_TEAM]) {
      expect(howManyTheFreePlanCovers(s, 5)).toBe(5);
    }
    expect(howManyTheFreePlanCovers(null, 5)).toBe(5);
  });

  /* A paid organisation with a bigger allowance never has it reduced by this. */
  it('never lowers a cap that is already higher', () => {
    expect(howManyTheFreePlanCovers(GroundScenario.COHORT_CHECK, 250)).toBe(250);
  });

  it('and the ground takes it at creation, on both paths', () => {
    const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8');
    expect(src.match(/howManyTheFreePlanCovers\(dto\.scenario, DEFAULT_FREE_MEMBER_LIMIT\)/g) ?? []).toHaveLength(2);
  });
});
