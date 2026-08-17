import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * WHAT WE CHARGE, IN ONE PLACE, CHANGEABLE WITHOUT A DEPLOY.
 *
 * Every price used to be a constant in three separately-built codebases: the cents the API
 * charged, the dollars the app displayed, and the dollars the marketing site advertised. Changing
 * a price meant editing and redeploying all three, and nothing tied the first to the other two -
 * so the charged amount and the advertised amount could disagree indefinitely with every test
 * still green. Charging somebody a price you never showed them is the worst failure available in
 * this part of the product, and it was one careless edit away.
 *
 * So the amounts live in `platform_settings` under one key, written by a platform admin and read
 * on every use. The constants below did not go away - they are the DEFAULTS, which matters for
 * three reasons: a fresh database has correct prices with nothing seeded, a corrupt or partial
 * row cannot produce a free or absurd charge, and the file still answers "what do we charge" to
 * somebody reading the code.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not change what existing subscribers pay. Their
 * amount is baked into the Stripe subscription that was created for them (checkout builds inline
 * `price_data`, so there is no Stripe Price object to update), and no code path migrates them. A
 * new price applies to new subscribers only. That is a real limit, not an oversight, and the admin
 * screen says so where somebody is about to change a number.
 */
export const PRICING_SETTING_KEY = 'pricing.plans';

/** The plans a customer can actually buy. ENTERPRISE is a conversation, not a checkout. */
export const PURCHASABLE_PLANS: SubscriptionPlan[] = [
  SubscriptionPlan.STARTER,
  SubscriptionPlan.SMALL_TEAM,
  SubscriptionPlan.GROWTH,
  SubscriptionPlan.BUSINESS,
  SubscriptionPlan.SCALE,
];

export const DEFAULT_PLAN_PRICES_CENTS: Record<string, number> = {
  [SubscriptionPlan.STARTER]: 2500,
  [SubscriptionPlan.SMALL_TEAM]: 5000,
  [SubscriptionPlan.GROWTH]: 10000,
  [SubscriptionPlan.BUSINESS]: 20000,
  [SubscriptionPlan.SCALE]: 40000,
};

export const DEFAULT_FREE_GROUND_LIMIT = 10;

/**
 * BOUNDS, BECAUSE THIS FIELD BILLS REAL CARDS.
 *
 * A typo in an admin form should not be able to charge somebody $4,000 for a $40 plan, and a
 * zero would hand out paid plans for nothing while still creating a Stripe subscription. Stripe
 * also rejects amounts under 50 cents for USD, so anything below that is a failed checkout rather
 * than a cheap plan - better refused here, with a sentence, than at Stripe with a stack trace.
 */
export const MIN_PLAN_CENTS = 100;
export const MAX_PLAN_CENTS = 500000;
export const MAX_FREE_GROUND_LIMIT = 1000;

export interface PricingSnapshot {
  /** Cents per month, per purchasable plan. */
  planPricesCents: Record<string, number>;
  freeGroundLimit: number;
  /** Null when nothing has ever been edited - the code defaults are in force. */
  updatedAt: Date | null;
  updatedBy: string | null;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Read the live prices. Never throws and never returns a partial set: anything missing,
   * non-numeric, or out of bounds falls back to that plan's default rather than propagating a bad
   * row into a charge. A stored row that has gone bad should mean "we charge the old price", not
   * "we charge nothing" or "we crash checkout".
   */
  async getSnapshot(): Promise<PricingSnapshot> {
    let row: { value: unknown; updatedAt: Date; updatedBy: string | null } | null = null;
    try {
      row = await this.prisma.platformSetting.findUnique({ where: { key: PRICING_SETTING_KEY } });
    } catch (err) {
      this.logger.warn(`Could not read pricing settings, using defaults: ${(err as Error)?.message}`);
    }

    const stored = (row?.value ?? {}) as { planPricesCents?: unknown; freeGroundLimit?: unknown };
    const storedPrices = (stored.planPricesCents ?? {}) as Record<string, unknown>;

    const planPricesCents: Record<string, number> = {};
    for (const plan of PURCHASABLE_PLANS) {
      const candidate = storedPrices[plan];
      planPricesCents[plan] = this.isUsableCents(candidate)
        ? Math.round(candidate)
        : DEFAULT_PLAN_PRICES_CENTS[plan];
    }

    const limit = stored.freeGroundLimit;
    const freeGroundLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit >= 0 && limit <= MAX_FREE_GROUND_LIMIT
        ? Math.round(limit)
        : DEFAULT_FREE_GROUND_LIMIT;

    return {
      planPricesCents,
      freeGroundLimit,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }

  private isUsableCents(v: unknown): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= MIN_PLAN_CENTS && v <= MAX_PLAN_CENTS;
  }

