import { readFileSync } from 'fs';
import { join } from 'path';
import { TheFreeTrialService } from './the-free-trial.service';
import { BillingService } from './billing.service';
import { DEFAULT_FREE_TRIAL } from './pricing.service';
import { GroundworkEvents } from '../../common/events';

/**
 * THE FREE TRIAL IS GIVEN FOR REAL, AND ONLY WHILE ITS SETTING IS ON (U.19).
 *
 * Hafsah's decision of 26 September: teams of fewer than 20 people get Groundwork free, for one month since decision 78.
 * She said to keep the sentence off until billing really gives the trial. So the grant sits behind
 * the same setting as the sentence: while it is off, nothing about today's billing changes; turned
 * on, an organisation that says it is fewer than 20 is given its month, with no card and no charge.
 *
 * Baridi Appliances has just been created by Grace. The plans are the seeded ones.
 */
const NOW = new Date('2026-09-27T10:00:00Z');
const PLANS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100 },
  { plan: 'BUSINESS', amountCents: 90000, memberCap: 250 },
  { plan: 'SCALE', amountCents: 165000, memberCap: 500 },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null },
];

function baridi(opts: { on?: boolean; teamsUnder?: number; months?: number; seats?: number; org?: any } = {}) {
  const writes: any[] = [];
  const org = {
    subscriptionPlan: null, subscriptionStatus: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null,
    ...(opts.org ?? {}),
  };
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async () => org),
      updateMany: jest.fn(async (q: any) => { writes.push(q); Object.assign(org, q.data); return { count: 1 }; }),
    },
    user: { count: jest.fn(async () => opts.seats ?? 1) },
  };
  const pricing: any = {
    /* The length is the shipped default unless a test says otherwise: one month since decision 78. */
    getFreeTrial: jest.fn(async () => ({ on: opts.on ?? false, teamsUnder: opts.teamsUnder ?? 20, months: opts.months ?? DEFAULT_FREE_TRIAL.months })),
    listPlans: jest.fn(async () => PLANS),
  };
  return { svc: new TheFreeTrialService(prisma, pricing), prisma, writes, org };
}

describe('while the free trial is off, which is how it ships', () => {
  it('Grace saying her team is small gives nothing, and writes nothing', async () => {
    const { svc, writes, prisma } = baridi({ on: false });
    const got = await svc.grantIfItApplies('org-baridi', 'fewer', NOW);
    expect(got).toEqual({ granted: false, why: 'the free trial is off' });
    expect(writes).toEqual([]);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });
});

describe('once the free trial is switched on', () => {
  it('a team under 20 is given one month on Small Team, from today, with nothing charged (decision 78)', async () => {
    const { svc, writes } = baridi({ on: true, seats: 1 });
    const got = await svc.grantIfItApplies('org-baridi', 'fewer', NOW);
    expect(got).toEqual({ granted: true, plan: 'SMALL_TEAM', until: new Date('2026-10-27T10:00:00Z') });
    expect(writes).toHaveLength(1);
    expect(writes[0].where).toEqual({ id: 'org-baridi', freeTrialStartedAt: null, freeUntil: null });
    expect(writes[0].data).toEqual({ freeTrialStartedAt: NOW, freeUntil: new Date('2026-10-27T10:00:00Z'), freePlan: 'SMALL_TEAM' });
    /* Only the free run's own fields: no subscription, no status, no Stripe customer. */
    expect(Object.keys(writes[0].data).sort()).toEqual(['freePlan', 'freeTrialStartedAt', 'freeUntil']);
  });

  it('the size and the length come from the setting, and the plan from the table', async () => {
    const { svc } = baridi({ on: true, teamsUnder: 50, months: 2 });
    const got = await svc.grantIfItApplies('org-baridi', 'fewer', NOW);
    expect(got).toEqual({ granted: true, plan: 'GROWTH', until: new Date('2026-11-27T10:00:00Z') });
  });

  it('a team of 20 or more starts on a plan, as the pricing page says', async () => {
    expect((await baridi({ on: true }).svc.grantIfItApplies('org-baridi', 'more', NOW)).granted).toBe(false);
    /* What they said is checked against who is really here. */
    expect((await baridi({ on: true, seats: 20 }).svc.grantIfItApplies('org-baridi', 'fewer', NOW)).granted).toBe(false);
    expect((await baridi({ on: true, seats: 19 }).svc.grantIfItApplies('org-baridi', 'fewer', NOW)).granted).toBe(true);
  });

  it('is given once, never over a free run we gave, and never to an organisation that pays', async () => {
    const cases = [
      { freeTrialStartedAt: new Date('2026-01-01') },
      { freeUntil: new Date('2026-12-01'), freePlan: 'GROWTH' },
      { subscriptionPlan: 'GROWTH', subscriptionStatus: 'active' },
    ];
    for (const org of cases) {
      const { svc, writes } = baridi({ on: true, org });
      expect((await svc.grantIfItApplies('org-baridi', 'fewer', NOW)).granted).toBe(false);
      expect(writes).toEqual([]);
    }
  });

  it('never throws, so naming an organisation can never fail on it', async () => {
    const { svc, prisma } = baridi({ on: true });
    prisma.organization.findUnique.mockRejectedValueOnce(new Error('the database blinked'));
    await expect(svc.grantIfItApplies('org-baridi', 'fewer', NOW)).resolves.toEqual({ granted: false, why: 'something failed' });
  });
});

