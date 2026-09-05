/**
 * PUT /evidence answered 200 having written nothing.
 *
 * Every item is reported with its own `matched` flag, so the body was never
 * dishonest — but every item can be false at once, and a caller that checks the
 * status code believes its numbers are in. This was found by our own back-office
 * adapter reporting "5 sent, 0 refused" against a response where nothing landed.
 *
 * The status stays 200 on purpose: a nightly push covering a whole organisation
 * will name objectives that are not on any check-in, and failing the batch for
 * that would make the tolerant case impossible. So the fix is a summary that
 * cannot be skipped past, not a different status.
 */
import { GroundsByApiService } from './grounds-by-api.service';

const serviceWhere = (objectiveExists: (externalId: string) => boolean) =>
  new GroundsByApiService(
    {
      personObjective: {
        findFirst: async ({ where }: never) =>
          objectiveExists((where as { externalId: string }).externalId) ? { id: 'o1' } : null,
        update: async () => ({}),
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

const evidence = (...ids: string[]) =>
  ids.map((objectiveExternalId) => ({ objectiveExternalId, state: { closed: 3 } }));

describe('pushing evidence that matches nothing', () => {
  it('says plainly that nothing was written', async () => {
    const result = await serviceWhere(() => false).pushEvidence('org', evidence('a', 'b'));
    expect(result.says).toMatch(/Nothing was written/);
  });

  it('counts zero, so a caller reading a number gets the right one', async () => {
    const result = await serviceWhere(() => false).pushEvidence('org', evidence('a', 'b'));
    expect(result.matched).toBe(0);
    expect(result.unmatched).toEqual(['a', 'b']);
  });

  it('names what to check, because "nothing matched" alone is not actionable', async () => {
    const result = await serviceWhere(() => false).pushEvidence('org', evidence('a'));
    expect(result.says).toMatch(/sourceSystem/);
  });
});

describe('pushing evidence that partly matches', () => {
  it('separates what landed from what did not', async () => {
    const result = await serviceWhere((id) => id === 'a').pushEvidence('org', evidence('a', 'b'));
    expect(result.matched).toBe(1);
    expect(result.unmatched).toEqual(['b']);
    expect(result.says).toMatch(/1 updated\. 1 matched no objective/);
  });

  it('and does not warn when everything landed', async () => {
    const result = await serviceWhere(() => true).pushEvidence('org', evidence('a', 'b'));
    expect(result.says).toBe('2 updated.');
    expect(result.unmatched).toEqual([]);
  });

  it('still reports every item individually, because the batch shape did not change', async () => {
    const result = await serviceWhere((id) => id === 'a').pushEvidence('org', evidence('a', 'b'));
    expect(result.received).toEqual([
      { objectiveExternalId: 'a', matched: true },
      { objectiveExternalId: 'b', matched: false },
    ]);
  });
});
