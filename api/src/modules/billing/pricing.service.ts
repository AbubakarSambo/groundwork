import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { SubscriptionPlan } from '@prisma/client';

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.STARTER]: 'Starter (up to 5 people)',
  [SubscriptionPlan.SMALL_TEAM]: 'Small Team (up to 20 people)',
  [SubscriptionPlan.GROWTH]: 'Growth (up to 100 people)',
  [SubscriptionPlan.BUSINESS]: 'Business (up to 250 people)',
  [SubscriptionPlan.SCALE]: 'Scale (up to 1,000 people)',
  [SubscriptionPlan.ENTERPRISE]: 'Enterprise',
};

/**
 * Subscription prices live in the pricing_plans table, edited at Admin -> System
 * -> Pricing, not in code or env vars. A Stripe Price is immutable once created,
 * so this only ever creates a NEW Price when the DB amount has no cached price id
 * (admin.service clears stripePriceId whenever amountCents changes) - it never
 * edits one in place. The Stripe Product is created once per plan and reused.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  async getAmountCents(plan: SubscriptionPlan): Promise<number> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan } });
    if (!row) throw new NotFoundException(`No price configured for plan ${plan}`);
    return row.amountCents;
  }

  async listPlans() {
    const rows = await this.prisma.pricingPlan.findMany({ orderBy: { plan: 'asc' } });
    return rows.map((r) => ({
      plan: r.plan,
      label: PLAN_LABELS[r.plan],
      amountCents: r.amountCents,
      hasStripePrice: !!r.stripePriceId,
      updatedAt: r.updatedAt,
    }));
  }

  /** Admin update: Stripe Prices are immutable, so a new amount invalidates the cached one. */
  async setAmountCents(plan: SubscriptionPlan, amountCents: number): Promise<void> {
    await this.prisma.pricingPlan.update({
      where: { plan },
      data: { amountCents, stripePriceId: null },
    });
    this.logger.log(`Pricing updated for plan ${plan}: ${amountCents} cents (cached Stripe price cleared)`);
  }

  /** Returns a live Stripe Price id for the plan, creating one lazily if the DB amount changed. */
  async getOrCreateStripePrice(plan: SubscriptionPlan): Promise<string> {
    const row = await this.prisma.pricingPlan.findUnique({ where: { plan } });
    if (!row) throw new NotFoundException(`No price configured for plan ${plan}`);
    if (row.stripePriceId) return row.stripePriceId;

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
}
