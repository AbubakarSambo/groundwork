import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { SubscriptionPlan } from '@prisma/client';

/**
 * The plan NAMES, and only the names.
 *
 * These read "Starter (up to 5 people)" and so on, which made them a fourth copy of the seat
 * caps - one that reached Stripe, since the Product is created as `Groundwork ${label}`. A cap
 * changed in the database would have left the old number in the plan name on the invoice.
 * The cap now comes from `pricing_plans.memberCap` wherever it is shown.
 */
export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.STARTER]: 'Starter',
  [SubscriptionPlan.SMALL_TEAM]: 'Small Team',
  [SubscriptionPlan.GROWTH]: 'Growth',
  [SubscriptionPlan.BUSINESS]: 'Business',
  [SubscriptionPlan.SCALE]: 'Scale',
  [SubscriptionPlan.ENTERPRISE]: 'Enterprise',
};

/**
 * Subscription prices live in the pricing_plans table, edited at Admin -> System
 * -> Pricing, not in code or env vars. A Stripe Price is immutable once created,
 * so this only ever creates a NEW Price when the DB amount has no cached price id
 * (admin.service clears stripePriceId whenever amountCents changes) - it never
 * edits one in place. The Stripe Product is created once per plan and reused.
 */
/**
 * The free-ground limit does not belong in `pricing_plans` - that table is keyed by plan and this
 * is one number for the whole platform - so it sits in `platform_settings`, beside the WhatsApp
 * toggle. It was a hardcoded 10 in the API and another hardcoded 10 in the client, plus the words
 * "10 Grounds" written out across three builds.
 */
export const FREE_GROUND_LIMIT_KEY = 'pricing.freeGroundLimit';
export const DEFAULT_FREE_GROUND_LIMIT = 10;
export const MAX_FREE_GROUND_LIMIT = 1000;

/**
 * How many people a free organisation may have. Beside the ground limit because it is the same
 * decision - what the free tier is worth - and the same shape: one number for the whole platform,
 * so it belongs in `platform_settings` rather than in `pricing_plans`, which is keyed by plan.
 *
 * The count INCLUDES the person who created the account, on both the account gate and the
 * per-check-in cap. Five means them plus four others, and every message that quotes the number
 * has to say so, because "5 people" reads as "5 people I can invite".
 */
/** What the admin is told when a price changes: the public page does not follow. */
export const THE_SITE_IS_NOW_OUT_OF_STEP = (plan: string, amountCents: number) =>
  `${plan} is now ${(amountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} a month here; the public pricing page still shows the figure it was built with until the site is rebuilt.`;

export const FREE_MEMBER_LIMIT_KEY = 'pricing.freeMemberLimit';
export const DEFAULT_FREE_MEMBER_LIMIT = 5;
export const MAX_FREE_MEMBER_LIMIT = 1000;

/**
 * THE FREE TRIAL: TEAMS UNDER 20 PEOPLE, FREE FOR ONE MONTH. Hafsah's decision of 26 September,
 * shortened from three months to one by decision 78 (2 October).
 *
 * The numbers live here, in the database, and every screen builds its sentence from them, so no
 * screen can say a different number. The same setting decides whether billing GRANTS the trial
 * (the-free-trial.service.ts, U.19), so the sentence and the grant are switched on and off together.
 * It is off by default. A promise on a screen that billing does not keep is the thing this exists to
 * prevent.
 */
export const FREE_TRIAL_KEY = 'pricing.freeTrial';
/** What the WhatsApp add-on's Stripe Prices are marked with, so its subscription line is never mistaken for the plan's. */
export const WHATSAPP_ADD_ON_KIND = 'whatsapp-add-on';
/**
 * `onSince` is when the setting was last switched on. Kept on the server only (never on the public
 * read): it is what tells an organisation that was already on the free plan from a new one.
 */
export interface FreeTrial { on: boolean; teamsUnder: number; months: number; onSince?: string }
export const DEFAULT_FREE_TRIAL: FreeTrial = { on: false, teamsUnder: 20, months: 1 };

