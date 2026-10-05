import { TheFreeTrialService } from './the-free-trial.service';
import { PricingService, ANCHOR_TRIAL_KEY } from './pricing.service';

/**
 * ANCHOR PIECE 34: THE ANCHOR'S ONE-MONTH TRIAL, UP TO 20 PEOPLE WITH THE LEAD (decision 96 item 3).
 *
 * Given when a check-in is started from the anchor link, only while both the anchor switch and its own setting,
 * `pricing.anchorTrial`, are on. Off by default. `pricing.freeTrial` and the paid client are untouched. Nothing
 * touches Stripe. Wairimu starts her anchor check-in for Baridi Appliances.
 */
const NOW = new Date('2026-10-05T10:00:00Z');
const PLANS = [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20 },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100 },
];

function baridi(opts: { anchorOn?: boolean; trialOn?: boolean; org?: any } = {}) {
  const writes: any[] = [];
  const org = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null, ...(opts.org ?? {}) };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'release.anchorScenario' && opts.anchorOn ? { value: { on: true } } : null)) },
    organization: {
      findUnique: jest.fn(async () => org),
      updateMany: jest.fn(async (q: any) => { writes.push(q); Object.assign(org, q.data); return { count: 1 }; }),
    },
  };
  const pricing: any = {
    getAnchorTrial: jest.fn(async () => ({ on: opts.trialOn ?? false, months: 1, people: 20 })),
    listPlans: jest.fn(async () => PLANS),
  };
  return { svc: new TheFreeTrialService(prisma, pricing), writes, org };
}

describe('the anchor trial', () => {
  it('with either setting off, nothing is given and nothing is written', async () => {
    for (const [anchorOn, trialOn] of [[false, false], [true, false], [false, true]] as const) {
      const { svc, writes } = baridi({ anchorOn, trialOn });
      expect((await svc.grantTheAnchorTrial('org-baridi', NOW)).granted).toBe(false);
      expect(writes).toEqual([]);
    }
  });

  it('with both on, one month on the plan that holds 20 people, the lead included', async () => {
    const { svc, org } = baridi({ anchorOn: true, trialOn: true });
    const got: any = await svc.grantTheAnchorTrial('org-baridi', NOW);
    expect(got.granted).toBe(true);
    expect(got.plan).toBe('SMALL_TEAM');
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2026-11-05');
    expect(org.freeTrialStartedAt).toEqual(NOW);
  });

  it('once only, never to one that is paying or has a free run already', async () => {
    expect((await baridi({ anchorOn: true, trialOn: true, org: { freeTrialStartedAt: NOW } }).svc.grantTheAnchorTrial('o', NOW)).granted).toBe(false);
    expect((await baridi({ anchorOn: true, trialOn: true, org: { freeUntil: new Date('2026-12-01') } }).svc.grantTheAnchorTrial('o', NOW)).granted).toBe(false);
    expect((await baridi({ anchorOn: true, trialOn: true, org: { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' } }).svc.grantTheAnchorTrial('o', NOW)).granted).toBe(false);
  });
});

describe('the setting', () => {
  const pricing = (value: any) => new PricingService({ platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === ANCHOR_TRIAL_KEY ? (value === undefined ? null : { value }) : null)) } } as any, {} as any);
  it('is off unless the row says on, and a bad row reads as off', async () => {
    expect((await pricing(undefined).getAnchorTrial()).on).toBe(false);
    expect((await pricing({ on: 'yes' }).getAnchorTrial()).on).toBe(false);
    expect(await pricing({ on: true }).getAnchorTrial()).toEqual({ on: true, months: 1, people: 20 });
  });
});
