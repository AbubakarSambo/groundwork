import { howTheNumbersSit, whatIsBeingCounted } from './do-the-parts-add-up-to-the-whole';
import { N } from '../engagement/the-night-run-bed';

/**
 * THE FIRST FINDING OF THE TEAM REPORT WAS FALSE (review of 20 October 2026, "8. Reports and My work"). Drop Access's objective is
 * "Units sold by 30 October", 120, and each rep's is "units sold by 30 October", 30. The report was told "the objective is 120 solds",
 * and on a day one number was named "30 units", that they were "in different terms (sold, unit)" and could not be added up. They are
 * all units. This is for everybody, switch or no switch: it was untrue.
 */
describe('Drop Access\'s numbers, as the night run stored them', () => {
  const objectives = (N.drop.objectives as any[]).map((o) => ({ name: o.name, target: o.target, ownerParticipantId: o.ownerParticipantId, direction: o.direction }));

  it('are counted in units, never in "sold"', () => {
    for (const o of objectives) expect(whatIsBeingCounted(o.name)).toBe('unit');
    expect(whatIsBeingCounted('30 units')).toBe('unit');
    expect(whatIsBeingCounted('40 paid sales by 31 December')).toBe('sale');
    expect(whatIsBeingCounted('Fee notes paid')).toBe('note');
  });

  it('add up, and the report is told 120 units, never "solds" and never "different terms"', () => {
    const says = howTheNumbersSit(objectives as any, 4).says!;
    expect(says).toBe('THE NUMBERS: the objective is 120 units, and the individual numbers on record add up to 120, which is exactly the objective. Say so - it is the one case where the numbers need no conversation.');
  });

  it('still add up when one rep named his number "30 units"', () => {
    const mixed = objectives.map((o, i) => (i === 1 ? { ...o, name: '30 units' } : o));
    const says = howTheNumbersSit(mixed as any, 4).says!;
    expect(says).not.toMatch(/different terms|solds/);
    expect(says).toMatch(/^THE NUMBERS: the objective is 120 units, and the individual numbers on record add up to 120/);
  });
});
