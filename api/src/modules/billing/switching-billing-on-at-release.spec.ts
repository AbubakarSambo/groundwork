import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PricingService } from './pricing.service';
import { WhatsAppAddOnService } from './whatsapp-add-on.service';

/**
 * WHAT SWITCHING THE FREE TRIAL AND THE WHATSAPP ADD-ON ON DOES TO AN ORGANISATION THAT IS ALREADY HERE (decision 88).
 *
 * At release the free trial (`pricing.freeTrial`) and Plan and billing's new parts (`release.planAndBillingNewParts`)
 * are switched on. The trial's switch is also the add-on's: once it is on, decision 78's WhatsApp rules apply. The two
 * existing clients must not be charged, emailed, restarted or changed by surprise. This spec proves, for each shape an
 * existing organisation can have, what the switch does to it, and so why it is switched on by a release step after a
 * check (docs/deploy.md, "Switching billing on at release"), never by a migration that cannot look first.
 *
 * Every organisation here was made on 1 August 2026. The switch goes on at release, 6 October 2026. Today is 15 October.
 *
 * UPDATED 23 November 2026 (Hafsah, 22 November: "turn the switch on, nothing switch off from now on" and "there's nothing like
 * 10 free checkins"): the trial is on by default and is the only free plan. An organisation already here with no cover is no
 * longer kept on an old free plan; it is given the free trial once, the first time it needs cover, WhatsApp included.
 */
const NOW = new Date('2026-10-15T10:00:00Z');
const RELEASE = '2026-10-06T00:00:00Z';
const MADE = new Date('2026-08-01T09:00:00Z');

const PLAN_ROWS = () => [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5, whatsappAddOnCents: 2000, whatsappMonthlyLimit: 500, whatsappAddOnStripePriceId: null as string | null, whatsappPersonCents: 400 },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, whatsappAddOnCents: 7200, whatsappMonthlyLimit: 2000, whatsappAddOnStripePriceId: null as string | null, whatsappPersonCents: 400 },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null, whatsappAddOnCents: null, whatsappMonthlyLimit: null, whatsappAddOnStripePriceId: null as string | null },
];

const NOTHING = { subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null, whatsappAddOnOn: false, whatsappAddOnItemId: null };
const ON_THE_FREE_PLAN = { createdAt: MADE, ...NOTHING };
const ON_THE_HOUSE = { createdAt: MADE, ...NOTHING, freeUntil: new Date('2026-11-01T09:00:00Z'), freePlan: 'SMALL_TEAM' };
const ON_THE_HOUSE_ENDED = { createdAt: MADE, ...NOTHING, freeUntil: new Date('2026-10-01T09:00:00Z'), freePlan: 'SMALL_TEAM' };
const PAYING = { createdAt: MADE, ...NOTHING, subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionStripeId: 'sub_test_existing' };

