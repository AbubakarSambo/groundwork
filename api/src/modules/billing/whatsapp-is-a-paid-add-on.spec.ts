import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PricingService, WHATSAPP_ADD_ON_KIND } from './pricing.service';
import { WhatsAppAddOnService, WHATSAPP_NOT_TURNED_ON } from './whatsapp-add-on.service';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AdminController } from '../admin/admin.controller';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * WHATSAPP IS A PAID ADD-ON, WITH A MONTHLY LIMIT (decision 78, 2 October 2026).
 *
 * Baridi Appliances. Grace is its admin; Miriam takes part; Wairimu leads. Ama is one of Groundwork's
 * own staff, a platform admin. Today is 15 October 2026.
 *
 * Read as each reader: the platform admin who sets the prices and limits; Grace, who turns WhatsApp
 * on and reads its price, its use and the trial on Plan and billing; Miriam, who is told why her
 * check-in stays in the app. And as each kind of organisation: in its free trial, after its trial
 * without the add-on, with the add-on, and at the limit.
 */
const NOW = new Date('2026-10-15T10:00:00Z');
const SWITCHED_ON = '2026-09-01T00:00:00Z';

const PLAN_ROWS = () => [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5, whatsappAddOnCents: 2000, whatsappMonthlyLimit: 500, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, whatsappAddOnCents: 7200, whatsappMonthlyLimit: 2000, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100, whatsappAddOnCents: 32000, whatsappMonthlyLimit: 10000, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'BUSINESS', amountCents: 90000, memberCap: 250, whatsappAddOnCents: 72000, whatsappMonthlyLimit: 25000, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'SCALE', amountCents: 165000, memberCap: 500, whatsappAddOnCents: 132000, whatsappMonthlyLimit: 50000, whatsappAddOnStripePriceId: null as string | null },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null, whatsappAddOnCents: null, whatsappMonthlyLimit: null, whatsappAddOnStripePriceId: null as string | null },
];

const IN_ITS_TRIAL = {
  createdAt: new Date('2026-10-01T09:00:00Z'), subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null,
  freeUntil: new Date('2026-11-01T09:00:00Z'), freePlan: 'SMALL_TEAM', freeTrialStartedAt: new Date('2026-10-01T09:00:00Z'),
  whatsappAddOnOn: false, whatsappAddOnItemId: null,
};
const PAYING = {
  createdAt: new Date('2026-09-01T09:00:00Z'), subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionStripeId: 'sub_test_baridi',
  freeUntil: new Date('2026-10-01T09:00:00Z'), freePlan: 'SMALL_TEAM', freeTrialStartedAt: new Date('2026-09-01T09:00:00Z'),
  whatsappAddOnOn: false, whatsappAddOnItemId: null,
};

function world(opts: { trial?: any; org?: any; sent?: number; stripeConfigured?: boolean } = {}) {
  const org: any = { id: 'org-baridi', ...(opts.org ?? PAYING) };
  const plans = PLAN_ROWS();
  const use: any = opts.sent === undefined ? null : { organizationId: 'org-baridi', month: '2026-10', sent: opts.sent, held: 0, adminToldAt: null };
  const uses: any = { row: use };
  const trial = opts.trial ?? { on: true, teamsUnder: 20, months: 1, onSince: SWITCHED_ON };
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async () => ({ ...org })),
      findMany: jest.fn(async () => [{ id: org.id }]),
      update: jest.fn(async (q: any) => { Object.assign(org, q.data); return org; }),
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
        /* The add-on's price, use and limit are hidden at release; this spec proves them, so they are turned on here. */
        if (q.where.key === 'release.planAndBillingNewParts') return { value: { on: true } };
        return null;
      }),
    },
    whatsAppMonthlyUse: {
      findUnique: jest.fn(async () => (uses.row ? { ...uses.row } : null)),
      upsert: jest.fn(async (q: any) => {
        if (!uses.row) uses.row = { ...q.create, sent: q.create.sent ?? 0, held: q.create.held ?? 0, adminToldAt: null };
        else {
          if (q.update.sent) uses.row.sent += 1;
          if (q.update.held) uses.row.held += 1;
        }
        return uses.row;
      }),
      updateMany: jest.fn(async (q: any) => {
        if (uses.row && uses.row.adminToldAt === null && q.where.adminToldAt === null) { uses.row.adminToldAt = q.data.adminToldAt; return { count: 1 }; }
        return { count: 0 };
      }),
    },
    user: { findMany: jest.fn(async () => [{ email: 'grace@baridi.test', firstName: 'Grace' }]) },
  };
  const stripeCalls: any[] = [];
  const stripe: any = {
    isConfigured: opts.stripeConfigured ?? true,
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
  const email: any = { sendBillingChangeNotification: jest.fn(async (to: string, name: string, what: string) => { emails.push({ to, name, what }); }) };
  const pricing = new PricingService(prisma, stripe);
  const addOn = new WhatsAppAddOnService(prisma, pricing, stripe, email);
  return { org, plans, uses, prisma, stripe, stripeCalls, emails, pricing, addOn };
}

