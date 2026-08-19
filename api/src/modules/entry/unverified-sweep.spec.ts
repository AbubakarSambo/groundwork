import { sweepUnverifiedAccounts } from './unverified-sweep';

/**
 * DELETING PEOPLE'S ACCOUNTS, CAREFULLY.
 *
 * Asking for a sign-in link with an unknown address creates a user AND an
 * organisation before anything is clicked. That is deliberate - an anonymous
 * draft needs an owner, and losing someone's draft the moment they have written
 * it is a far worse failure than an untidy table. The cost is that a mistyped
 * address leaves a stranger's email on record forever.
 *
 * These tests are almost entirely about what the sweep must NOT delete.
 * Deleting a stale row is worth very little; deleting one person's real record
 * because a flag on their account said "unverified" would be unforgivable, and
 * that case is real - you can be invited to a ground, check in, and never click
 * your own activation link.
 */

const EMPTY = {
  groundsInitiated: 0,
  participantLinks: 0,
  contributorCodes: 0,
  redeemedCodes: 0,
  codeRedemptions: 0,
  styleProfiles: 0,
};

function makePrisma(users: any[], opts: {
    siblings?: number;
    orgGrounds?: number;
    /** Added when the sweep learned to ask whether the org was ever charged. */
    billingEvents?: number;
    orgBilling?: {
      stripeCustomerId: string | null;
      subscriptionStatus: string | null;
      subscriptionStripeId: string | null;
      careFeeSubscriptionId: string | null;
    } | null;
  } = {}) {
  const deletedUsers: string[] = [];
  const deletedOrgs: string[] = [];
  const prisma: any = {
    user: {
      findMany: jest.fn(async () => users),
      count: jest.fn(async () => opts.siblings ?? 0),
      delete: jest.fn(async ({ where }: any) => { deletedUsers.push(where.id); return {}; }),
    },
    ground: { count: jest.fn(async () => opts.orgGrounds ?? 0) },
    /**
     * The sweep now asks whether the organisation was ever charged before deleting it, so its double
     * has to model billing. Defaults are "no money trace", which is the state these existing cases
     * were always implicitly assuming; `billingEvents` and `orgBilling` opt a case into the opposite.
     */
    billingEvent: { count: jest.fn(async () => opts.billingEvents ?? 0) },
    organization: {
      findUnique: jest.fn(async () => opts.orgBilling ?? {
        stripeCustomerId: null,
        subscriptionStatus: null,
        subscriptionStripeId: null,
        careFeeSubscriptionId: null,
      }),
      delete: jest.fn(async ({ where }: any) => { deletedOrgs.push(where.id); return {}; }),
    },
  };
  return { prisma, deletedUsers, deletedOrgs };
}

const NOW = new Date('2026-08-08T00:00:00Z');

describe('what the sweep refuses to touch', () => {
  it('keeps an unverified account that has checked in to a ground', async () => {
    // The case that makes "unverified" an unsafe signal on its own: invited,
    // contributed, never clicked their own activation link. Their record is
    // exactly as real as anyone else's.
    const { prisma, deletedUsers } = makePrisma([
      { id: 'u1', organizationId: 'o1', _count: { ...EMPTY, participantLinks: 1 } },
    ]);
    const r = await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual([]);
    expect(r.skippedNotEmpty).toBe(1);
    expect(r.usersDeleted).toBe(0);
  });

  it('keeps an unverified account that started a ground', async () => {
    const { prisma, deletedUsers } = makePrisma([
      { id: 'u1', organizationId: 'o1', _count: { ...EMPTY, groundsInitiated: 1 } },
    ]);
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual([]);
  });

  it('keeps one that holds a contributor code, redeemed or issued', async () => {
    for (const field of ['contributorCodes', 'redeemedCodes', 'codeRedemptions'] as const) {
      const { prisma, deletedUsers } = makePrisma([
        { id: 'u1', organizationId: 'o1', _count: { ...EMPTY, [field]: 1 } },
      ]);
      await sweepUnverifiedAccounts(prisma, NOW);
      expect(deletedUsers).toEqual([]);
    }
  });

  it('keeps one that Groundwork has learned how to talk to', async () => {
    // A style profile means they have held real conversations here.
    const { prisma, deletedUsers } = makePrisma([
      { id: 'u1', organizationId: 'o1', _count: { ...EMPTY, styleProfiles: 1 } },
    ]);
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual([]);
  });

  it('only looks at accounts older than the window, and never at verified ones', async () => {
    const { prisma } = makePrisma([]);
    await sweepUnverifiedAccounts(prisma, NOW, 30);
    const where = (prisma.user.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.isEmailVerified).toBe(false);
    expect(where.deletedAt).toBeNull();
    // 30 days before NOW, to the day.
    expect((where.createdAt.lt as Date).toISOString()).toBe('2026-07-09T00:00:00.000Z');
  });
});

