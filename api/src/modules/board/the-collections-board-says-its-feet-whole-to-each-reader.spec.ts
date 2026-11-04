import { theCollectionsServedToTheScreen } from './__fixtures__/the-collections-served-to-the-screen';

/**
 * THE COLLECTIONS BOARD'S SMALL PRINT, TO EACH READER (browser test, 20 October 2026). A borrower with one loan read "It is shown.
 * Each one’s proof is filed on it", and under the patterns, "is yours to judge", which is said to whoever runs the check-in, not to a
 * borrower or a colleague.
 */
describe('the collections board says its small print whole, to each reader', () => {
  it('one row is said as one, and many as many', async () => {
    const { boards } = (await theCollectionsServedToTheScreen()) as any;
    /* Musa's one loan has nothing filed on it (he promised to pay by Friday), so it says so, not that its proof is filed. */
    expect(boards.musa.every.foot).toBe('Nothing is filed on it yet. A slip or a message added to it shows here.');
    expect(boards.wanjiru.every.foot).toMatch(/^All \w+ are shown\. Each one’s proof is filed on it/);
  });
  it('"yours to judge" is said to whoever runs it, and to nobody else', async () => {
    const { boards } = (await theCollectionsServedToTheScreen()) as any;
    expect(boards.wanjiru.patterns.foot).toMatch(/is yours to judge\.$/);
    expect(boards.halima.patterns.foot).toMatch(/is yours to judge\.$/);
    for (const who of ['brian', 'njeri', 'musa']) expect(boards[who].patterns.foot).toBeNull();
  });
});