describe('where the answer comes from', () => {
  it('the trial listens for what somebody said about their team size', () => {
    const meta = Reflect.getMetadata('EVENT_LISTENER_METADATA', TheFreeTrialService.prototype.whenTheySayTheirSize);
    expect(JSON.stringify(meta)).toContain(GroundworkEvents.ORG_SIZE_SAID);
  });

  it('naming the first organisation and creating another both tell billing the answer', () => {
    const users = readFileSync(join(__dirname, '../users/users.service.ts'), 'utf8');
    const auth = readFileSync(join(__dirname, '../auth/auth.service.ts'), 'utf8');
    expect(users).toMatch(/GroundworkEvents\.ORG_SIZE_SAID/);
    expect(auth).toMatch(/if \(what\.teamSize\) this\.sizeSaid\(org\.id, what\.teamSize\)/);
  });

  it('nothing in the trial reaches Stripe', () => {
    const src = readFileSync(join(__dirname, 'the-free-trial.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/stripe/i);
  });
});

describe('what Plan and billing serves once the trial is given', () => {
  it('says these are the free trial’s months, the plan they cover and the day they end', async () => {
    /* From the real clock, because the page reads today's date to know the months are still running. */
    const until = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const prisma: any = {
      organization: {
        findUnique: async () => ({
          stripeCustomerId: null, defaultPaymentMethodId: null, subscriptionPlan: null, subscriptionStatus: null,
          subscriptionPeriodEnd: null, subscriptionEndsAt: null, freeExtensionUsed: false,
          freeUntil: until, freePlan: 'SMALL_TEAM', freeTrialStartedAt: NOW,
        }),
      },
      user: { count: async () => 12 },
      ground: { count: async () => 0, findMany: async () => [] },
      report: { count: async () => 0 },
      groundParticipant: { findMany: async () => [] },
    };
    const pricing: any = { memberCapFor: async (p: string) => (p === 'SMALL_TEAM' ? 20 : null), getFreeMemberLimit: async () => 5 };
    const billing = new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, {} as any, {} as any);
    const status = await billing.getStatus('org-baridi');
    expect(status.onTheHouse).toEqual({ plan: 'SMALL_TEAM', until, freeTrial: true });
    expect(status.people).toEqual({ count: 12, cap: 20 });
    expect(status.subscription.plan).toBeNull();
  });
});

describe('an organisation named on the sign-up form, which never asks its size (clean-install run, 6 October)', () => {
  it('Wanjiru names her team on the form and gets the month, so she can open a check-in', async () => {
    const { svc, writes } = baridi({ on: true, seats: 1 });
    await svc.whenAnOrganisationIsNamedOnTheForm({ organizationId: 'org-baridi', organizationName: 'Baridi Appliances', adminEmail: 'wanjiru@baridi.test', namedOnTheForm: true });
    expect(writes).toHaveLength(1);
    expect(writes[0].data.freePlan).toBe('SMALL_TEAM');
  });

  it('an organisation made another way, or while the trial is off, is left alone', async () => {
    const a = baridi({ on: true });
    await a.svc.whenAnOrganisationIsNamedOnTheForm({ organizationId: 'o', organizationName: 'X', adminEmail: 'x@x.test' });
    expect(a.writes).toEqual([]);
    const b = baridi({ on: false });
    await b.svc.whenAnOrganisationIsNamedOnTheForm({ organizationId: 'o', organizationName: 'X', adminEmail: 'x@x.test', namedOnTheForm: true });
    expect(b.writes).toEqual([]);
  });
});
