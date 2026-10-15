-- EXTRA SEATS AND WHATSAPP PER PERSON (Hafsah, fix list item 6, 15 October 2026). Add-only; every statement can be run again.
--
-- Any plan can go past its included seats at +$5 a month a seat, and WhatsApp costs $4 a month for each person who used it
-- that month, never more than the seats. Both prices are on each plan's row, edited at Admin, System, Pricing. Enterprise
-- is arranged by contacting us, so it has neither.
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "extra_seat_cents" INTEGER;
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "extra_seat_stripe_price_id" TEXT;
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "whatsapp_person_cents" INTEGER;
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "whatsapp_person_stripe_price_id" TEXT;

UPDATE "pricing_plans" SET "extra_seat_cents" = 500 WHERE "plan" <> 'ENTERPRISE' AND "extra_seat_cents" IS NULL;
UPDATE "pricing_plans" SET "whatsapp_person_cents" = 400 WHERE "plan" <> 'ENTERPRISE' AND "whatsapp_person_cents" IS NULL;

-- The Stripe lines for an organisation's extra seats and its WhatsApp people.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "extra_seats_item_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_people_item_id" TEXT;

-- An organisation already paying for the old flat WhatsApp line keeps exactly that until it adds a seat, switches WhatsApp
-- off and on, or changes plan. Only those with the line on a subscription now; nobody else is touched.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_flat_add_on_kept" BOOLEAN NOT NULL DEFAULT false;
UPDATE "organizations" SET "whatsapp_flat_add_on_kept" = true
WHERE "whatsapp_add_on_item_id" IS NOT NULL AND "subscription_stripe_id" IS NOT NULL AND "whatsapp_flat_add_on_kept" = false;