describe('the prices and limits a fresh database ends with', () => {
  it('are about 80% of each plan, with a monthly limit, and none for Enterprise', () => {
    const DIR = join(__dirname, '../../../prisma/migrations');
    const table: Record<string, { cents: number | null; limit: number | null }> = {};
    for (const dir of readdirSync(DIR).filter((d) => !d.endsWith('.toml')).sort()) {
      let sql: string;
      try { sql = readFileSync(join(DIR, dir, 'migration.sql'), 'utf8'); } catch { continue; }
      sql = sql.replace(/--.*$/gm, '');
      for (const up of sql.matchAll(/UPDATE "pricing_plans" SET ([^;]*?) WHERE "plan" = '(\w+)';/g)) {
        for (const set of up[1].matchAll(/"(\w+)" = (NULL|\d+)/g)) {
          table[up[2]] = table[up[2]] ?? { cents: null, limit: null };
          if (set[1] === 'whatsapp_add_on_cents') table[up[2]].cents = set[2] === 'NULL' ? null : Number(set[2]);
          if (set[1] === 'whatsapp_monthly_limit') table[up[2]].limit = set[2] === 'NULL' ? null : Number(set[2]);
        }
      }
    }
    const got = Object.fromEntries(Object.entries(table).filter(([, v]) => v.cents !== null || v.limit !== null));
    expect(got).toEqual({
      STARTER: { cents: 2000, limit: 500 },
      SMALL_TEAM: { cents: 7200, limit: 2000 },
      GROWTH: { cents: 32000, limit: 10000 },
      BUSINESS: { cents: 72000, limit: 25000 },
      SCALE: { cents: 132000, limit: 50000 },
    });
  });

  it('the free trial row becomes one month and its switch is left alone', () => {
    const sql = readFileSync(join(__dirname, '../../../prisma/migrations/20261002160000_whatsapp_is_a_paid_add_on/migration.sql'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(sql).toMatch(/'pricing\.freeTrial', '\{"on": false, "teamsUnder": 20, "months": 1\}'/);
    expect(sql).toMatch(/ON CONFLICT \("key"\) DO UPDATE SET "value" = jsonb_set\("platform_settings"\."value", '\{months\}', '1'\)/);
  });
});

describe('Ama, a platform admin, sets the add-on price and the limit the way she sets a plan price', () => {
  function admin() {
    const w = world();
    const c = new AdminController({} as any, {} as any, w.pricing, {} as any, {} as any, {} as any);
    return { c, ...w };
  }

  it('the route is for Groundwork’s own staff only', () => {
    expect(new Reflector().get('__guards__', AdminController)).toContain(PlatformAdminGuard);
  });

  it('a new add-on price clears the cached Stripe price, and the limit changes nothing in Stripe', async () => {
    const { c, plans } = admin();
    plans.find((p) => p.plan === 'GROWTH')!.whatsappAddOnStripePriceId = 'price_test_old';
    await c.setPricing('GROWTH', { whatsappAddOnCents: 30000, whatsappMonthlyLimit: 12000 });
    expect(plans.find((p) => p.plan === 'GROWTH')).toMatchObject({ whatsappAddOnCents: 30000, whatsappMonthlyLimit: 12000, whatsappAddOnStripePriceId: null });
  });

  it('the plans she reads carry the add-on price and the limit', async () => {
    const { pricing } = admin();
    const small = (await pricing.listPlans()).find((p) => p.plan === 'SMALL_TEAM');
    expect(small).toMatchObject({ whatsappAddOnCents: 7200, whatsappMonthlyLimit: 2000 });
  });

  it('a price Stripe would refuse, or a limit that is not a count, is refused with a sentence', async () => {
    const { c } = admin();
    await expect(c.setPricing('GROWTH', { whatsappAddOnCents: 10 })).rejects.toThrow(BadRequestException);
    await expect(c.setPricing('GROWTH', { whatsappMonthlyLimit: -1 })).rejects.toThrow(BadRequestException);
    await expect(c.setPricing('GROWTH', { whatsappMonthlyLimit: 1.5 })).rejects.toThrow(/whole number of messages/);
  });
});

describe('only an admin of the organisation turns WhatsApp on, held by the server', () => {
  const guard = new RolesGuard(new Reflector());
  const ctx = (role: string) => ({
    getHandler: () => (BillingController.prototype as any).turnWhatsApp,
    getClass: () => BillingController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: `u-${role}`, organizationId: 'org-baridi', role } }) }),
  }) as any;

  it('Grace, an admin, may', () => expect(guard.canActivate(ctx('ADMIN'))).toBe(true));
  it('Wairimu, a lead, and Miriam, who takes part, may not', () => {
    expect(() => guard.canActivate(ctx('LEAD'))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx('MEMBER'))).toThrow(ForbiddenException);
  });
});

