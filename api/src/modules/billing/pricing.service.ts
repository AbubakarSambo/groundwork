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
    const [plans, groundLimit, memberLimit] = await Promise.all([
      this.listPlans(),
      this.getFreeGroundLimit(),
      this.getFreeMemberLimit(),
    ]);
    return { plans, free: { groundLimit, memberLimit } };
  }

  /** The seat cap for a plan, or null for unlimited. Throws for a plan with no row. */
  async memberCapFor(plan: SubscriptionPlan): Promise<number | null> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan }, select: { memberCap: true } });
    if (!row) throw new NotFoundException(`No plan configured for ${plan}`);
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

  /** Returns a live Stripe Price id for the plan, creating one lazily if the DB amount changed. */
  async getOrCreateStripePrice(plan: SubscriptionPlan): Promise<string> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan } });
    if (!row) throw new NotFoundException(`No price configured for plan ${plan}`);
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
