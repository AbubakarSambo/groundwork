import { PricingService, PLAN_LABELS } from './pricing.service';
import { SubscriptionPlan } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * THE BOUNDARY WE CANNOT CROSS IN THIS REPO, VERIFIED UP TO IT.
 *
 * The new prices are seeded and every surface reads them, but nothing here can create the Stripe
 * Price objects: `STRIPE_SECRET_KEY` is the literal placeholder `sk_test_...` in .env, .env.bak and
 * .env.example alike, so Stripe answers "Invalid API Key provided". Wiring it is somebody else's
 * task and it needs a credential this repo does not contain.
 *
 * What that leaves worth testing is the code that runs the FIRST time a real key exists. It runs
 * during a customer's checkout, against live money, on a path nobody will have exercised. Each
 * property below is a way that call could quietly charge the wrong amount.
 */

function svc(row: any) {
  const updates: any[] = [];
  const created: any[] = [];
  const prisma = {
    pricingPlan: {
      findUnique: async () => row,
      update: async ({ data }: any) => { updates.push(data); return { ...row, ...data }; },
    },
  } as any;
  const stripe = {
    stripe: {
      products: { create: async (a: any) => { created.push(['product', a]); return { id: 'prod_new' }; } },
      prices: { create: async (a: any) => { created.push(['price', a]); return { id: 'price_new' }; } },
    },
  } as any;
  return { s: new PricingService(prisma, stripe), updates, created };
}

const SEEDED = { STARTER: 2500, SMALL_TEAM: 9000, GROWTH: 40000, BUSINESS: 90000, SCALE: 165000 };

describe('the amount handed to Stripe is the amount in the table', () => {
  for (const [plan, cents] of Object.entries(SEEDED)) {
    it(`${plan} creates a monthly USD price of exactly ${cents} cents`, async () => {
      const { s, created } = svc({ plan, amountCents: cents, memberCap: 5, stripePriceId: null, stripeProductId: 'prod_x' });
      const id = await s.getOrCreateStripePrice(plan as SubscriptionPlan);
      expect(id).toBe('price_new');

      const [, args] = created.find(([k]) => k === 'price')!;
      expect(args.unit_amount).toBe(cents);
      expect(args.currency).toBe('usd');
      expect(args.recurring).toEqual({ interval: 'month' });
      expect(args.metadata).toEqual({ plan });
    });
  }

  it('and the created price id is written back, so the next checkout reuses it', async () => {
    const { s, updates } = svc({ plan: 'SCALE', amountCents: 165000, stripePriceId: null, stripeProductId: 'prod_x' });
    await s.getOrCreateStripePrice(SubscriptionPlan.SCALE);
    expect(updates[updates.length - 1]).toMatchObject({ stripePriceId: 'price_new', stripeProductId: 'prod_x' });
  });

  it('a cached price is returned WITHOUT calling Stripe at all', async () => {
    /** Stripe Prices are immutable, so re-creating one per checkout would litter the account. */
    const { s, created } = svc({ plan: 'SCALE', amountCents: 165000, stripePriceId: 'price_cached' });
    expect(await s.getOrCreateStripePrice(SubscriptionPlan.SCALE)).toBe('price_cached');
    expect(created).toHaveLength(0);
  });

  it('a changed amount creates a NEW price rather than editing the old one', async () => {
    /**
     * This is what the step-3 migration set up: it cleared `stripe_price_id` on all four changed
     * plans, so the next checkout mints a price at the NEW amount. Had it not, checkout would have
     * charged the old price from a row that reads like the new one.
     */
    const { s, created } = svc({ plan: 'GROWTH', amountCents: 40000, stripePriceId: null, stripeProductId: 'prod_growth' });
    await s.getOrCreateStripePrice(SubscriptionPlan.GROWTH);
    const [, args] = created.find(([k]) => k === 'price')!;
    expect(args.unit_amount).toBe(40000);
    expect(args.product).toBe('prod_growth');
  });

  it('the Product is created once and reused, not once per price', async () => {
    const { s, created, updates } = svc({ plan: 'BUSINESS', amountCents: 90000, stripePriceId: null, stripeProductId: null });
    await s.getOrCreateStripePrice(SubscriptionPlan.BUSINESS);
    expect(created.filter(([k]) => k === 'product')).toHaveLength(1);
    expect(updates[updates.length - 1]).toMatchObject({ stripeProductId: 'prod_new' });
  });

  it('and the Product name carries no seat cap, because that name reaches the invoice', async () => {
    /**
     * `Groundwork ${PLAN_LABELS[plan]}` becomes the Stripe Product name. The labels used to read
     * "Scale (up to 1,000 people)", so a cap changed in the database would have left the old
     * number printed on a customer's invoice, where nothing in this codebase could see it.
     */
    const { s, created } = svc({ plan: 'SCALE', amountCents: 165000, stripePriceId: null, stripeProductId: null });
    await s.getOrCreateStripePrice(SubscriptionPlan.SCALE);
    const [, args] = created.find(([k]) => k === 'product')!;
    expect(args.name).toBe('Groundwork Scale');
    expect(args.name).not.toMatch(/\d/);
    expect(PLAN_LABELS.SCALE).toBe('Scale');
  });
});

describe('what must never reach Stripe', () => {
  it('ENTERPRISE is refused instead of becoming a price of zero', async () => {
    /**
     * The failure this closes. `amountCents` is null for a contact-sales plan, and Stripe accepts
     * `unit_amount: 0` happily - a live subscription charging nothing, created by a checkout that
     * looked to everyone like it worked.
     */
    const { s, created } = svc({ plan: 'ENTERPRISE', amountCents: null, memberCap: null, stripePriceId: null });
    await expect(s.getOrCreateStripePrice(SubscriptionPlan.ENTERPRISE)).rejects.toThrow(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('and the refusal explains itself in plain words', async () => {
    const { s } = svc({ plan: 'ENTERPRISE', amountCents: null, stripePriceId: null });
    await expect(s.getOrCreateStripePrice(SubscriptionPlan.ENTERPRISE))
      .rejects.toThrow(/no self-serve price.*contacting us/i);
  });

  it('a plan with no row at all is refused too, rather than defaulting to something', async () => {
    const { s, created } = svc(null);
    await expect(s.getOrCreateStripePrice(SubscriptionPlan.STARTER)).rejects.toThrow(NotFoundException);
    expect(created).toHaveLength(0);
  });
});
