import { TheFreeTrialService } from './the-free-trial.service';
import { PricingService } from './pricing.service';
import { BillingService } from './billing.service';

/**
 * DECISION 121, ITEM 4: AN ANCHOR TEAM IS UP TO 20 PEOPLE BESIDES THE LEAD, WHICHEVER TRIAL COVERS IT.
 * With the anchor trial setting off, Baridi Appliances sits on the ordinary trial, whose plan (Small Team) holds 20 seats in all, so the 21st person
 * (20 members and Wairimu) was refused. Here the real billing gate is asked, with 20 people already in, for the 21st.
 */
const NOW = new Date('2026-10-05T10:00:00Z');
const ROWS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100 },
];

function baridi(opts: { anchorGround: boolean; people: number; anchorOn?: boolean }) {
  const org: any = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null, createdAt: NOW };
  const settings: Record<string, any> = {
    'release.anchorScenario': { on: true },
    'pricing.freeTrial': { on: true, teamsUnder: 20, months: 1 },
    'pricing.anchorTrial': { on: !!opts.anchorOn },
  };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (settings[where.key] ? { value: settings[where.key] } : null)) },
    pricingPlan: {
      findMany: jest.fn(async () => ROWS.map((r) => ({ ...r, updatedAt: NOW, stripePriceId: null }))),
      findUnique: jest.fn(async ({ where }: any) => ROWS.find((r) => r.plan === where.plan) ?? null),
    },
    organization: {
      findUnique: jest.fn(async () => org),
      updateMany: jest.fn(async (q: any) => { Object.assign(org, q.data); return { count: 1 }; }),
    },
    user: { count: jest.fn(async () => opts.people) },
    ground: { findFirst: jest.fn(async () => (opts.anchorGround ? { id: 'g-anchor' } : null)), findMany: jest.fn(async () => (opts.anchorGround ? [{ createdAt: NOW }] : [])), count: jest.fn(async () => 1) },
  };
  const pricing = new PricingService(prisma, {} as any);
  return { org, trial: new TheFreeTrialService(prisma, pricing), billing: new BillingService(prisma, {} as any, pricing, {} as any, {} as any, {} as any) };
}

describe('an anchor team of 20 people and the lead, on the ordinary trial', () => {
  it('is given the 21st seat when it said its size after the anchor check-in began', async () => {
    const { org, trial, billing } = baridi({ anchorGround: true, people: 4 });
    expect((await trial.grantIfItApplies('org-baridi', 'fewer', NOW)).granted).toBe(true);
    expect(org.freePlan).not.toBe('SMALL_TEAM');
    (billing as any).seatsTaken = async () => 20;
    expect((await billing.canInviteMember('org-baridi')).allowed).toBe(true);
  });

  it('is given it when the anchor check-in begins after the ordinary trial was already given, and the end day does not move', async () => {
    const { org, trial, billing } = baridi({ anchorGround: false, people: 4 });
    await trial.grantIfItApplies('org-baridi', 'fewer', NOW);
    expect(org.freePlan).toBe('SMALL_TEAM');
    const ends = org.freeUntil;
    await trial.whenAnAnchorCheckInStarts({ organizationId: 'org-baridi', groundId: 'g-anchor' } as any);
    expect(org.freePlan).toBe('GROWTH');
    expect(org.freeUntil).toBe(ends);
    (billing as any).seatsTaken = async () => 20;
    expect((await billing.canInviteMember('org-baridi')).allowed).toBe(true);
  });

  it('an ordinary team that is not an anchor team stays on Small Team, which holds 20 in all', async () => {
    const { org, trial, billing } = baridi({ anchorGround: false, people: 4 });
    await trial.grantIfItApplies('org-baridi', 'fewer', NOW);
    expect(org.freePlan).toBe('SMALL_TEAM');
    (billing as any).seatsTaken = async () => 20;
    expect((await billing.canInviteMember('org-baridi')).allowed).toBe(false);
  });

  it('a team that is paying is left alone', async () => {
    const { org, trial } = baridi({ anchorGround: false, people: 4 });
    Object.assign(org, { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' });
    await trial.whenAnAnchorCheckInStarts({ organizationId: 'org-baridi', groundId: 'g' } as any);
    expect(org.freePlan).toBeNull();
  });
});
