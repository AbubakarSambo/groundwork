/**
 * A cycle that outlives its quarter is a wrong number nobody goes looking for.
 *
 * The seeded fortnights were anchored on the first day of the quarter and run
 * seven deep — ninety-eight days against a ninety-two day quarter. Nothing in
 * the code read wrong; the last cycle simply came back from the live route
 * ending on 6 January, and a quarterly roll-up over those cycles would have
 * been counting a week of the next quarter's work.
 *
 * This asserts the containment rather than the arithmetic, so it still holds
 * when the cycle length or the quarter changes.
 */
import { PrismaClient } from '@prisma/client';
import { seedTheFoundations } from './seed-the-foundations';

type Row = {
  key: string;
  kind: string;
  startsOn: Date;
  endsOn: Date;
  parentPeriodId: string | null;
};

/**
 * A recording stand-in for Prisma: the seed's writes are what we want to look at.
 *
 * Every table it does not care about is invented on demand. The first version
 * listed them by hand and broke every time the seed learned to write somewhere
 * new — three green tests turning red for a reason that had nothing to do with
 * cycles or quarters, which is how a spec teaches people to ignore it.
 */
function recordingPrisma() {
  const periods = new Map<string, Row & { id: string }>();
  const seededPeople: Array<{ id: string; key: string }> = [];

  const anyTable = (name: string) => ({
    upsert: async ({ where, create }: never) => {
      const key = (where as { key?: string }).key ?? 'row';
      if (name === 'opsPeriod') {
        const row = { ...(create as object), key } as unknown as Row;
        periods.set(key, { ...row, id: `id-${key}` });
      }
      if (name === 'opsPerson') seededPeople.push({ id: `id-${key}`, key });
      return { id: `id-${key}` };
    },
    findUnique: async ({ where }: never) => periods.get((where as { key: string }).key) ?? null,
    findMany: async () => (name === 'opsPerson' ? seededPeople : []),
    createMany: async () => ({ count: 0 }),
    create: async () => ({ id: 'id' }),
  });

  const client = new Proxy(
    {},
    { get: (_t, name: string) => anyTable(name) },
  ) as unknown as PrismaClient;

  return { periods, client };
}

describe('every seeded cycle sits inside the quarter it hangs off', () => {
  let cycles: Row[];
  let quarter: Row;

  beforeAll(async () => {
    const { client, periods } = recordingPrisma();
    await seedTheFoundations(client);
    const rows = [...periods.values()];
    cycles = rows.filter((p) => p.kind === 'CYCLE');
    quarter = rows.find((p) => p.kind === 'QUARTER') as Row;
  });

  it('seeded a quarter and some cycles, so this cannot pass on an empty list', () => {
    expect(quarter).toBeDefined();
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('and none of them starts before it or ends after it', () => {
    const escapees = cycles
      .filter((c) => c.startsOn < quarter.startsOn || c.endsOn > quarter.endsOn)
      .map((c) => `${c.key} ${c.startsOn.toISOString().slice(0, 10)}..${c.endsOn.toISOString().slice(0, 10)}`);

    expect(escapees).toEqual([]);
  });

  it('and they cover the quarter end to end with no gap', () => {
    const inOrder = [...cycles].sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime());
    expect(inOrder[0].startsOn).toEqual(quarter.startsOn);
    expect(inOrder[inOrder.length - 1].endsOn).toEqual(quarter.endsOn);

    for (let i = 1; i < inOrder.length; i++) {
      const dayAfterPrevious = new Date(inOrder[i - 1].endsOn.getTime() + 86400000);
      expect(inOrder[i].startsOn).toEqual(dayAfterPrevious);
    }
  });
});
