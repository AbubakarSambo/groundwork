-- WHATSAPP IS A PAID ADD-ON, AND THE FREE TRIAL IS ONE MONTH (decision 78, 2 October 2026).
--
-- Add-on price, about 80% of the plan's price, in cents, edited at Admin, System, Pricing afterwards:
--   Starter      $25   ->  +$20      limit   500 messages a month   (5 people)
--   Small Team   $90   ->  +$72      limit 2,000                    (20 people)
--   Growth      $400   ->  +$320     limit 10,000                   (100 people)
--   Business    $900   ->  +$720     limit 25,000                   (250 people)
--   Scale     $1,650   ->  +$1,320   limit 50,000                   (500 people)
--   Enterprise   no price, no add-on price, no limit (arranged by contacting us)
-- The limits are a proposal, used until Hafsah answers: about 100 messages a person a month.
-- No Stripe Price is created here; one is created in Stripe test mode the first time it is needed.

ALTER TABLE "pricing_plans" ADD COLUMN "whatsapp_add_on_cents" INTEGER;
ALTER TABLE "pricing_plans" ADD COLUMN "whatsapp_add_on_stripe_price_id" TEXT;
ALTER TABLE "pricing_plans" ADD COLUMN "whatsapp_monthly_limit" INTEGER;

UPDATE "pricing_plans" SET "whatsapp_add_on_cents" = 2000,   "whatsapp_monthly_limit" = 500   WHERE "plan" = 'STARTER';
UPDATE "pricing_plans" SET "whatsapp_add_on_cents" = 7200,   "whatsapp_monthly_limit" = 2000  WHERE "plan" = 'SMALL_TEAM';
UPDATE "pricing_plans" SET "whatsapp_add_on_cents" = 32000,  "whatsapp_monthly_limit" = 10000 WHERE "plan" = 'GROWTH';
UPDATE "pricing_plans" SET "whatsapp_add_on_cents" = 72000,  "whatsapp_monthly_limit" = 25000 WHERE "plan" = 'BUSINESS';
UPDATE "pricing_plans" SET "whatsapp_add_on_cents" = 132000, "whatsapp_monthly_limit" = 50000 WHERE "plan" = 'SCALE';

ALTER TABLE "organizations" ADD COLUMN "whatsapp_add_on_on" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "whatsapp_add_on_changed_at" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "whatsapp_add_on_item_id" TEXT;

CREATE TABLE "whatsapp_monthly_use" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "held" INTEGER NOT NULL DEFAULT 0,
    "admin_told_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_monthly_use_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_monthly_use_organization_id_month_key" ON "whatsapp_monthly_use"("organization_id", "month");
ALTER TABLE "whatsapp_monthly_use" ADD CONSTRAINT "whatsapp_monthly_use_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The free trial is one month. Its switch is not touched: it stays off until Hafsah switches it on.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('pricing.freeTrial', '{"on": false, "teamsUnder": 20, "months": 1}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "value" = jsonb_set("platform_settings"."value", '{months}', '1'), "updated_at" = CURRENT_TIMESTAMP;
