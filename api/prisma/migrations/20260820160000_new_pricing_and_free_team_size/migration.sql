-- NEW PRICING, AND A TEAM SIZE ON THE FREE TIER.
--
-- There are no paying subscribers, so the old prices are replaced outright rather than versioned.
-- Nothing existing is protected because nothing existing is charged.
--
--   Tier        Cap    Was      Now
--   Starter       5    $25      $25    unchanged
--   Small Team   20    $50      $90
--   Growth      100    $100     $400
--   Business    250    $200     $900
--   Scale       500    $400     $1,650   cap drops from 1,000
--   Enterprise    -    -        -        contact us, no price object
--
-- Free tier: 10 check-ins, unchanged, now for teams of 5 or fewer INCLUDING the account creator.
--
-- Every amount is in cents, because that is what Stripe charges and what the column holds. The
-- dollar figures above are the marketing copy, and a guard test compares the two.

-- Stripe Prices are immutable, so a changed amount must also drop the cached price id or the next
-- checkout would charge the OLD price from a row that reads like the new one. This is the same
-- invalidation pricing.service.ts does on an admin edit, done here because SQL bypasses it.
UPDATE "pricing_plans" SET "amount_cents" = 9000,   "stripe_price_id" = NULL WHERE "plan" = 'SMALL_TEAM';
UPDATE "pricing_plans" SET "amount_cents" = 40000,  "stripe_price_id" = NULL WHERE "plan" = 'GROWTH';
UPDATE "pricing_plans" SET "amount_cents" = 90000,  "stripe_price_id" = NULL WHERE "plan" = 'BUSINESS';
UPDATE "pricing_plans" SET "amount_cents" = 165000, "stripe_price_id" = NULL WHERE "plan" = 'SCALE';

-- Starter's amount does not change, so its cached Stripe price is still correct and is left alone.

-- Scale seats 500, not 1,000.
UPDATE "pricing_plans" SET "member_cap" = 500 WHERE "plan" = 'SCALE';

-- The free team size. Beside the free check-in limit, same table, same shape: one number for the
-- whole platform, edited at Admin -> System -> Pricing. `ON CONFLICT` because an admin may already
-- have set it through the endpoint before this migration ran.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('pricing.freeMemberLimit', '5'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
