import { theCollectionsServedToTheScreen } from './__fixtures__/the-collections-served-to-the-screen';

/**
 * THE COLLECTIONS BOARD'S SMALL PRINT, TO EACH READER (browser test, 20 October 2026). A borrower with one loan read "It is shown.
 * Each one’s proof is filed on it", and under the patterns, "is yours to judge", which is said to whoever runs the check-in, not to a
 * borrower or a colleague.
 */
describe('the collections board says its small print whole, to each reader', () => {
  it('one row is said as one, and many as many', async () => {
    const { boards } = (await theCollectionsServedToTheScreen()) as any;
    expect(boards.musa.every.foot).toBe('Its proof is filed on it, from the slips and messages people added.');
    expect(boards.wanjiru.every.foot).toMatch(/^All \w+ are shown\. Each one’s proof is filed on it/);
  });
  it('"yours to judge" is said to whoever runs it, and to nobody else', async () => {
    const { boards } = (await theCollectionsServedToTheScreen()) as any;
    expect(boards.wanjiru.patterns.foot).toMatch(/is yours to judge\.$/);
    expect(boards.halima.patterns.foot).toMatch(/is yours to judge\.$/);
    for (const who of ['brian', 'njeri', 'musa']) expect(boards[who].patterns.foot).toBeNull();
  });
});
