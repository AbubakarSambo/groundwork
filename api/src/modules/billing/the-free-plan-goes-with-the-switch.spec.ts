import { BillingService, NO_PLAN_TO_OPEN, NO_PLAN_TO_ADD, PAUSED_UNTIL_THEY_SUBSCRIBE } from './billing.service';
import { PricingService, DEFAULT_FREE_TRIAL, DEFAULT_ANCHOR_TRIAL } from './pricing.service';

/**
 * THE FREE PLAN IS THE FREE TRIAL (Hafsah, 22 November 2026: "turn the switch on, nothing switch off from now on, nothing at
 * all", and "free trial is for teams of 20 and there's nothing like 10 free checkins").
 *
 * REWRITTEN, 23 November 2026. This file used to prove the old rule: with the trial's switch off, ten free check-ins, five
 * free people, a free extension and a free first session; with it on, an organisation made before the switch kept all of
 * that. ILRI, an organisation made before the switch with its ten free check-ins used and no cover, was refused a check-in
 * on live with "Your free plan includes 10 check-ins". The rule is now:
 *   - the trial is on by default, and it is the only free plan: no count of free check-ins anywhere;
 *   - every organisation gets it once, the ones already here included, the first time it needs cover, if its team is under
 *     the trial's size;
 *   - teams at or over the size start on a plan;
 *   - after the trial, no new check-in until a plan is chosen, and a check-in that was free keeps running.
 */
const SWITCHED_ON = '2026-11-23T09:00:00.000Z';
const ON = { on: true, teamsUnder: 20, months: 1, onSince: SWITCHED_ON };
const PLANS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9900, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100 },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null },
];

function billing(opts: { trial?: any; seats?: number; org?: any; ground?: any }) {
  /* One organisation row the service reads and writes, so what the trial writes is what the next read sees. */
  const org: any = {
    id: 'org-1', name: 'ILRI', subscriptionPlan: null, subscriptionStatus: null, careFeeStatus: null, freeUntil: null, freePlan: null,
    freeTrialStartedAt: null, freeMonthOfReleaseAt: null, stripeCustomerId: null, defaultPaymentMethodId: null,
    subscriptionPeriodEnd: null, subscriptionEndsAt: null, createdAt: new Date('2026-08-01T00:00:00.000Z'),
    teamSizeSaid: null, teamSizeLine: null, ...(opts.org ?? {}),
  };
  const ground = { id: 'g-1', sessionsBalance: 0, isFreeGround: false, organizationId: 'org-1', ...(opts.ground ?? {}) };
  const matches = (where: any) => Object.entries(where ?? {}).every(([k, v]) => k === 'id' || (v instanceof Date ? org[k]?.getTime?.() === v.getTime() : org[k] === v));
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async () => ({ ...org })),
      updateMany: jest.fn(async ({ where, data }: any) => { if (!matches(where)) return { count: 0 }; Object.assign(org, data); return { count: 1 }; }),
      update: jest.fn(async ({ data }: any) => { Object.assign(org, data); return org; }),
    },
    user: { count: jest.fn(async () => opts.seats ?? 6), findMany: jest.fn(async () => []) },
    ground: {
      /* ILRI's twelve check-ins, every one opened on the old free plan. Nothing counts them now. */
      count: jest.fn(async () => 12),
      findUnique: jest.fn(async () => ground),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
    report: { count: jest.fn(async () => 0) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    billingEvent: { findMany: jest.fn(async () => []) },
    pricingPlan: { findUnique: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'pricing.freeTrial' ? { value: opts.trial ?? ON } : null)) },
  };
  const pricing: any = {
    getFreeTrial: jest.fn(async () => opts.trial ?? ON),
    getAnchorTrial: jest.fn(async () => DEFAULT_ANCHOR_TRIAL),
    listPlans: jest.fn(async () => PLANS),
    memberCapFor: jest.fn(async (p: string) => PLANS.find((r) => r.plan === p)?.memberCap ?? null),
  };
  const email: any = { sendMemberCapWarning: jest.fn(async () => undefined) };
  const config: any = { get: () => '' };
  return { svc: new BillingService(prisma, { stripe: {} } as any, pricing, config, email, {} as any), org };
}

describe('ILRI on live: made before the trial, its free check-ins used, nothing covering it', () => {
  it('can open a check-in: it is given the free trial now, once', async () => {
    const { svc, org } = billing({});
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(org.freeTrialStartedAt).toBeInstanceOf(Date);
    expect(org.freePlan).toBe('SMALL_TEAM');
    expect(new Date(org.freeUntil).getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);
  });

  it('can add its team, and Plan and billing says its free month', async () => {
    const { svc } = billing({});
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: true });
    const status = await svc.getStatus('org-1');
    expect(status.people).toEqual({ count: 6, cap: 20 });
    expect(status.onTheHouse).toMatchObject({ plan: 'SMALL_TEAM', freeTrial: true });
    expect(status).not.toHaveProperty('onTheFreePlan');
  });

  it('is given it once: a second check-in does not give it again', async () => {
    const { svc, org } = billing({});
    await svc.canCreateGround('org-1');
    const first = org.freeTrialStartedAt;
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(org.freeTrialStartedAt).toBe(first);
  });

  it('a free run of ours that has ended is not the trial: the trial is still given', async () => {
    const { svc, org } = billing({ org: { freeUntil: new Date('2026-10-01T00:00:00.000Z'), freePlan: 'GROWTH' } });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(org.freePlan).toBe('SMALL_TEAM');
  });
});