/**
 * THE ANCHOR'S OWN TRIAL (anchor piece 34; decision 96 item 3). "One-month free trial, up to 20 people", where the 20
 * do not include the lead (decision 121, item 4), so the plan that covers it holds 21 seats. Its own
 * setting, so `pricing.freeTrial` and the paid client are untouched. Off unless the row says `{ "on": true }`.
 */
export const ANCHOR_TRIAL_KEY = 'pricing.anchorTrial';
export interface AnchorTrial { on: boolean; months: number; people: number }
export const DEFAULT_ANCHOR_TRIAL: AnchorTrial = { on: false, months: 1, people: 20 };

/**
 * ONE SWITCH (Hafsah, 27 September). While the free trial is OFF, which is how it ships, the free plan
 * is exactly as today: the free check-ins, the free people, the free extension and the first session
 * on the house. When it is switched ON, the trial for teams under its size starts, and the free plan
 * stops for every organisation created from that moment. Teams at or over the trial's size always pay.
 *
 * NOBODY IS CUT OFF. An organisation that existed before the switch keeps the free plan it has, even
 * after the switch. And anything unknown reads as "keeps it": a trial switched on with no record of
 * when, or an organisation with no creation date, is treated as already on the free plan, because the
 * wrong answer in that direction costs a month's fee and the wrong answer in the other stops somebody's
 * team mid check-in.
 */