describe('while the free trial’s switch is off, which is how it ships', () => {
  it('nothing is held and nothing is charged, even for an organisation that pays without the add-on', async () => {
    const { addOn, stripeCalls } = world({ trial: { on: false, teamsUnder: 20, months: 1 } });
    expect(await addOn.mayWeSend('org-baridi', NOW)).toEqual({ send: true });
    await addOn.turn('org-baridi', true, NOW);
    expect(stripeCalls).toEqual([]);
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.charged).toBe(false);
    expect(read.says.charge).toBe('Nothing is charged for WhatsApp at the moment.');
  });
});

describe('Baridi in its free trial', () => {
  it('WhatsApp goes, nothing is charged, and Grace reads the month and the page names the end of the trial only once', async () => {
    const { addOn, stripeCalls } = world({ org: { ...IN_ITS_TRIAL, whatsappAddOnOn: true } });
    expect(await addOn.mayWeSend('org-baridi', NOW)).toEqual({ send: true });
    await addOn.syncTheStripeLine('org-baridi', NOW);
    expect(stripeCalls).toEqual([]);
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.freeTrial).toEqual({ months: 1, endsOn: new Date('2026-11-01T09:00:00Z') });
    expect(read.says).toEqual({
      onOrOff: 'WhatsApp is on for your organisation.',
      price: 'WhatsApp costs $72 a month on your Small Team plan.',
      charge: 'Your free trial lasts 1 month. Nothing is charged for WhatsApp until it ends.',
      /* One date on the page: the sentence names no day, so it cannot disagree with the plan line (clean-install run, 6 October). */
      use: 'Your organisation has sent 0 of its 2,000 WhatsApp messages this month.',
      atTheLimit: 'If your organisation sends all 2,000 messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once.',
      reachedTheLimit: null,
      held: null,
    });
  });
});

describe('Baridi after its trial, paying for Small Team, without the add-on', () => {
  it('a WhatsApp message is not sent, and Miriam reads why in the app', async () => {
    const { addOn } = world();
    expect(await addOn.mayWeSend('org-baridi', NOW)).toEqual({ send: false, why: 'not turned on', saying: WHATSAPP_NOT_TURNED_ON });
    expect(await addOn.whatTheyRead('org-baridi', false, NOW)).toEqual({
      sending: false,
      says: 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.',
    });
  });

  it('Miriam is served the sentence and nothing about the price, the use or the limit', async () => {
    const { addOn } = world({ sent: 120 });
    const read = await addOn.whatTheyRead('org-baridi', false, NOW);
    expect(JSON.stringify(read)).not.toMatch(/\$72|2,000|120|7200|price|limit/);
  });

  it('Grace reads that it is off, what it would cost, and that it goes on the monthly bill', async () => {
    const { addOn } = world();
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.on).toBe(false);
    expect(read.price).toEqual({ amountCents: 7200, currency: 'USD' });
    expect(read.says.onOrOff).toBe('WhatsApp is off for your organisation, so check-ins stay in the app.');
    expect(read.says.charge).toBe('If you turn WhatsApp on, it is added to your monthly bill as a second line.');
    expect(read.says.held).toBe(WHATSAPP_NOT_TURNED_ON);
  });

  it('the WhatsApp service sends nothing, and records the sentence the person reads', async () => {
    const { addOn, prisma, uses } = world();
    const sends: any[] = [];
    prisma.whatsAppSend = { create: jest.fn(async (q: any) => { sends.push(q.data); return {}; }) };
    prisma.notification = { create: jest.fn(async () => ({})) };
    /* Changed 2 October (decision 82, item 4): somebody who wrote in the last 24 hours is now told once
       why. This person last wrote three days ago, so nothing at all can go to them. */
    prisma.person = { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 3 * 86_400_000) })) };
    prisma.whatsAppConnection = { findUnique: jest.fn(async () => ({ id: 'c1', enabled: true, phoneNumberId: '123456', accessToken: 'test-token' })) };
    const realFetch = (global as any).fetch;
    const fetchSpy = jest.fn(async () => ({ ok: true, status: 200 }));
    (global as any).fetch = fetchSpy;
    const wa = new WhatsAppService({ get: () => undefined } as any, prisma, addOn);
    const got = await wa.sendFor('org-baridi', '+254700000001', 'Your check-in is open.', { checkInId: 'ci-1', kind: 'checkin-open' });
    expect(got).toEqual({ sent: false, error: WHATSAPP_NOT_TURNED_ON });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sends[0]).toMatchObject({ organizationId: 'org-baridi', kind: 'checkin-open:held', error: WHATSAPP_NOT_TURNED_ON });
    expect(uses.row.held).toBe(1);
    (global as any).fetch = realFetch;
  });
});

