import { BillingService } from './billing.service';

/**
 * REQUEST 197. Eight people with accounts on a plan that covers five: Plan and billing says the sentence, and
 * the people it holds are the ones the People list and the refusal of new participation pick (one function).
 */
const day = (n: number) => new Date(`2026-09-${String(n).padStart(2, '0')}T09:00:00Z`);
const RELEASE = day(10);
const people = [
  ['grace', 'ADMIN', 20], ['baraka', 'MEMBER', 19], ['kito', 'MEMBER', 18], ['lerato', 'MEMBER', 17],
  ['zawadi', 'GUEST', 16], ['amani', 'MEMBER', 5], ['wairimu', 'MEMBER', 3], ['founder', 'ADMIN', 1],
] as const;

function svc(cap: number | null, released: Date = RELEASE) {
  const prisma: any = {
    user: {
      count: async () => people.length,
      findMany: async () => people.map(([id, role, d]) => ({ id, createdAt: day(1), role, memberships: [{ role, createdAt: day(d) }] })),
    },
    organization: { findUnique: async () => ({ subscriptionPlan: 'STARTER', subscriptionStatus: 'active', stripeCustomerId: null, defaultPaymentMethodId: null, subscriptionPeriodEnd: null, freeExtensionUsed: false, createdAt: day(1) }) },
    ground: {
      count: async () => 0,
      findMany: async (a: any) => (a?.select?.initiatorId ? [{ initiatorId: 'baraka', createdByUserId: null }] : []),
    },
    platformSetting: { findUnique: async () => ({ key: 'release.engagement_from', value: { at: released.toISOString() } }) },
    report: { count: async () => 0 },
    groundParticipant: { findMany: async () => [] },
  };
  const pricing: any = { memberCapFor: async () => cap, getFreeMemberLimit: async () => cap };
  return new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, { sendMemberCapWarning: async () => undefined } as any, {} as any);
}

describe('an organisation already over its plan at release keeps everyone', () => {
  it('holds nobody, though the plan is far below the people', async () => {
    const s = svc(2, day(25));
    const r = await s.whoIsOverThePlan('org1');
    expect(r.held.size).toBe(0);
    expect(r.saying).toBeNull();
    expect((await s.getStatus('org1')).overThePlanSays).toBeNull();
  });
});

describe('the people over the plan', () => {
  it('Plan and billing says how many, in the sentence People says', async () => {
    const s = await svc(5).getStatus('org1');
    expect(s.people).toEqual({ count: 8, cap: 5 });
    expect(s.overThePlanSays).toBe('3 people are waiting for a seat because your plan is full. Choose a plan so everyone keeps checking in.');
  });
  it('holds the three most recently added who are not an admin and do not run a check-in', async () => {
    const r = await svc(5).whoIsOverThePlan('org1');
    expect(r.over).toBe(3);
    expect([...r.held].sort()).toEqual(['kito', 'lerato', 'zawadi']);
    expect(r.saying).toBe((await svc(5).getStatus('org1')).overThePlanSays);
  });
  it('says nothing and holds nobody when the plan covers everyone, or has no cap', async () => {
    for (const cap of [8, 20, null]) {
      const r = await svc(cap).whoIsOverThePlan('org1');
      expect(r.held.size).toBe(0);
      expect(r.saying).toBeNull();
      expect((await svc(cap).getStatus('org1')).overThePlanSays).toBeNull();
    }
  });
});
