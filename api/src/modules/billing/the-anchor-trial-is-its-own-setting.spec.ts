import { TheFreeTrialService } from './the-free-trial.service';
import { BadRequestException } from '@nestjs/common';
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
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === 'release.anchorScenario' ? { value: { on: !!opts.anchorOn } } : null)) },
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
  /* Changed 5 October 2026: every free run is one month (Hafsah), so the regular trial here is one month, not three. */
  it('where the regular trial would also be given, the longer of the two is given, and it counts as the regular trial', async () => {
    const { svc, org } = baridi({ anchorOn: true, trialOn: true, regular: { on: true, teamsUnder: 20, months: 1 }, seats: 4 });
    const got: any = await svc.grantTheAnchorTrial('org-baridi', NOW);
    expect(got.granted).toBe(true);
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2026-11-05');
    expect(org.freeTrialStartedAt).toEqual(NOW);
  });
  /* A later answer, with the regular trial switched on at one month, against Baridi's free run as it stands. */
  const later = async (org: any, at: Date, anchorStartedOn: Date | null = NOW) => {
    const pricing: any = {
      getFreeTrial: jest.fn(async () => ({ on: true, teamsUnder: 20, months: 1 })),
      getAnchorTrial: jest.fn(async () => ({ on: true, months: 1, people: 20 })),
      listPlans: jest.fn(async () => PLANS),
    };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => org), updateMany: jest.fn(async (q: any) => { Object.assign(org, q.data); return { count: 1 }; }) },
      user: { count: jest.fn(async () => 4) },
      ground: { findMany: jest.fn(async () => (anchorStartedOn ? [{ createdAt: anchorStartedOn }] : [])) },
    };
    return new TheFreeTrialService(prisma, pricing).grantIfItApplies('org-baridi', 'fewer', at);
  };
  const anAnchorMonth = () => ({ subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date('2026-11-05T10:00:00Z'), freePlan: 'SMALL_TEAM', freeTrialStartedAt: null });

  it('where it would not, the anchor month leaves the regular trial to be given later', async () => {
    const { svc, org } = baridi({ anchorOn: true, trialOn: true, regular: { on: false, teamsUnder: 20, months: 1 } });
    await svc.grantTheAnchorTrial('org-baridi', NOW);
    expect(org.freeTrialStartedAt).toBeNull();
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('fault 1: inside the anchor month, the regular trial runs from the day the month started, never longer in total', async () => {
    const org = anAnchorMonth();
    const got: any = await later(org, new Date('2026-10-20T10:00:00Z'));
    expect(got.granted).toBe(true);
    /* One month from 5 October, when the anchor month began, not from 20 October: the run ends where it already did. */
    expect(org.freeUntil.toISOString().slice(0, 10)).toBe('2026-11-05');
    expect(org.freeTrialStartedAt).toEqual(new Date('2026-10-20T10:00:00Z'));
  });

  it('fault 1: once the anchor month has ended, a later answer gives no second free run', async () => {
    const org = anAnchorMonth();
    expect(await later(org, new Date('2026-11-20T10:00:00Z'))).toEqual({ granted: false, why: 'it has a free run of its own' });
  });

  it('fault 2: a free run on another plan, or that does not end a month after an anchor start, is not taken for one', async () => {
    const onGrowth = { ...anAnchorMonth(), freePlan: 'GROWTH' };
    expect(await later(onGrowth, new Date('2026-10-20T10:00:00Z'))).toEqual({ granted: false, why: 'it has a free run of its own' });
    const givenByStaff = { ...anAnchorMonth(), freeUntil: new Date('2026-12-15T10:00:00Z') };
    expect(await later(givenByStaff, new Date('2026-10-20T10:00:00Z'))).toEqual({ granted: false, why: 'it has a free run of its own' });
    const noAnchorCheckIn = anAnchorMonth();
    expect(await later(noAnchorCheckIn, new Date('2026-10-20T10:00:00Z'), null)).toEqual({ granted: false, why: 'it has a free run of its own' });
  });

  it('another free run of its own is left alone by the regular trial, as before', async () => {
    const org: any = { subscriptionPlan: null, subscriptionStatus: null, freeUntil: new Date('2026-12-01'), freePlan: 'GROWTH', freeTrialStartedAt: null };
    const prisma: any = {
      organization: { findUnique: jest.fn(async () => org), updateMany: jest.fn() },
      user: { count: jest.fn(async () => 4) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const pricing: any = { getFreeTrial: jest.fn(async () => ({ on: true, teamsUnder: 20, months: 1 })), listPlans: jest.fn(async () => PLANS) };
    expect(await new TheFreeTrialService(prisma, pricing).grantIfItApplies('o', 'fewer', NOW)).toEqual({ granted: false, why: 'it has a free run of its own' });
  });
});

describe('the setting is written from Admin, as the free trial is', () => {
  it('only on or off: its month and its twenty people are not settings', async () => {
    const upserts: any[] = [];
    const svc = new PricingService({ platformSetting: { upsert: jest.fn(async (q: any) => { upserts.push(q); return {}; }) } } as any, {} as any);
    expect(await svc.setAnchorTrial({ on: true }, 'admin-1')).toEqual({ on: true, months: 1, people: 20 });
    expect(upserts[0].where).toEqual({ key: ANCHOR_TRIAL_KEY });
    expect(await svc.setAnchorTrial({ on: false, months: 6, people: 50 } as any, 'admin-1')).toEqual({ on: false, months: 1, people: 20 });
    await expect(svc.setAnchorTrial({ on: 'yes' }, 'admin-1')).rejects.toThrow(BadRequestException);
  });
});
