import { whatDoesNotAddUp, aFigureForEachOne } from './what-does-not-add-up';

/**
 * A FIGURE FOR EACH ONE IS NOT A COUNT TO SET AGAINST ANOTHER (engine test, Drop Access, Mercy).
 *
 * Monday 12 October, of the Kawangware kiosks: "They each want 1 unit, but I need to go back and close them." Wednesday 14 October:
 * "My apologies, I misspoke. I meant that Greenfield Supermarket was interested in 25 units from the start. The small kiosks in
 * Kawangware each want 1 unit at most." On Monday 19 October she was asked "For Mrs Achola, you said 'each want 1 unit' last time,
 * then 'interested in 25 units'; which one is it now?", as she had been in sessions 2, 3 and 5: two customers read as one.
 */
const MERCY = [
  { text: 'They each want 1 unit, but I need to go back and close them.', type: 'PROGRESS', session: 1 },
  { text: 'Mrs Achola at Greenfield is interested in 25 units.', type: 'PROGRESS', session: 2 },
];

describe("Mercy's kiosks and Greenfield", () => {
  it('are not put to her as one thing counted differently', () => {
    expect(whatDoesNotAddUp({ said: MERCY, thisSession: 3, targets: [], sessionsLeft: null, customers: [], people: ['Mercy', 'Grace'] } as any).filter((d) => d.kind === 'counted differently')).toEqual([]);
  });
  it('"each" before the number, or "each" right after it, is a figure for each one; a price "each" is not', () => {
    expect(aFigureForEachOne('They each want 1 unit, but I need to go back and close them.', '1 unit')).toBe(true);
    expect(aFigureForEachOne('The kiosks want 2 units apiece.', '2 units')).toBe(true);
    expect(aFigureForEachOne("It's 25 units at KES 5,000 each.", '25 units')).toBe(false);
  });
  it('a real change in one count is still put: 40 units then 6 units, with no "each"', () => {
    const said = [{ text: 'We sold 40 units this week.', type: 'PROGRESS', session: 1 }, { text: 'We sold 6 units this week.', type: 'PROGRESS', session: 2 }];
    expect(whatDoesNotAddUp({ said, thisSession: 3, targets: [], sessionsLeft: null } as any).map((d) => d.kind)).toContain('counted differently');
  });
});