export function freePlanApplies(trial: FreeTrial | null | undefined, orgCreatedAt: Date | string | null | undefined): boolean {
  if (!trial?.on) return true;
  if (!trial.onSince) return true;
  if (!orgCreatedAt) return true;
  const since = new Date(trial.onSince).getTime();
  const created = new Date(orgCreatedAt).getTime();
  if (Number.isNaN(since) || Number.isNaN(created)) return true;
  return created < since;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  async listPlans() {
    const rows = await this.prisma.pricingPlan.findMany({ orderBy: { plan: 'asc' } });
    return rows.map((r) => ({
      plan: r.plan,
      label: PLAN_LABELS[r.plan],
      amountCents: r.amountCents,
      /** Null means unlimited. The client renders the count without a ceiling rather than a number. */
      memberCap: r.memberCap,
      hasStripePrice: !!r.stripePriceId,
      /** WhatsApp, the paid add-on (decision 78): its monthly price on this plan, null where it is not sold by itself. */
      whatsappAddOnCents: r.whatsappAddOnCents ?? null,
      /** How many WhatsApp messages an organisation on this plan may send in a calendar month. Null means no limit. */
      whatsappMonthlyLimit: r.whatsappMonthlyLimit ?? null,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Everything a pricing surface needs, in ONE read.
   *
   * The plans and the free limits were two separate lookups reached through two endpoints, and
   * the client held its own copy of the free limit because there was nowhere to get it. A page
   * that has to make two requests to state one offer will eventually state half of it.
   */
  async publicPricing() {
    const [plans, groundLimit, memberLimit, trial, anchorTrial] = await Promise.all([
      this.listPlans(),
      this.getFreeGroundLimit(),
      this.getFreeMemberLimit(),
      this.getFreeTrial(),
      this.getAnchorTrial(),
    ]);
    /* The public read says whether the trial is on and its numbers, never when it was switched on. The anchor's trial
       is said beside it (anchor piece 34), so the anchor landing says "for a month" only while it is on. */
    return { plans, free: { groundLimit, memberLimit }, trial: { on: trial.on, teamsUnder: trial.teamsUnder, months: trial.months }, anchorTrial };
  }

  /** The anchor trial and whether it is on. Never throws: a bad or missing row is the default, which is off. Only `on` is read. */
  async getAnchorTrial(): Promise<AnchorTrial> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: ANCHOR_TRIAL_KEY } });
      const v = row?.value as Partial<AnchorTrial> | undefined;
      return { ...DEFAULT_ANCHOR_TRIAL, on: v?.on === true };
    } catch {
      return DEFAULT_ANCHOR_TRIAL;
    }
  }

  /** The trial's numbers and whether it is on. Never throws: a bad or missing row means the default, which is off. */
  async getFreeTrial(): Promise<FreeTrial> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: FREE_TRIAL_KEY } });
      const v = row?.value as Partial<FreeTrial> | undefined;
      if (
        v && typeof v.on === 'boolean' &&
        Number.isInteger(v.teamsUnder) && (v.teamsUnder as number) >= 2 && (v.teamsUnder as number) <= 10_000 &&
        Number.isInteger(v.months) && (v.months as number) >= 1 && (v.months as number) <= 24
      ) {
        const out: FreeTrial = { on: v.on, teamsUnder: v.teamsUnder as number, months: v.months as number };
        if (v.on && typeof v.onSince === 'string' && !Number.isNaN(new Date(v.onSince).getTime())) out.onSince = v.onSince;
        return out;
      }
    } catch (err) {
      this.logger.warn(`Could not read the free trial, so it is off: ${(err as Error)?.message}`);
    }
    return { ...DEFAULT_FREE_TRIAL };
  }

  async setFreeTrial(input: Partial<FreeTrial>, adminUserId: string): Promise<FreeTrial> {
    const now = await this.getFreeTrial();
    const next: FreeTrial = {
      on: typeof input.on === 'boolean' ? input.on : now.on,
      teamsUnder: input.teamsUnder !== undefined ? Number(input.teamsUnder) : now.teamsUnder,
      months: input.months !== undefined ? Number(input.months) : now.months,
    };
    /* When it is switched on, remember the moment: organisations created before it keep the free plan. */
    if (next.on) next.onSince = now.on && now.onSince ? now.onSince : new Date().toISOString();
    if (!Number.isInteger(next.teamsUnder) || next.teamsUnder < 2 || next.teamsUnder > 10_000) {
      throw new BadRequestException('The team size for the free trial must be a whole number between 2 and 10,000.');
    }
    if (!Number.isInteger(next.months) || next.months < 1 || next.months > 24) {
      throw new BadRequestException('The free trial must last a whole number of months between 1 and 24.');
    }
    await this.prisma.platformSetting.upsert({
      where: { key: FREE_TRIAL_KEY },
      create: { key: FREE_TRIAL_KEY, value: next as any, updatedBy: adminUserId },
      update: { value: next as any, updatedBy: adminUserId },
    });
    this.logger.log(`Free trial set to ${JSON.stringify(next)} by ${adminUserId}`);
    return next;
  }

  /**
   * SWITCH THE ANCHOR TRIAL ON OR OFF, from Admin → System → Pricing, as the free trial is (anchor piece 34). Only `on`
   * is set: the anchor trial is one month for up to 20 people besides the lead (decision 121 item 4; every free run is
   * one month, 5 October 2026), so its months and its size are not settings anybody can change here.
   */
  async setAnchorTrial(input: { on?: unknown }, adminUserId: string): Promise<AnchorTrial> {
    if (typeof input?.on !== 'boolean') throw new BadRequestException('Say whether the anchor trial is on or off.');
    const next: AnchorTrial = { ...DEFAULT_ANCHOR_TRIAL, on: input.on };
    await this.prisma.platformSetting.upsert({
      where: { key: ANCHOR_TRIAL_KEY },
      create: { key: ANCHOR_TRIAL_KEY, value: next as any, updatedBy: adminUserId },
      update: { value: next as any, updatedBy: adminUserId },
    });
    this.logger.log(`Anchor trial set to ${JSON.stringify(next)} by ${adminUserId}`);
    return next;
  }

  /** The seat cap for a plan, or null for unlimited. Throws for a plan with no row. */
  async memberCapFor(plan: SubscriptionPlan): Promise<number | null> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan }, select: { memberCap: true } });
    if (!row) throw new NotFoundException(`There is no ${String(plan).toLowerCase()} plan set up, so choose another plan.`);
    return row.memberCap;
  }

  /** Admin update: Stripe Prices are immutable, so a new amount invalidates the cached one. */
  async setAmountCents(plan: SubscriptionPlan, amountCents: number): Promise<void> {
    await this.prisma.pricingPlan.update({
      where: { plan },
      data: { amountCents, stripePriceId: null },
    });
    this.logger.log(`Pricing updated for plan ${plan}: ${amountCents} cents (cached Stripe price cleared)`);
    /*
     * THE PUBLIC SITE CANNOT SEE THIS. marketing/src/pages/pricing.astro carries the figures at build
     * time and is frozen, so from this moment the page and the table disagree until the site is
     * rebuilt with the new number. Said in the log and to the admin (fix plan A15, as corrected):
     * the drift cannot be prevented from here, only made impossible to miss.
     */
    this.logger.warn(THE_SITE_IS_NOW_OUT_OF_STEP(plan, amountCents));
  }

  /**
   * Admin update for the seat cap. Deliberately does NOT clear `stripePriceId`: the cap is not
   * part of what Stripe charges, so invalidating the cached price would create a new Stripe Price
   * for the same amount every time somebody adjusted a seat count.
   */
  async setMemberCap(plan: SubscriptionPlan, memberCap: number | null): Promise<void> {
    await this.prisma.pricingPlan.update({ where: { plan }, data: { memberCap } });
    this.logger.log(`Member cap for ${plan} set to ${memberCap === null ? 'unlimited' : memberCap}`);
  }

  /**
   * Admin update for the WhatsApp add-on's monthly price on a plan (decision 78). A Stripe Price is
   * immutable, so a new amount clears the cached add-on price, exactly as `setAmountCents` does.
   * Null takes the add-on off sale on this plan.
   */
  async setWhatsAppAddOnCents(plan: SubscriptionPlan, cents: number | null): Promise<void> {
    await this.prisma.pricingPlan.update({ where: { plan }, data: { whatsappAddOnCents: cents, whatsappAddOnStripePriceId: null } });
    this.logger.log(`WhatsApp add-on for ${plan} set to ${cents === null ? 'not sold' : `${cents} cents`} (cached Stripe price cleared)`);
  }

  /** Admin update for the plan's monthly WhatsApp limit. Null means no limit. Not part of any Stripe price. */
  async setWhatsAppMonthlyLimit(plan: SubscriptionPlan, limit: number | null): Promise<void> {
    await this.prisma.pricingPlan.update({ where: { plan }, data: { whatsappMonthlyLimit: limit } });
    this.logger.log(`WhatsApp monthly limit for ${plan} set to ${limit === null ? 'no limit' : limit}`);
  }

  /**
   * The Stripe Price for the WhatsApp add-on on a plan, created only when the database amount has no
   * cached price id, exactly as plan prices are. Stripe is used in test mode only until Hafsah says
   * otherwise (docs/deploy.md). Refuses a plan with no add-on price rather than charging zero.
   */
  async getOrCreateWhatsAppAddOnPrice(plan: SubscriptionPlan): Promise<string> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan } });
    if (!row) throw new NotFoundException(`There is no price set for the ${String(plan).toLowerCase()} plan yet, so choose another plan.`);
    if (row.whatsappAddOnStripePriceId) return row.whatsappAddOnStripePriceId;
    if (row.whatsappAddOnCents === null || row.whatsappAddOnCents === undefined) {
      throw new BadRequestException(`WhatsApp is not sold by itself on ${PLAN_LABELS[plan]}. This plan is arranged by contacting us.`);
    }
    const price = await this.stripe.stripe.prices.create({
      unit_amount: row.whatsappAddOnCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: `Groundwork WhatsApp on ${PLAN_LABELS[plan]}`, metadata: { plan, kind: WHATSAPP_ADD_ON_KIND } },
      metadata: { plan, kind: WHATSAPP_ADD_ON_KIND },
    });
    await this.prisma.pricingPlan.update({ where: { plan }, data: { whatsappAddOnStripePriceId: price.id } });
    this.logger.log(`Created Stripe price ${price.id} for the WhatsApp add-on on ${plan} (${row.whatsappAddOnCents} cents)`);
    return price.id;
  }

  /** Returns a live Stripe Price id for the plan, creating one lazily if the DB amount changed. */
  async getOrCreateStripePrice(plan: SubscriptionPlan): Promise<string> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan } });
    if (!row) throw new NotFoundException(`There is no price set for the ${String(plan).toLowerCase()} plan yet, so choose another plan.`);
    if (row.stripePriceId) return row.stripePriceId;
    /**
     * A contact-sales plan has no amount, and `unit_amount: null` would have created a Stripe
     * price of zero - a subscription that charges nothing, created by a checkout that looked
     * like it worked. Refusing is the only safe reading.
     */
    if (row.amountCents === null) {
      throw new BadRequestException(`${PLAN_LABELS[plan]} has no self-serve price. This plan is arranged by contacting us.`);
    }

    let productId = row.stripeProductId;
    if (!productId) {
      const product = await this.stripe.stripe.products.create({
        name: `Groundwork ${PLAN_LABELS[plan]}`,
        metadata: { plan },
      });
      productId = product.id;
    }

    const price = await this.stripe.stripe.prices.create({
      product: productId,
      unit_amount: row.amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan },
    });

    await this.prisma.pricingPlan.update({
      where: { plan },
      data: { stripeProductId: productId, stripePriceId: price.id },
    });
    this.logger.log(`Created Stripe price ${price.id} for plan ${plan} (${row.amountCents} cents)`);
    return price.id;
  }

  /**
   * The live free-ground limit, or the shipped default.
   *
   * Never throws. A missing or nonsense row must mean "the limit we shipped with", not zero - zero
   * would silently paywall every organisation on the platform, which is the most damaging possible
   * reading of a bad row.
   */
  async getFreeGroundLimit(): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: FREE_GROUND_LIMIT_KEY } });
      const v = row?.value;
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_FREE_GROUND_LIMIT) return v;
    } catch (err) {
      this.logger.warn(`Could not read the free ground limit, using the default: ${(err as Error)?.message}`);
    }
    return DEFAULT_FREE_GROUND_LIMIT;
  }

  /**
   * The live free member limit, or the shipped default. Never throws, for the same reason
   * `getFreeGroundLimit` never does: a bad row must mean "the limit we shipped with", not zero.
   * Zero here would refuse every free organisation its own founder.
   */
  async getFreeMemberLimit(): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key: FREE_MEMBER_LIMIT_KEY } });
      const v = row?.value;
      if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_FREE_MEMBER_LIMIT) return v;
    } catch (err) {
      this.logger.warn(`Could not read the free member limit, using the default: ${(err as Error)?.message}`);
    }
    return DEFAULT_FREE_MEMBER_LIMIT;
  }

  async setFreeMemberLimit(limit: number, adminUserId: string): Promise<number> {
    /**
     * At least one, not zero. The creator's own row is counted, so a limit of zero would lock
     * an organisation out of itself the moment it was created.
     */
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_FREE_MEMBER_LIMIT) {
      throw new BadRequestException(`The free member limit must be a whole number between 1 and ${MAX_FREE_MEMBER_LIMIT}.`);
    }
    await this.prisma.platformSetting.upsert({
      where: { key: FREE_MEMBER_LIMIT_KEY },
      create: { key: FREE_MEMBER_LIMIT_KEY, value: limit, updatedBy: adminUserId },
      update: { value: limit, updatedBy: adminUserId },
    });
    this.logger.log(`Free member limit set to ${limit} by ${adminUserId}`);
    return limit;
  }

  async setFreeGroundLimit(limit: number, adminUserId: string): Promise<number> {
    if (!Number.isInteger(limit) || limit < 0 || limit > MAX_FREE_GROUND_LIMIT) {
      throw new BadRequestException(`The free check-in limit must be a whole number between 0 and ${MAX_FREE_GROUND_LIMIT}.`);
    }
    await this.prisma.platformSetting.upsert({
      where: { key: FREE_GROUND_LIMIT_KEY },
      create: { key: FREE_GROUND_LIMIT_KEY, value: limit, updatedBy: adminUserId },
      update: { value: limit, updatedBy: adminUserId },
    });
    this.logger.log(`Free ground limit set to ${limit} by ${adminUserId}`);
    return limit;
  }
}