function world(org: any, trial: any = { on: true, teamsUnder: 20, months: 1, onSince: RELEASE }) {
  const row: any = { id: 'org-existing', ...org };
  const plans = PLAN_ROWS();
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async () => ({ ...row })),
      findMany: jest.fn(async (q: any) => {
        /* The nightly sweep's own question, answered from the row. */
        const either = (row.whatsappAddOnOn && row.subscriptionStripeId) || row.whatsappAddOnItemId;
        return q?.where?.OR && either ? [{ id: row.id }] : [];
      }),
      update: jest.fn(async (q: any) => { Object.assign(row, q.data); return row; }),
      updateMany: jest.fn(async (q: any) => { if (row.freeTrialStartedAt) return { count: 0 }; Object.assign(row, q.data); return { count: 1 }; }),
    },
    ground: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    pricingPlan: {
      findMany: jest.fn(async () => plans),
      findUnique: jest.fn(async (q: any) => plans.find((p) => p.plan === q.where.plan)),
      update: jest.fn(async (q: any) => { Object.assign(plans.find((p) => p.plan === q.where.plan)!, q.data); return {}; }),
    },
    platformSetting: {
      findUnique: jest.fn(async (q: any) => {
        if (q.where.key === 'pricing.freeTrial') return { value: trial };
        if (q.where.key === 'pricing.freeMemberLimit') return { value: 5 };
        if (q.where.key === 'release.planAndBillingNewParts') return { value: { on: true } };
        return null;
      }),
    },
    whatsAppMonthlyUse: {
      findUnique: jest.fn(async () => ({ sent: 3, held: 0, adminToldAt: null })),
      upsert: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    user: { findMany: jest.fn(async () => [{ email: 'admin@existing.test', firstName: 'Ngozi' }]), count: jest.fn(async () => 6) },
  };
  const stripeCalls: any[] = [];
  const stripe: any = {
    isConfigured: true,
    stripe: {
      prices: { create: jest.fn(async (a: any) => { stripeCalls.push(['prices.create', a]); return { id: `price_test_wa_${a.metadata.plan}` }; }) },
      subscriptionItems: {
        create: jest.fn(async (a: any) => { stripeCalls.push(['items.create', a]); return { id: 'si_test_wa' }; }),
        retrieve: jest.fn(async () => ({ price: { id: 'price_test_wa_SMALL_TEAM' } })),
        update: jest.fn(async (id: string, a: any) => { stripeCalls.push(['items.update', id, a]); return {}; }),
        del: jest.fn(async (id: string) => { stripeCalls.push(['items.del', id]); return {}; }),
        createUsageRecord: jest.fn(async (id: string, a: any) => { stripeCalls.push(['usage', id, a]); return {}; }),
      },
    },
  };
  const emails: any[] = [];
  const email: any = { sendBillingChangeNotification: jest.fn(async (...a: any[]) => { emails.push(a); }) };
  const addOn = new WhatsAppAddOnService(prisma, new PricingService(prisma, stripe), stripe, email);
  return { row, addOn, stripeCalls, emails };
}

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('an existing client with no cover', () => {
  it('is given the free trial once, keeps WhatsApp, is charged nothing, is emailed nothing, and the nightly sweep never reaches Stripe', async () => {
    const { addOn, stripeCalls, emails, row } = world(ON_THE_FREE_PLAN) as any;
    expect(await addOn.mayWeSend('org-existing', NOW)).toEqual({ send: true });
    expect(row.freeTrialStartedAt).toBeInstanceOf(Date);
    expect(row.freePlan).toBe('SMALL_TEAM');
    const s = await addOn.standing('org-existing', NOW);
    expect(s).toMatchObject({ switchOn: true, inAFreeRun: true, charged: false, heldBecause: null });
    expect(s).not.toHaveProperty('onTheFreePlan');
    await addOn.syncEveryLine(NOW);
    expect(stripeCalls).toEqual([]);
    expect(emails).toEqual([]);
  });
});

describe('an existing client in a free run Groundwork gave it', () => {
  it('keeps WhatsApp and is charged nothing during the run, and after it is given the free trial, once', async () => {
    const during = world(ON_THE_HOUSE);
    expect(await during.addOn.mayWeSend('org-existing', NOW)).toEqual({ send: true });
    expect((await during.addOn.standing('org-existing', NOW)).charged).toBe(false);
    const after = world(ON_THE_HOUSE_ENDED);
    expect(await after.addOn.standing('org-existing', NOW)).toMatchObject({ inAFreeRun: true, sending: true, charged: false });
    await after.addOn.syncEveryLine(NOW);
    expect(after.stripeCalls).toEqual([]);
  });
});

describe('an existing client that pays: why the switch is a release step after a check, never a blind migration', () => {
  it('without the add-on, its WhatsApp messages are held from the first message after the switch', async () => {
    const { addOn } = world(PAYING);
    const said = await addOn.mayWeSend('org-existing', NOW);
    expect(said).toMatchObject({ send: false, why: 'not turned on' });
    /* While the switch is off, the same organisation sends as today. */
    const off = world(PAYING, { on: false, teamsUnder: 20, months: 1 });
    expect(await off.addOn.mayWeSend('org-existing', NOW)).toEqual({ send: true });
  });

  it('with the add-on already on, the nightly sweep adds a charged line to its Stripe subscription', async () => {
    const { addOn, stripeCalls } = world({ ...PAYING, whatsappAddOnOn: true });
    await addOn.syncEveryLine(NOW);
    expect(stripeCalls.map((c) => c[0])).toContain('items.create');
    const off = world({ ...PAYING, whatsappAddOnOn: true }, { on: false, teamsUnder: 20, months: 1 });
    await off.addOn.syncEveryLine(NOW);
    expect(off.stripeCalls).toEqual([]);
  });
});

describe('the trial is given by the cover reads, never by a cron or a migration', () => {
  it('billing and WhatsApp give it, through the trial service, and nothing gives it on a schedule', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'the-free-trial.service.ts'), 'utf8'));
    expect(src).toMatch(/@OnEvent\(GroundworkEvents\.ORG_SIZE_SAID\)\s*\n\s*async whenTheySayTheirSize/);
    expect(src).not.toMatch(/@Cron\(/);
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.ts') && !f.endsWith('.spec.ts') && /grantIfItApplies\(/.test(withoutComments(readFileSync(p, 'utf8')))) callers.push(f);
      }
    };
    walk(join(__dirname, '..', '..'));
    expect(callers.sort()).toEqual(['billing.service.ts', 'the-free-trial.service.ts', 'whatsapp-add-on.service.ts']);
  });
});