  /** The amount to charge for one plan, in cents. The single read used by checkout. */
  async getPlanPriceCents(plan: SubscriptionPlan): Promise<number | undefined> {
    const { planPricesCents } = await this.getSnapshot();
    return planPricesCents[plan];
  }

  async getFreeGroundLimit(): Promise<number> {
    return (await this.getSnapshot()).freeGroundLimit;
  }

  /**
   * Write new prices. Partial updates are allowed - an admin changing one plan should not have to
   * restate the other four - but every value present is validated, and a single bad field rejects
   * the whole write rather than saving some of it.
   */
  async update(
    patch: { planPricesCents?: Record<string, unknown>; freeGroundLimit?: unknown },
    adminUserId: string,
  ): Promise<PricingSnapshot> {
    const current = await this.getSnapshot();
    const next: Record<string, number> = { ...current.planPricesCents };

    for (const [plan, raw] of Object.entries(patch.planPricesCents ?? {})) {
      if (!PURCHASABLE_PLANS.includes(plan as SubscriptionPlan)) {
        throw new BadRequestException(
          plan === SubscriptionPlan.ENTERPRISE
            ? 'Enterprise is priced in conversation, not here.'
            : `${plan} is not a plan anyone can buy.`,
        );
      }
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        throw new BadRequestException(`The price for ${plan} must be a number of cents.`);
      }
      const cents = Math.round(raw);
      if (cents < MIN_PLAN_CENTS || cents > MAX_PLAN_CENTS) {
        throw new BadRequestException(
          `The price for ${plan} must be between $${(MIN_PLAN_CENTS / 100).toFixed(2)} and $${(MAX_PLAN_CENTS / 100).toFixed(0)} a month. Stripe refuses anything smaller, and anything larger is almost certainly a typo.`,
        );
      }
      next[plan] = cents;
    }

    let freeGroundLimit = current.freeGroundLimit;
    if (patch.freeGroundLimit !== undefined) {
      const raw = patch.freeGroundLimit;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > MAX_FREE_GROUND_LIMIT) {
        throw new BadRequestException(`The free ground limit must be a whole number between 0 and ${MAX_FREE_GROUND_LIMIT}.`);
      }
      freeGroundLimit = Math.round(raw);
    }

    const value = { planPricesCents: next, freeGroundLimit };
    const row = await this.prisma.platformSetting.upsert({
      where: { key: PRICING_SETTING_KEY },
      create: { key: PRICING_SETTING_KEY, value, updatedBy: adminUserId },
      update: { value, updatedBy: adminUserId },
    });

    /**
     * Logged loudly and by name. A price change is the kind of thing somebody asks "when did that
     * happen and who did it" about months later, and `updatedBy` alone only ever holds the last
     * editor - the log is the only history there is.
     */
    this.logger.log(
      `Pricing updated by ${adminUserId}: ${PURCHASABLE_PLANS.map(p => `${p}=${next[p]}`).join(' ')} freeGroundLimit=${freeGroundLimit}`,
    );

    return { planPricesCents: next, freeGroundLimit, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  }

  /** Back to the values in the code, for an admin who has changed something they regret. */
  async resetToDefaults(adminUserId: string): Promise<PricingSnapshot> {
    return this.update(
      { planPricesCents: { ...DEFAULT_PLAN_PRICES_CENTS }, freeGroundLimit: DEFAULT_FREE_GROUND_LIMIT },
      adminUserId,
    );
  }
}
