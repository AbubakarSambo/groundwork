-- Add SubscriptionPlan enum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'ENTERPRISE');

-- Add FREE_EXTENSION and SUBSCRIPTION_FEE to BillingEventType
ALTER TYPE "BillingEventType" ADD VALUE 'SUBSCRIPTION_FEE';
ALTER TYPE "BillingEventType" ADD VALUE 'FREE_EXTENSION';

-- Add free extension flag to organizations
ALTER TABLE "organizations" ADD COLUMN "free_extension_used" BOOLEAN NOT NULL DEFAULT false;

-- Add subscription fields to organizations
ALTER TABLE "organizations" ADD COLUMN "subscription_plan" "SubscriptionPlan";
ALTER TABLE "organizations" ADD COLUMN "subscription_status" TEXT;
ALTER TABLE "organizations" ADD COLUMN "subscription_stripe_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "subscription_period_end" TIMESTAMP(3);
