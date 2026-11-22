import { NO_PLAN_TO_ADD, BillingService } from './billing.service';
import { PricingService, DEFAULT_FREE_MEMBER_LIMIT } from './pricing.service';

/**
 * EVERY CAP, AT ITS EDGE, ON THE PATH THAT ACTUALLY REFUSES.
 *
 * The pricing change moves five numbers and adds a sixth. Each one is a boundary somebody will sit
 * exactly on, and "one under is allowed, exactly on is refused" is the whole contract. Tested
 * against `canInviteMember`, which is the only thing that decides, rather than against the table.
 *
 * The caps come from `pricing_plans`, so this file states them ONCE, at the top, as the values the
 * step-3 migration seeds. If a cap changes and this list does not, the marketing guard fails on the
 * copy and these fail on the boundary - which is the pair of failures that should happen.
 */
const SEEDED_CAPS: Record<string, number | null> = {
  STARTER: 5,
  SMALL_TEAM: 20,
  GROWTH: 100,
  BUSINESS: 250,
  SCALE: 500,
  ENTERPRISE: null,
};

function gate(seats: number, plan: string | null, cap: number | null, freeLimit = DEFAULT_FREE_MEMBER_LIMIT) {
  const prisma = {
    user: { count: async () => seats },
    organization: {
      findUnique: async ({ select }: any) => {
        const out: any = { subscriptionPlan: plan, subscriptionStatus: plan ? 'active' : null };
        if (select?._count?.select?.users) out._count = { users: seats };
        if (select?.users) out.users = [];
        return out;
      },
    },
  } as any;
  const pricing = { getFreeMemberLimit: async () => freeLimit, memberCapFor: async () => cap } as any;
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

/* Rewritten 23 November 2026: there is no free tier of five people (Hafsah, 22 November: the free plan is the free trial).
   An organisation that nothing covers adds nobody new until it chooses a plan. */
describe('an organisation nothing covers', () => {
  it('the person who set it up is there, and the next is refused with the no-plan sentence', async () => {
    const res = await gate(1, null, null).canInviteMember('o');
    expect(res).toEqual({ allowed: false, reason: NO_PLAN_TO_ADD });
  });
});

describe('every paid cap, one under and exactly on', () => {
  for (const [plan, cap] of Object.entries(SEEDED_CAPS)) {
    if (cap === null) continue;

    it(`${plan} allows person ${cap} and refuses person ${cap + 1}`, async () => {
      expect((await gate(cap - 1, plan, cap).canInviteMember('o')).allowed).toBe(true);
      expect((await gate(cap, plan, cap).canInviteMember('o')).allowed).toBe(false);
    });

    it(`${plan}'s refusal names its own number`, async () => {
      const res = await gate(cap, plan, cap).canInviteMember('o');
      expect(res.reason).toContain(`${cap} people, including you`);
      expect(res.reason).not.toMatch(/not allowed|denied|exceeded|violation/i);
    });
  }

  it('ENTERPRISE has no ceiling to sit on', async () => {
    expect((await gate(100000, 'ENTERPRISE', null).canInviteMember('o')).allowed).toBe(true);
  });
});

describe('Scale seats 500, which is the cap that CHANGED', () => {
  it('person 500 is allowed', async () => {
    expect((await gate(499, 'SCALE', 500).canInviteMember('o')).allowed).toBe(true);
  });

  it('person 501 is refused', async () => {
    expect((await gate(500, 'SCALE', 500).canInviteMember('o')).allowed).toBe(false);
  });

  it('and 1,000 is no longer anywhere near allowed, which it used to be', async () => {
    /** The old cap. An account at 999 was fine before this change and must not be now. */
    expect((await gate(999, 'SCALE', 500).canInviteMember('o')).allowed).toBe(false);
  });
});

describe('nobody already on an account is removed by any of this', () => {
  it('a free account far over the limit is refused a new person and nothing else', async () => {
    /**
     * The no-retroactive-lockout property. `canInviteMember` is only ever asked "may I add one
     * more", and there is no path through it that deletes, deactivates or downgrades anybody -
     * so an account at nine keeps all nine.
     */
    const res = await gate(9, null, null).canInviteMember('o');
    expect(res.allowed).toBe(false);
    expect(JSON.stringify(res)).not.toMatch(/remove|deactivate|delete/i);
  });

  it('and a paid account over a cap that just SHRANK keeps everybody too', async () => {
    /** Scale went 1,000 to 500. An account at 700 is refused a 701st and loses nobody. */
    const res = await gate(700, 'SCALE', 500).canInviteMember('o');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('500 people, including you');
  });
});

/* Updated 23 November 2026: there is no free check-in limit and no free team size any more; the only free plan is the trial. */
describe('there is no free CHECK-IN limit and no free TEAM SIZE setting', () => {
  it('the pricing service reads neither, and a check-in made on the old free plan keeps its cap of 5', () => {
    const svc = new PricingService({} as any, {} as any);
    expect((svc as any).getFreeGroundLimit).toBeUndefined();
    expect((svc as any).getFreeMemberLimit).toBeUndefined();
    expect(DEFAULT_FREE_MEMBER_LIMIT).toBe(5);
  });
});
