-- THE SEAT CAP JOINS THE PRICE IN THE TABLE AN ADMIN CAN EDIT.
--
-- Prices moved into pricing_plans in 20260817120000. The caps did not, and stayed as two
-- hardcoded maps: BillingService.PLAN_MEMBER_CAPS on the API and PLAN_MEMBER_LIMITS plus
-- PLAN_MEMBER_CAPS on the client. Three copies of one number, which is why Scale advertised
-- 1,000 people in some places and the caps were the half of pricing that had already drifted.
--
-- Values here are TODAY's caps, unchanged. The new prices and the 500-person Scale cap are a
-- separate change, so a bad migration and a pricing decision can be told apart.
ALTER TABLE "pricing_plans" ADD COLUMN "member_cap" INTEGER;

-- ENTERPRISE needs a row now, because the table is the source of truth for CAPS as well as
-- prices and "no row" cannot express "unlimited people, no self-serve price". It has no
-- amount, so amount_cents becomes nullable: a contact-sales plan with 0 in that column is a
-- plan something could charge nothing for.
ALTER TABLE "pricing_plans" ALTER COLUMN "amount_cents" DROP NOT NULL;

UPDATE "pricing_plans" SET "member_cap" = 5    WHERE "plan" = 'STARTER';
UPDATE "pricing_plans" SET "member_cap" = 20   WHERE "plan" = 'SMALL_TEAM';
UPDATE "pricing_plans" SET "member_cap" = 100  WHERE "plan" = 'GROWTH';
UPDATE "pricing_plans" SET "member_cap" = 250  WHERE "plan" = 'BUSINESS';
UPDATE "pricing_plans" SET "member_cap" = 1000 WHERE "plan" = 'SCALE';

-- Null amount, null cap: contact us, unlimited people.
INSERT INTO "pricing_plans" ("plan", "amount_cents", "member_cap", "updated_at")
VALUES ('ENTERPRISE', NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("plan") DO NOTHING;