/* A Stripe test key, so paying is possible here (payingIsPossibleHere). Restored after. */
const A_TEST_KEY = 'sk_test_51abcdefghijklmnopqrstuvwxyz0123456789';
let keyBefore: string | undefined;
const withAKey = () => {
  beforeAll(() => { keyBefore = process.env.STRIPE_SECRET_KEY; process.env.STRIPE_SECRET_KEY = A_TEST_KEY; });
  afterAll(() => { if (keyBefore === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = keyBefore; });
};
const withNoKey = () => {
  beforeAll(() => { keyBefore = process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_SECRET_KEY; });
  afterAll(() => { if (keyBefore !== undefined) process.env.STRIPE_SECRET_KEY = keyBefore; });
};

describe('while paying is not wired (no Stripe key), nobody is refused for having no plan (Hafsah, 23 November 2026)', () => {
  withNoKey();
  it('ILRI is still given its trial once, as built', async () => {
    const { svc, org } = billing({});
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(org.freeTrialStartedAt).toBeInstanceOf(Date);
  });
  it('a team at or over the trial size can open a check-in and add people, and is not given the trial', async () => {
    const { svc, org } = billing({ seats: 20 });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: true });
    expect(org.freeTrialStartedAt).toBeNull();
  });
  it('after the trial and its four weeks, a check-in can still be opened', async () => {
    const { svc } = billing({
      trial: { ...ON, onSince: '2026-08-01T00:00:00.000Z' },
      org: { freeTrialStartedAt: new Date('2026-08-01T00:00:00.000Z'), freeUntil: new Date('2026-09-01T00:00:00.000Z'), freePlan: 'SMALL_TEAM' },
    });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
  });
});

describe('a team at or over the trial size starts on a plan, once paying is possible', () => {
  withAKey();
  it('is not given the trial, and is told plainly how to go on', async () => {
    const { svc, org } = billing({ seats: 20 });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true });
    expect(org.freeTrialStartedAt).toBeNull();
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: false, reason: NO_PLAN_TO_ADD });
    expect(NO_PLAN_TO_OPEN).toBe('Your organisation has no plan yet. Choose one on Plan and billing to open a check-in.');
  });

  it('a check-in it opened free before keeps running, with unlimited sessions', async () => {
    const { svc } = billing({ seats: 25, ground: { isFreeGround: true } });
    expect(await svc.canStartSession('g-1')).toEqual({ allowed: true, sessionsBalance: -1 });
  });

  it('a check-in with nothing in hand is paused in the prototype’s words, with no free extension offered', async () => {
    const { svc } = billing({ seats: 25 });
    expect(await svc.canStartSession('g-1')).toEqual({ allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0 });
  });
});

describe('after the trial: no new check-in until a plan is chosen, once paying is possible', () => {
  withAKey();
  it('an organisation whose trial and the four weeks after it are over cannot open one, and is not given another trial', async () => {
    const { svc, org } = billing({
      trial: { ...ON, onSince: '2026-08-01T00:00:00.000Z' },
      org: { freeTrialStartedAt: new Date('2026-08-01T00:00:00.000Z'), freeUntil: new Date('2026-09-01T00:00:00.000Z'), freePlan: 'SMALL_TEAM' },
    });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true });
    expect(org.freeUntil).toEqual(new Date('2026-09-01T00:00:00.000Z'));
  });

  it('a paying organisation is never given the trial', async () => {
    const { svc, org } = billing({ org: { subscriptionPlan: 'GROWTH', subscriptionStatus: 'active' } });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true });
    expect(org.freeTrialStartedAt).toBeNull();
  });
});

describe('the trial is on by default, and nothing anywhere counts free check-ins', () => {
  function pricing(row: any) {
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => row), upsert: jest.fn(async () => ({})) },
      pricingPlan: { findMany: jest.fn(async () => []) },
    };
    return new PricingService(prisma, {} as any);
  }
  it('a database with no row reads the trial and the anchor trial as on', async () => {
    expect(DEFAULT_FREE_TRIAL).toEqual({ on: true, teamsUnder: 20, months: 1 });
    expect((await pricing(null).getFreeTrial()).on).toBe(true);
    expect((await pricing(null).getAnchorTrial()).on).toBe(true);
  });
  it('the public pricing read has the trial and no free check-in limit', async () => {
    const res: any = await pricing({ value: ON }).publicPricing();
    expect(res.trial).toEqual({ on: true, teamsUnder: 20, months: 1 });
    expect(res).not.toHaveProperty('free');
  });
  it('no refusal a person reads names free check-ins', async () => {
    for (const said of [NO_PLAN_TO_OPEN, NO_PLAN_TO_ADD, PAUSED_UNTIL_THEY_SUBSCRIBE]) expect(said).not.toMatch(/free (plan|check-ins)/i);
  });
});
