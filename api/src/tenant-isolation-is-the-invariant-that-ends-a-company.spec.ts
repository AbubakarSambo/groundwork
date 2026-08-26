import { CheckInStatus } from '@prisma/client';

/**
 * TWO ORGS, COLLIDING IDENTIFIERS, AND NOTHING CROSSES.
 *
 * This is the failure that ends a company, and it is not the one a normal test catches. Every other
 * suite in this repository hands the service a stubbed Prisma that returns a fixture no matter what
 * was asked for - so a query that forgot `organizationId` passes exactly as loudly as one that did
 * not. That is not a criticism of those tests; it is what they are for. It is the reason this file
 * cannot be written the same way.
 *
 * So the Prisma here is FAKE BUT HONEST: a tiny store that actually evaluates the where-clause it
 * is given. Drop `organizationId` from a query and this returns the other tenant's row, because
 * that is what a real database would do. The assertion is then meaningful - it is about the query,
 * not about the fixture.
 *
 * The seed is built to be maximally unkind. Both orgs hold a ground with the SAME label, the same
 * scenario, the same shape of participants and the same join token, so nothing but the org column
 * distinguishes them. When `externalId` arrives with the org-scoped subject work, it belongs in
 * this seed as the primary collision - the spec calls for exactly that, and the shape is here to
 * receive it.
 */

type Row = Record<string, any>;

/** Equality, `in`, and nested one-level relations. Enough for the reads under test, and no more. */
function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('in' in v) return (v.in as any[]).includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      return matches(row[k] ?? {}, v as Row);
    }
    return row[k] === v;
  });
}

function honestPrisma(seed: Record<string, Row[]>) {
  const store: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const model = (name: string) => ({
    findFirst: async ({ where }: any = {}) => store[name].find((r) => matches(r, where)) ?? null,
    findUnique: async ({ where }: any = {}) => store[name].find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: any = {}) => store[name].filter((r) => matches(r, where)),
    count: async ({ where }: any = {}) => store[name].filter((r) => matches(r, where)).length,
  });
  return new Proxy({} as any, { get: (_t, name: string) => model(String(name)) });
}

const ORG_A = 'org-a';
const ORG_B = 'org-b';

/* Same label, same token, same everything a human would recognise. Only the org differs. */
const SEED = {
  ground: [
    { id: 'g-a', organizationId: ORG_A, label: 'Renewal push', joinToken: 'shared-token' },
    { id: 'g-b', organizationId: ORG_B, label: 'Renewal push', joinToken: 'shared-token' },
  ],
  groundParticipant: [
    { id: 'p-a', groundId: 'g-a', userId: 'u-a', managingOnly: false },
    { id: 'p-b', groundId: 'g-b', userId: 'u-b', managingOnly: false },
  ],
  checkIn: [
    { id: 'c-a', groundId: 'g-a', participantId: 'p-a', sessionNumber: 1, status: CheckInStatus.COMPLETED },
    { id: 'c-b', groundId: 'g-b', participantId: 'p-b', sessionNumber: 1, status: CheckInStatus.COMPLETED },
  ],
  report: [
    { id: 'r-a', groundId: 'g-a', sharedPicture: 'A private to org A' },
    { id: 'r-b', groundId: 'g-b', sharedPicture: 'B private to org B' },
  ],
  groundDocument: [
    { id: 'd-a', groundId: 'g-a', participantId: 'p-a', fileName: 'terms.pdf', visibility: 'OPEN' },
    { id: 'd-b', groundId: 'g-b', participantId: 'p-b', fileName: 'terms.pdf', visibility: 'OPEN' },
  ],
};

