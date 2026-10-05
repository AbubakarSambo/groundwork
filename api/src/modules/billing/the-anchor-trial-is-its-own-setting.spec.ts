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

function baridi(opts: { anchorOn?: boolean; trialOn?: boolean; org?: any; regular?: { on: boolean; teamsUnder: number; months: number }; seats?: number; anchorCheckIns?: number } = {}) {
  const writes: any[] = [];
  const org = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null, ...(opts.org ?? {}) };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'release.anchorScenario' && opts.anchorOn ? { value: { on: true } } : null)) },
    organization: {
      findUnique: jest.fn(async () => org),
      updateMany: jest.fn(async (q: any) => { writes.push(q); Object.assign(org, q.data); return { count: 1 }; }),
    },
    user: { count: jest.fn(async () => opts.seats ?? 1) },
    ground: { count: jest.fn(async () => opts.anchorCheckIns ?? 1) },
  };
  const pricing: any = {
    getAnchorTrial: jest.fn(async () => ({ on: opts.trialOn ?? false, months: 1, people: 20 })),
    getFreeTrial: jest.fn(async () => opts.regular ?? { on: false, teamsUnder: 20, months: 1 }),
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
    /* Changed after review: with the regular trial off, the anchor month does not use it up. */
    expect(org.freeTrialStartedAt).toBeNull();
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

/* Review of piece 34: the anchor month never shortens a free run, and never uses up the regular trial. */
describe('the anchor month and the regular trial', () => {
  it('where the regular trial would also be given, the longer of the two is given, and it counts as the regular trial', async () => {
    const { svc, org } = baridi({ anchorOn: true, trialOn: true, regular: { on: true, teamsUnder: 20, months: 3 }, seats: 4 });
    const got: any = await svc.grantTheAnchorTrial('org-baridi', NOW);
    expect(got.granted).toBe(true);
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2027-01-05');
    expect(org.freeTrialStartedAt).toEqual(NOW);
  });
  it('where it would not, the anchor month leaves the regular trial to be given later, in full from that day', async () => {
    const { svc, org } = baridi({ anchorOn: true, trialOn: true, regular: { on: false, teamsUnder: 20, months: 3 } });
    await svc.grantTheAnchorTrial('org-baridi', NOW);
    expect(org.freeTrialStartedAt).toBeNull();
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2026-11-05');
    /* Later the regular trial is switched on, three months, and the team says it is small. */
    const later = new Date('2026-10-20T10:00:00Z');
    const pricing: any = { getFreeTrial: jest.fn(async () => ({ on: true, teamsUnder: 20, months: 3 })), listPlans: jest.fn(async () => PLANS) };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => org), updateMany: jest.fn(async (q: any) => { Object.assign(org, q.data); return { count: 1 }; }) },
      user: { count: jest.fn(async () => 4) },
      ground: { count: jest.fn(async () => 1) },
    };
    const got: any = await new TheFreeTrialService(prisma, pricing).grantIfItApplies('org-baridi', 'fewer', later);
    expect(got.granted).toBe(true);
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2027-01-20');
  });
  it('another free run of its own is left alone by the regular trial, as before', async () => {
    const org: any = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date('2026-12-01'), freePlan: 'GROWTH', freeTrialStartedAt: null };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => org), updateMany: jest.fn() },
      user: { count: jest.fn(async () => 4) },
      ground: { count: jest.fn(async () => 0) },
    };
    const pricing: any = { getFreeTrial: jest.fn(async () => ({ on: true, teamsUnder: 20, months: 3 })), listPlans: jest.fn(async () => PLANS) };
    expect(await new TheFreeTrialService(prisma, pricing).grantIfItApplies('o', 'fewer', NOW)).toEqual({ granted: false, why: 'it has a free run of its own' });
  });
});
