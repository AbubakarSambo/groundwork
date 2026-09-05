/**
 * `spend:read-all` was added to the code, to the CEO's defaults, to the service
 * and to the route — and `/ops/me` came back without it.
 *
 * Grants are rows, and the seed writes them when a person is created. So a
 * capability added afterwards reaches only people created afterwards, and
 * everybody already on the team keeps the set they started with. The feature
 * was built, tested, merged and unreachable.
 */
import {
  ROLLED_OUT,
  rollOutNewCapabilities,
  whatIsNew,
  whoGets,
} from './a-new-capability-reaches-the-people-who-should-have-it';
import { OPS_CAPABILITIES } from './what-somebody-may-do';

describe('what counts as new', () => {
  it('is anything in the code that has not been rolled out', () => {
    const rolledOut = OPS_CAPABILITIES.filter((c) => c !== 'spend:read-all');
    expect(whatIsNew(rolledOut)).toEqual(['spend:read-all']);
  });

  it('is nothing once everything has been', () => {
    expect(whatIsNew([...OPS_CAPABILITIES])).toEqual([]);
  });

  it('and a name on the record that is no longer in the code is simply ignored', () => {
    expect(whatIsNew([...OPS_CAPABILITIES, 'spend:teleport'])).toEqual([]);
  });
});

describe('who a new capability goes to', () => {
  const people = [
    { id: 'ceo', functionalRole: 'CEO' as const },
    { id: 'tech', functionalRole: 'TECH' as const },
    { id: 'outside', functionalRole: 'CONTRIBUTOR' as const },
  ];

  it('is the roles whose defaults name it', () => {
    expect(whoGets('spend:read-all', people)).toEqual(['ceo', 'tech']);
  });

  it('and never a role that does not — a contributor reads their own claims, not ours', () => {
    expect(whoGets('spend:read-all', people)).not.toContain('outside');
  });

  it('and nobody at all when no default names it', () => {
    expect(whoGets('spend:approve', [{ id: 'tech', functionalRole: 'TECH' as const }])).toEqual([]);
  });
});

const prismaWith = (rolledOut: string[] | null) => {
  const grants: Array<{ personId: string; capability: string }> = [];
  const settings: Array<{ key: string; value: string }> = [];
  const inner = {
    opsSetting: {
      findUnique: async () => (rolledOut ? { key: ROLLED_OUT, value: JSON.stringify(rolledOut) } : null),
      create: async ({ data }: never) => {
        settings.push({ key: ROLLED_OUT, value: (data as { value: string }).value });
        return {};
      },
      update: async ({ data }: never) => {
        settings.push({ key: ROLLED_OUT, value: (data as { value: string }).value });
        return {};
      },
    },
    opsPerson: {
      findMany: async () => [
        { id: 'ceo', functionalRole: 'CEO' },
        { id: 'outside', functionalRole: 'CONTRIBUTOR' },
      ],
    },
    opsGrant: {
      createMany: async ({ data }: never) => {
        const rows = data as Array<{ personId: string; capability: string }>;
        grants.push(...rows);
        return { count: rows.length };
      },
    },
  };
  return {
    grants,
    settings,
    prisma: {
      ...inner,
      /* One transaction, so a record that says "done" cannot outlive the grants
         that were supposed to go with it. */
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(inner),
    } as never,
  };
};

describe('rolling one out', () => {
  it('grants it to the people whose role names it', async () => {
    const { prisma, grants } = prismaWith(OPS_CAPABILITIES.filter((c) => c !== 'spend:read-all'));
    const result = await rollOutNewCapabilities(prisma);
    expect(result.capabilities).toEqual(['spend:read-all']);
    expect(grants).toEqual([{ personId: 'ceo', capability: 'spend:read-all' }]);
  });

  it('writes the name onto the record, so it never goes out twice', async () => {
    const { prisma, settings } = prismaWith(OPS_CAPABILITIES.filter((c) => c !== 'spend:read-all'));
    await rollOutNewCapabilities(prisma);
    expect(JSON.parse(settings[0].value)).toContain('spend:read-all');
  });

  it('does nothing at all when there is nothing new', async () => {
    const { prisma, grants, settings } = prismaWith([...OPS_CAPABILITIES]);
    const result = await rollOutNewCapabilities(prisma);
    expect(result).toEqual({ granted: 0, capabilities: [] });
    expect(grants).toEqual([]);
    expect(settings).toEqual([]);
  });

  it('treats a missing record as nothing rolled out, and applies the defaults once', async () => {
    /*
     * The database this was written against predates the mechanism, so it has
     * no record and is missing every capability added since it was seeded.
     * Skip-duplicates makes the same run a no-op on a freshly seeded install.
     */
    const { prisma, grants } = prismaWith(null);
    const result = await rollOutNewCapabilities(prisma);
    expect(result.capabilities.length).toBe(OPS_CAPABILITIES.length);
    expect(grants.map((g) => g.capability)).toContain('spend:read-all');
    expect(grants.every((g) => g.personId === 'ceo' || g.personId === 'outside')).toBe(true);
  });

  it('and never grants a contributor something their role does not name', async () => {
    const { prisma, grants } = prismaWith(null);
    await rollOutNewCapabilities(prisma);
    const theirs = grants.filter((g) => g.personId === 'outside').map((g) => g.capability);
    expect(theirs.sort()).toEqual(['contributor:self', 'spend:submit', 'sprint:read']);
  });
});

describe('a boot that fails half way', () => {
  /**
   * THE OUTCOME THAT MUST NEVER HAPPEN is a capability recorded as rolled out
   * with nobody holding it: the record then says the job is done for ever, and
   * the feature is unreachable with nothing left to look at.
   *
   * Watched three watchers restart on one file save and race this, which is
   * what sent it into a transaction.
   */
  it('records nothing when the grants do not land', async () => {
    const settings: string[] = [];
    const prisma = {
      opsSetting: {
        findUnique: async () => null,
        create: async () => {
          settings.push('written');
          return {};
        },
        update: async () => ({}),
      },
      opsPerson: { findMany: async () => [{ id: 'ceo', functionalRole: 'CEO' }] },
      opsGrant: {
        createMany: async () => {
          throw new Error('unique violation');
        },
      },
      /* A real transaction does not commit the parts that succeeded. */
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        try {
          return await fn(prisma);
        } catch (error) {
          settings.length = 0;
          throw error;
        }
      },
    } as never;

    await expect(rollOutNewCapabilities(prisma)).rejects.toThrow('unique violation');
    expect(settings).toEqual([]);
  });
});