describe('Grace turns the add-on on, after the trial, on a paid plan', () => {
  it('the add-on becomes a second monthly line on the Stripe subscription, at its own price, created once', async () => {
    const { addOn, org, stripeCalls, plans } = world();
    await addOn.turn('org-baridi', true, NOW);
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(stripeCalls.map((c) => c[0])).toEqual(['prices.create', 'items.create']);
    expect(stripeCalls[0][1]).toMatchObject({ unit_amount: 7200, currency: 'usd', recurring: { interval: 'month' }, metadata: { plan: 'SMALL_TEAM', kind: WHATSAPP_ADD_ON_KIND } });
    expect(stripeCalls[1][1]).toMatchObject({ subscription: 'sub_test_baridi', price: 'price_test_wa_SMALL_TEAM', quantity: 1 });
    expect(plans.find((p) => p.plan === 'SMALL_TEAM')!.whatsappAddOnStripePriceId).toBe('price_test_wa_SMALL_TEAM');
    expect(org.whatsappAddOnItemId).toBe('si_test_wa');
    expect(read.charged).toBe(true);
    expect(read.says.charge).toBe('WhatsApp is added to your monthly bill as a second line.');

    /* Again, nothing new: the price is cached and the line is already there. */
    stripeCalls.length = 0;
    expect(await addOn.syncTheStripeLine('org-baridi', NOW)).toBe('unchanged');
    expect(stripeCalls).toEqual([]);
  });

  it('turned off again, the line comes off', async () => {
    const { addOn, org, stripeCalls } = world({ org: { ...PAYING, whatsappAddOnOn: true, whatsappAddOnItemId: 'si_test_wa' } });
    await addOn.turn('org-baridi', false, NOW);
    expect(stripeCalls).toEqual([['items.del', 'si_test_wa']]);
    expect(org.whatsappAddOnItemId).toBeNull();
  });

  it('with no Stripe key, nothing reaches Stripe', async () => {
    const { addOn, stripeCalls } = world({ stripeConfigured: false });
    await addOn.turn('org-baridi', true, NOW);
    expect(stripeCalls).toEqual([]);
  });

  it('messages go, and each one counts towards the month', async () => {
    const { addOn, uses } = world({ org: { ...PAYING, whatsappAddOnOn: true }, sent: 10 });
    expect(await addOn.mayWeSend('org-baridi', NOW)).toEqual({ send: true });
    await addOn.countSent('org-baridi', NOW);
    expect(uses.row.sent).toBe(11);
  });

  it('a plan change moves the plan’s own line, never the add-on’s', async () => {
    const { org, prisma, stripe } = world({ org: { ...PAYING, whatsappAddOnOn: true, whatsappAddOnItemId: 'si_test_wa' } });
    const updates: any[] = [];
    stripe.ensureCustomer = jest.fn();
    stripe.stripe.subscriptions = {
      retrieve: jest.fn(async () => ({ items: { data: [{ id: 'si_test_wa', price: { metadata: { kind: WHATSAPP_ADD_ON_KIND } } }, { id: 'si_test_plan', price: { metadata: { plan: 'SMALL_TEAM' } } }] } })),
      update: jest.fn(async (_id: string, a: any) => { updates.push(a); return { current_period_end: null }; }),
    };
    const pricing: any = { getOrCreateStripePrice: async () => 'price_test_growth' };
    const billing = new BillingService(prisma, stripe, pricing, {} as any, { sendBillingChangeNotification: async () => undefined } as any, {} as any);
    prisma.organization.findUnique = jest.fn(async () => ({ ...org, id: 'org-baridi' }));
    await billing.changeSubscriptionPlan('org-baridi', 'GROWTH' as any);
    expect(updates[0].items).toEqual([{ id: 'si_test_plan', price: 'price_test_growth' }]);
  });
});

