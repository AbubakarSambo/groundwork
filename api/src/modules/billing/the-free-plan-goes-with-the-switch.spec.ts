import { ForbiddenException } from '@nestjs/common';
import { BillingService, NO_PLAN_TO_OPEN, NO_PLAN_TO_ADD, PAUSED_UNTIL_THEY_SUBSCRIBE } from './billing.service';
import { PricingService, freePlanApplies, FREE_TRIAL_KEY } from './pricing.service';

/**
 * ONE SWITCH FOR THE TRIAL AND THE FREE PLAN (U.19). Hafsah, 27 September:
 *
 *   - While `pricing.freeTrial` is OFF, which is how it ships, billing behaves exactly as today,
 *     including the free check-ins, the free plan for up to 5 people and the free first session.
 *   - When it is switched ON, the 3-month trial for teams under 20 starts, and the free first session
 *     and the free plan go away at the same moment. Teams of 20 or more always pay.
 *   - Organisations already on the free plan keep what they have, even after the switch.
 *
 * Baridi Appliances was here before the switch. Pwani Foods signs up after it.
 */
const SWITCHED_ON = '2026-10-01T00:00:00.000Z';
const BARIDI_CREATED = new Date('2026-08-01T00:00:00.000Z');
const PWANI_CREATED = new Date('2026-10-05T00:00:00.000Z');
const OFF = { on: false, teamsUnder: 20, months: 1 }; /* One month since decision 78 (5 October 2026: every free run is one month). */
const ON = { on: true, teamsUnder: 20, months: 1, onSince: SWITCHED_ON };

function billing(opts: { trial: any; createdAt: Date; seats?: number; freeGrounds?: number; org?: any; ground?: any }) {
  const writes: any[] = [];
  const org = {
    subscriptionPlan: null, subscriptionStatus: null, careFeeStatus: null, freeUntil: null, freePlan: null,
    freeTrialStartedAt: null, freeExtensionUsed: false, stripeCustomerId: null, defaultPaymentMethodId: null,
    subscriptionPeriodEnd: null, subscriptionEndsAt: null, createdAt: opts.createdAt, ...(opts.org ?? {}),
  };
  const ground = { id: 'g-1', sessionsBalance: 0, isFreeGround: false, organizationId: 'org-1', ...(opts.ground ?? {}) };
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => org), update: jest.fn(async (a: any) => { writes.push(a); return org; }) },
    user: { count: jest.fn(async () => opts.seats ?? 1), findMany: jest.fn(async () => []) },
    ground: {
      count: jest.fn(async () => opts.freeGrounds ?? 0),
      findUnique: jest.fn(async () => ground),
      findFirst: jest.fn(async () => ground),
      findMany: jest.fn(async () => []),
      update: jest.fn(async (a: any) => { writes.push(a); return ground; }),
    },
    report: { count: jest.fn(async () => 0) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    billingEvent: { findMany: jest.fn(async () => []), create: jest.fn(async (a: any) => { writes.push(a); return {}; }) },
    $transaction: jest.fn(async (ops: any[]) => ops),
  };
  const pricing: any = {
    getFreeTrial: jest.fn(async () => opts.trial),
    getFreeGroundLimit: jest.fn(async () => 10),
    getFreeMemberLimit: jest.fn(async () => 5),
    memberCapFor: jest.fn(async (p: string) => ({ STARTER: 5, SMALL_TEAM: 20, GROWTH: 100 } as any)[p] ?? null),
  };
  const email: any = { sendMemberCapWarning: jest.fn(async () => undefined), sendFreeExtensionClaimed: jest.fn(async () => undefined) };
  const config: any = { get: () => '' };
  return { svc: new BillingService(prisma, { stripe: {} } as any, pricing, config, email, {} as any), writes };
}

describe('who the free plan applies to', () => {
  it('everybody while the switch is off', () => {
    expect(freePlanApplies(OFF, PWANI_CREATED)).toBe(true);
    expect(freePlanApplies(null, PWANI_CREATED)).toBe(true);
  });
  it('once it is on, only an organisation that was here before', () => {
    expect(freePlanApplies(ON, BARIDI_CREATED)).toBe(true);
    expect(freePlanApplies(ON, PWANI_CREATED)).toBe(false);
  });
  it('anything unknown keeps the free plan, so nobody is cut off', () => {
    expect(freePlanApplies({ ...ON, onSince: undefined }, PWANI_CREATED)).toBe(true);
    expect(freePlanApplies(ON, null)).toBe(true);
  });
});

