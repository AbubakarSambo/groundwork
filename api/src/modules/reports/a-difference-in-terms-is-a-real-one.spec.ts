import { howTheNumbersSit, whatIsBeingCounted } from './do-the-parts-add-up-to-the-whole';

/**
 * A DIFFERENCE IN TERMS IS A REAL ONE (staging test, 15 October 2026). Hafsah set up Drop Access's sales check-in with
 * the team's target "Hafsah is aiming for 40 paid sales by 31 December" and her own "Hafsah is aiming for 10 deals". The
 * shared report's headline said the people "have named their own numbers in different terms (december, deal)" and so
 * could not be added up. December is a date, not something counted, and a deal is a sale. What the report is told now.
 */
const DROP = [
  { name: 'Hafsah is aiming for 40 paid sales by 31 December', target: 40, ownerParticipantId: null, direction: 'AIM' },
  { name: 'Hafsah is aiming for 10 deals', target: 10, ownerParticipantId: 'p-hafsah', direction: 'AIM' },
];

describe('the numbers on Drop Access\'s check-in', () => {
  it('are counted in sales, both of them, and never in "december"', () => {
    expect(whatIsBeingCounted(DROP[0].name)).toBe('sale');
    expect(whatIsBeingCounted(DROP[1].name)).toBe('sale');
    expect(whatIsBeingCounted('Sell 50 fridges in Kilimani before the end of March')).toBe('fridge');
  });

  it('are added up, and the report is told what is short, not that they are in different terms', () => {
    const says = howTheNumbersSit(DROP as any, 4).says!;
    expect(says).not.toMatch(/different terms|december/i);
    expect(says).toMatch(/^THE NUMBERS: the objective is 40 sales, and the individual numbers on record add up to 10 - 30 short\./);
  });

  it('a real difference is still said: units of tea against bags', () => {
    const says = howTheNumbersSit([
      { name: '10,000 units of tea', target: 10000, ownerParticipantId: null },
      { name: '2,000 units', target: 2000, ownerParticipantId: 'a' },
      { name: '150 bags', target: 150, ownerParticipantId: 'b' },
    ] as any, 3).says!;
    expect(says).toMatch(/different terms \(tea, unit, bag\)/);
  });
});
