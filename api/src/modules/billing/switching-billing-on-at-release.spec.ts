import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PricingService, freePlanApplies } from './pricing.service';
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
 */
const NOW = new Date('2026-10-15T10:00:00Z');
const RELEASE = '2026-10-06T00:00:00Z';
const MADE = new Date('2026-08-01T09:00:00Z');

const PLAN_ROWS = () => [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5, whatsappAddOnCents: 2000, whatsappMonthlyLimit: 500, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, whatsappAddOnCents: 7200, whatsappMonthlyLimit: 2000, whatsappAddOnStripePriceId: null as string | null },
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
    },
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
    user: { findMany: jest.fn(async () => [{ email: 'admin@existing.test', firstName: 'Ngozi' }]) },
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
      },
    },
  };
  const emails: any[] = [];
  const email: any = { sendBillingChangeNotification: jest.fn(async (...a: any[]) => { emails.push(a); }) };
  const addOn = new WhatsAppAddOnService(prisma, new PricingService(prisma, stripe), stripe, email);
  return { row, addOn, stripeCalls, emails };
}

const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('an existing client on the free plan', () => {
  it('keeps WhatsApp, is charged nothing, is emailed nothing, and the nightly sweep never reaches Stripe', async () => {
    const { addOn, stripeCalls, emails } = world(ON_THE_FREE_PLAN);
    expect(await addOn.mayWeSend('org-existing', NOW)).toEqual({ send: true });
    const s = await addOn.standing('org-existing', NOW);
    expect(s).toMatchObject({ switchOn: true, onTheFreePlan: true, charged: false, heldBecause: null });
    await addOn.syncEveryLine(NOW);
    expect(stripeCalls).toEqual([]);
    expect(emails).toEqual([]);
  });

  it('keeps the free plan after release, while a team made after the switch does not', () => {
    const trial = { on: true, teamsUnder: 20, months: 1, onSince: RELEASE };
    expect(freePlanApplies(trial, MADE)).toBe(true);
    expect(freePlanApplies(trial, new Date('2026-10-07T09:00:00Z'))).toBe(false);
  });
});

describe('an existing client in a free run Groundwork gave it', () => {
  it('keeps WhatsApp and is charged nothing during the run, and keeps the free plan after it', async () => {
    const during = world(ON_THE_HOUSE);
    expect(await during.addOn.mayWeSend('org-existing', NOW)).toEqual({ send: true });
    expect((await during.addOn.standing('org-existing', NOW)).charged).toBe(false);
    const after = world(ON_THE_HOUSE_ENDED);
    expect(await after.addOn.standing('org-existing', NOW)).toMatchObject({ onTheFreePlan: true, sending: true, charged: false });
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

describe('the switch itself gives nothing to anybody already here', () => {
  it('the trial is given only when somebody says their team size, never by the switch, a cron or a migration', () => {
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
    expect(callers).toEqual(['the-free-trial.service.ts']);
  });

  it('a switch written on without the moment it went on ends the free plan for nobody, not even a new team', () => {
    /* Which is why it is switched on at Admin, System, Pricing (or with `onSince` written), never as a bare {"on": true}. */
    expect(freePlanApplies({ on: true, teamsUnder: 20, months: 1 } as any, new Date('2026-10-07T09:00:00Z'))).toBe(true);
  });
});