describe('the switch remembers when it was turned on, and keeps that to itself', () => {
  function pricing(row: any) {
    const saved: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => row), upsert: jest.fn(async (a: any) => { saved.push(a.create.value); return {}; }) },
      pricingPlan: { findMany: jest.fn(async () => []) },
    };
    return { svc: new PricingService(prisma, {} as any), saved };
  }
  it('turning it on writes the moment, and a change while on keeps the first moment', async () => {
    const a = pricing({ value: OFF });
    const got = await a.svc.setFreeTrial({ on: true }, 'staff-1');
    expect(got.on).toBe(true);
    expect(typeof got.onSince).toBe('string');
    const b = pricing({ key: FREE_TRIAL_KEY, value: ON });
    expect((await b.svc.setFreeTrial({ months: 4 }, 'staff-1')).onSince).toBe(SWITCHED_ON);
  });
  it('the public pricing read never says when', async () => {
    const res = await pricing({ value: ON }).svc.publicPricing();
    expect(res.trial).toEqual({ on: true, teamsUnder: 20, months: 1 });
  });
});

describe('while the switch is off, billing is exactly as today', () => {
  it('a new organisation opens its free check-ins, adds up to 5 people and keeps the free first session', async () => {
    const { svc } = billing({ trial: OFF, createdAt: PWANI_CREATED, freeGrounds: 3, seats: 4 });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true, freeReason: 'FREE_TIER', groundsUsed: 3 });
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: true });
    const status = await svc.getStatus('org-1');
    expect(status.people).toEqual({ count: 4, cap: 5 });
    expect(status.onTheFreePlan).toBe(true);
  });
  it('the sixth person is refused with today’s words', async () => {
    const { svc } = billing({ trial: OFF, createdAt: PWANI_CREATED, seats: 5 });
    expect((await svc.canInviteMember('org-1')).reason).toBe('The free plan covers 5 people, including you, so you can invite 4 others. Subscribe to add more people.');
  });
});

describe('once the switch is on, a new organisation pays first', () => {
  it('Pwani Foods, with no plan, cannot open a check-in, and is told how', async () => {
    const { svc } = billing({ trial: ON, createdAt: PWANI_CREATED });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true });
    expect(NO_PLAN_TO_OPEN).toBe('Your organisation has no plan yet. Choose one on Plan and billing to open a check-in.');
  });
  it('and cannot add anybody until it pays', async () => {
    const { svc } = billing({ trial: ON, createdAt: PWANI_CREATED, seats: 1 });
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: false, reason: NO_PLAN_TO_ADD });
    const status = await svc.getStatus('org-1');
    expect(status.people).toEqual({ count: 1, cap: 1 });
    expect(status.onTheFreePlan).toBe(false);
  });
  it('a check-in it opens under cover starts with no free session in hand', async () => {
    const { svc } = billing({ trial: ON, createdAt: PWANI_CREATED, org: { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' } });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true, sessionsToStart: 0 });
  });
  it('when its cover ends, its check-ins pause in the prototype’s words, with nothing free to offer', async () => {
    const { svc } = billing({ trial: ON, createdAt: PWANI_CREATED, ground: { sessionsBalance: 0 } });
    expect(await svc.canStartSession('g-1')).toEqual({ allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0, freeExtensionAvailable: false });
    await expect(svc.claimFreeExtension('org-1', 'g-1')).rejects.toThrow(ForbiddenException);
  });
});

describe('once the switch is on, an organisation already on the free plan keeps it', () => {
  it('Baridi keeps its free check-ins, its 5 people, its free sessions and its free extension', async () => {
    const { svc, writes } = billing({ trial: ON, createdAt: BARIDI_CREATED, freeGrounds: 3, seats: 4 });
    expect(await svc.canCreateGround('org-1')).toEqual({ allowed: true, freeReason: 'FREE_TIER', groundsUsed: 3 });
    expect(await svc.canInviteMember('org-1')).toEqual({ allowed: true });
    const status = await svc.getStatus('org-1');
    expect(status.people).toEqual({ count: 4, cap: 5 });
    expect(status.onTheFreePlan).toBe(true);
    await svc.claimFreeExtension('org-1', 'g-1');
    expect(writes.length).toBeGreaterThan(0);
  });
  it('a check-in it opened free keeps unlimited sessions', async () => {
    const { svc } = billing({ trial: ON, createdAt: BARIDI_CREATED, ground: { isFreeGround: true } });
    expect(await svc.canStartSession('g-1')).toEqual({ allowed: true, sessionsBalance: -1 });
  });
  it('and at the free plan’s limits it is told today’s words, not that it has no plan', async () => {
    const { svc } = billing({ trial: ON, createdAt: BARIDI_CREATED, freeGrounds: 10, seats: 5 });
    expect((await svc.canCreateGround('org-1')).reason).toBe('Your free plan includes 10 check-ins. Subscribe to open more.');
    expect((await svc.canInviteMember('org-1')).reason).toContain('The free plan covers 5 people, including you');
  });
});