describe('Baridi at its monthly limit', () => {
  it('nothing more is sent, Miriam reads why and when it starts again, and Grace is told once', async () => {
    const { addOn, emails } = world({ org: { ...PAYING, whatsappAddOnOn: true }, sent: 2000 });
    const may = await addOn.mayWeSend('org-baridi', NOW);
    expect(may).toEqual({
      send: false,
      why: 'at the limit',
      saying: 'Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on 1 November 2026.',
    });
    await addOn.countHeld('org-baridi', 'at the limit', NOW);
    await addOn.countHeld('org-baridi', 'at the limit', NOW);
    expect(emails).toEqual([{
      to: 'grace@baridi.test',
      name: 'Grace',
      what: 'Your organisation has used all 2,000 of its WhatsApp messages for October. Nothing more is sent by WhatsApp until 1 November 2026. Check-ins carry on in the app, so nobody misses one.',
    }]);
    const grace: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(grace.says.use).toBe('Your organisation has sent 2,000 of its 2,000 WhatsApp messages this month.');
    expect(grace.says.reachedTheLimit).toMatch(/^Your organisation has used all 2,000 of its WhatsApp messages for October\./);
    expect(await addOn.whatTheyRead('org-baridi', false, NOW)).toEqual({ sending: false, says: may.send ? null : may.saying });
  });

  it('a new month starts again from nothing', async () => {
    const { addOn } = world({ org: { ...PAYING, whatsappAddOnOn: true }, sent: 2000 });
    (addOn as any).prisma.whatsAppMonthlyUse.findUnique = jest.fn(async (q: any) => (q.where.organizationId_month.month === '2026-11' ? null : { sent: 2000 }));
    expect(await addOn.mayWeSend('org-baridi', new Date('2026-11-01T00:00:01Z'))).toEqual({ send: true });
  });
});

describe('an organisation still on the free plan, made before the switch', () => {
  it('keeps WhatsApp as today, with nothing charged, under the limit of the plan its size fits', async () => {
    const before = {
      createdAt: new Date('2026-08-01T09:00:00Z'), subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null,
      freeUntil: null, freePlan: null, freeTrialStartedAt: null, whatsappAddOnOn: false, whatsappAddOnItemId: null,
    };
    const { addOn } = world({ org: before, sent: 3 });
    expect(await addOn.mayWeSend('org-baridi', NOW)).toEqual({ send: true });
    const read: any = await addOn.whatTheyRead('org-baridi', true, NOW);
    expect(read.says.charge).toBe('Nothing is charged for WhatsApp while you are on the free plan.');
    expect(read.use).toMatchObject({ sent: 3, limit: 500 });
    /* No plan is named to an organisation on the free plan (release blocker, 5 October). */
    expect(read.plan).toBeNull();
    expect(read.price).toBeNull();
    expect(read.says.price).toBeNull();
    expect(JSON.stringify(read)).not.toMatch(/Starter|STARTER|\$20/);
  });
});

describe('a lead or a person in a check-in, in a free trial with WhatsApp off (screens gap, 5 October)', () => {
  it('Wairimu and Miriam read that it is off and why no reminder comes, where they were served nothing to say', async () => {
    const { addOn } = world({ org: IN_ITS_TRIAL });
    expect(await addOn.whatTheyRead('org-baridi', false, NOW)).toEqual({
      sending: true,
      says: 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.',
    });
  });

  it('with it turned on they read that it is on and nothing more', async () => {
    const { addOn } = world({ org: { ...IN_ITS_TRIAL, whatsappAddOnOn: true } });
    expect(await addOn.whatTheyRead('org-baridi', false, NOW)).toEqual({ sending: true, says: null });
  });
});
