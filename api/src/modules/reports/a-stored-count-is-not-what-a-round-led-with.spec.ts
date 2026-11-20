import { howThisHasMoved } from './how-this-has-moved';

/* RUN 10: "One of the five people has answered so far" was read under 23 December, in an old Over time entry, after all five had answered. A stored count is not what a round led with. */
describe('a stored count of who had answered is not what a round led with', () => {
  it('reads what follows the count, and has no row where the count was all there was', () => {
    const rows = howThisHasMoved([
      { round: 3, sharedPicture: 'One of the five people has answered so far. The team counts sales in two different ways.', divergences: [], takenAt: '2026-12-23T10:00:00Z' },
      { round: 4, sharedPicture: 'Two of the five people have answered so far.', divergences: [], takenAt: '2026-12-30T10:00:00Z' },
    ] as any);
    expect(rows.map((r) => r.says)).toEqual(['The team counts sales in two different ways.']);
  });
});
