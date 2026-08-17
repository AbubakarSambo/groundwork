-- CreateTable
CREATE TABLE "pricing_plans" (
    "plan" "SubscriptionPlan" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "stripe_product_id" TEXT,
    "stripe_price_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("plan")
);

-- Seed with today's prices (previously hardcoded in billing.service.ts
-- PLAN_PRICES_CENTS). No row for ENTERPRISE - contact-sales only, never
-- self-serve checkout.
INSERT INTO "pricing_plans" ("plan", "amount_cents", "updated_at") VALUES
    ('STARTER', 2500, CURRENT_TIMESTAMP),
    ('SMALL_TEAM', 5000, CURRENT_TIMESTAMP),
    ('GROWTH', 10000, CURRENT_TIMESTAMP),
    ('BUSINESS', 20000, CURRENT_TIMESTAMP),
    ('SCALE', 40000, CURRENT_TIMESTAMP);