describe('what it does sweep', () => {
  it('removes an empty unverified account and its empty org', async () => {
    const { prisma, deletedUsers, deletedOrgs } = makePrisma([
      { id: 'u1', organizationId: 'o1', _count: { ...EMPTY } },
    ]);
    const r = await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual(['u1']);
    expect(deletedOrgs).toEqual(['o1']);
    expect(r).toEqual({ usersDeleted: 1, orgsDeleted: 1, skippedNotEmpty: 0 });
  });

  it('leaves the org standing when somebody else is in it', async () => {
    // A shared workspace that happens to contain one stale invite is a live
    // organisation, not litter.
    const { prisma, deletedUsers, deletedOrgs } = makePrisma(
      [{ id: 'u1', organizationId: 'o1', _count: { ...EMPTY } }],
      { siblings: 1 },
    );
    const r = await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual(['u1']);
    expect(deletedOrgs).toEqual([]);
    expect(r.orgsDeleted).toBe(0);
  });

  it('leaves the org standing when it holds a ground, even with no other members', async () => {
    const { prisma, deletedOrgs } = makePrisma(
      [{ id: 'u1', organizationId: 'o1', _count: { ...EMPTY } }],
      { orgGrounds: 1 },
    );
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedOrgs).toEqual([]);
  });

  it('does nothing at all when there is nothing to do', async () => {
    const { prisma } = makePrisma([]);
    const r = await sweepUnverifiedAccounts(prisma, NOW);
    expect(r).toEqual({ usersDeleted: 0, orgsDeleted: 0, skippedNotEmpty: 0 });
    expect(prisma.organization.delete).not.toHaveBeenCalled();
  });
});

describe('and it will not delete an organisation that has money attached to it', () => {
  /**
   * C-7. The predicate checked six traces of a person and the ground count, and consulted nothing
   * financial. `BillingEvent.organization` is `onDelete: Cascade`, so deleting the org took its whole
   * charge ledger with it and orphaned any Stripe customer id. This is the only path in the codebase
   * that destroys data irreversibly, and the class of data it ignored is the one that cannot be
   * rebuilt. The old safety argument - "a subscriber would have to be verified" - is an assumption the
   * code does not enforce, since signup provisions an ADMIN before email verification.
   *
   * Every case here leaves the USER deletion alone. Only the organisation is spared.
   */
  const EMPTY_USER = [{ id: 'u1', organizationId: 'o1', _count: { ...EMPTY } }];

  it('a single billing event is enough to spare the org', async () => {
    const { prisma, deletedUsers, deletedOrgs } = makePrisma(EMPTY_USER, { billingEvents: 1 });
    const r = await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual(['u1']);
    expect(deletedOrgs).toEqual([]);
    expect(r.orgsDeleted).toBe(0);
  });

  it.each([
    ['a Stripe customer id', { stripeCustomerId: 'cus_1', subscriptionStatus: null, subscriptionStripeId: null, careFeeSubscriptionId: null }],
    ['an active subscription', { stripeCustomerId: null, subscriptionStatus: 'active', subscriptionStripeId: null, careFeeSubscriptionId: null }],
    ['a CANCELLED subscription', { stripeCustomerId: null, subscriptionStatus: 'cancelled', subscriptionStripeId: null, careFeeSubscriptionId: null }],
    ['a legacy care-fee subscription', { stripeCustomerId: null, subscriptionStatus: null, subscriptionStripeId: null, careFeeSubscriptionId: 'sub_legacy' }],
  ])('%s spares the org', async (_label, orgBilling) => {
    /**
     * A cancelled subscription counts deliberately: the record of what somebody was once charged is
     * exactly what you need when they query a charge months later.
     */
    const { prisma, deletedOrgs } = makePrisma(EMPTY_USER, { orgBilling: orgBilling as any });
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedOrgs).toEqual([]);
  });

  it('and a genuinely empty org with no money attached is still deleted', async () => {
    /** The control. Without it the fix could be "never delete anything" and still look correct. */
    const { prisma, deletedUsers, deletedOrgs } = makePrisma(EMPTY_USER, {});
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedUsers).toEqual(['u1']);
    expect(deletedOrgs).toEqual(['o1']);
  });

  it('a failed billing read spares the org rather than proceeding on partial data', async () => {
    /**
     * The only irreversible path in the codebase must not delete because a query timed out. The
     * initialised counters are non-zero and `orgChecksSucceeded` stays false, so nothing is removed.
     */
    const { prisma, deletedOrgs } = makePrisma(EMPTY_USER, {});
    prisma.billingEvent.count = jest.fn(async () => { throw new Error('connection reset'); });
    await sweepUnverifiedAccounts(prisma, NOW);
    expect(deletedOrgs).toEqual([]);
  });
});