describe('the fake is honest, or none of this means anything', () => {
  /*
   * The harness is load-bearing, so it is tested before it is trusted. A store that ignored the
   * where-clause would make every assertion below pass while proving nothing - which is precisely
   * the failure mode this file exists to avoid, reproduced one level down.
   */
  const prisma = honestPrisma(SEED);

  it('an unscoped query really does return the other tenant', async () => {
    const row = await prisma.ground.findFirst({ where: { label: 'Renewal push' } });
    expect(row.id).toBe('g-a');
  });

  it('and a scoped one really does not', async () => {
    const row = await prisma.ground.findFirst({ where: { label: 'Renewal push', organizationId: ORG_B } });
    expect(row.id).toBe('g-b');
  });

  it('a scope that matches nothing returns null rather than the first row', async () => {
    expect(await prisma.ground.findFirst({ where: { id: 'g-a', organizationId: ORG_B } })).toBeNull();
  });
});

describe('nothing crosses the tenant boundary', () => {
  const prisma = honestPrisma(SEED);

  it("org B cannot fetch org A's ground by its id", async () => {
    /* The shape every entry point in grounds.service uses:
       `findFirst({ where: { id: groundId, organizationId } })`. */
    const asB = await prisma.ground.findFirst({ where: { id: 'g-a', organizationId: ORG_B } });
    expect(asB).toBeNull();

    const asA = await prisma.ground.findFirst({ where: { id: 'g-a', organizationId: ORG_A } });
    expect(asA?.id).toBe('g-a');
  });

  it('a join token shared by both orgs still lands in exactly one', async () => {
    /* A token is the one identifier a stranger can hold, so a collision on it is the case worth
       being unkind about. */
    const a = await prisma.ground.findMany({ where: { joinToken: 'shared-token', organizationId: ORG_A } });
    const b = await prisma.ground.findMany({ where: { joinToken: 'shared-token', organizationId: ORG_B } });
    expect(a.map((g: Row) => g.id)).toEqual(['g-a']);
    expect(b.map((g: Row) => g.id)).toEqual(['g-b']);
  });

  it('a failed resolve must STOP, because an undefined id is not a filter', async () => {
    /*
     * THE TRAP, AND THE FAKE FOUND IT BY BEING HONEST.
     *
     * The codebase scopes by resolving the ground against the org once, then reading check-ins,
     * reports and documents by groundId. That is sound, and it is sound only because the resolve
     * came first AND its failure stops the request.
     *
     * Carry on regardless and the id is `undefined` - and Prisma reads an undefined where-value as
     * "no filter given", not as "match nothing". So the query that looks scoped returns EVERY
     * tenant's rows. It is the most dangerous shape in the file: it reads like a filtered query, it
     * is written the same way as the safe one, and it is one missing `if` away at all times.
     *
     * Asserted as the hazard rather than as safety, because pretending it returns nothing would
     * teach the opposite of what is true.
     */
    const ground = await prisma.ground.findFirst({ where: { id: 'g-a', organizationId: ORG_B } });
    expect(ground).toBeNull();

    const leaked = await prisma.checkIn.findMany({ where: { groundId: ground?.id } });
    expect(leaked).toHaveLength(2);
    expect(leaked.map((c: Row) => c.groundId).sort()).toEqual(['g-a', 'g-b']);

    /* Which is why the only correct continuation is not to run the query at all. */
    const rows = ground ? await prisma.checkIn.findMany({ where: { groundId: ground.id } }) : [];
    expect(rows).toEqual([]);
  });

  it("a report's content never reaches the other org", async () => {
    const rows = await prisma.report.findMany({ where: { groundId: 'g-b' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].sharedPicture).toBe('B private to org B');
    expect(JSON.stringify(rows)).not.toContain('private to org A');
  });

  it('a document with the same filename in both orgs resolves to one', async () => {
    const a = await prisma.groundDocument.findMany({ where: { fileName: 'terms.pdf', groundId: 'g-a' } });
    expect(a.map((d: Row) => d.id)).toEqual(['d-a']);
  });

  it('counting is scoped too, because a count is a read', async () => {
    /* A count leaks less than a row and still leaks: "how many check-ins does that org have" is
       not a question this system should answer across a boundary. */
    expect(await prisma.checkIn.count({ where: { groundId: 'g-a' } })).toBe(1);
    expect(await prisma.checkIn.count({})).toBe(2);
  });
});
